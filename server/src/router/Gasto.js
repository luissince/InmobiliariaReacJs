const express = require('express');
const router = express.Router();
const { currentDate, currentTime } = require('../tools/Tools');
const { decrypt } = require('../tools/CryptoJS');

const Conexion = require('../database/Conexion');
const conec = new Conexion();

const Sede = require('../services/Sede');
const Gasto = require('../services/Gasto');
const RepFinanciero = require('../report/RepFinanciero')

const sede = new Sede();
const gasto = new Gasto();
const repFinanciero = new RepFinanciero();

router.get('/list', async function (req, res) {
    try {
        let lista = await conec.query(`SELECT 
            g.idGasto,
            IFNULL(cl.documento,'') AS documento,
            IFNULL(cl.informacion,'') AS informacion,
            IFNULL(cn.nombre,'') AS detalle,
            m.simbolo,
            b.nombre as banco, 
            g.observacion, 
            DATE_FORMAT(g.fecha,'%d/%m/%Y') as fecha, 
            g.hora,
            IFNULL(SUM(gd.precio*gd.cantidad),0) AS monto
            FROM gasto AS g          
            LEFT JOIN cliente AS cl ON g.idCliente = cl.idCliente 
            INNER JOIN banco AS b ON g.idBanco = b.idBanco
            INNER JOIN moneda AS m ON g.idMoneda = m.idMoneda            
            LEFT JOIN gastoDetalle AS gd ON g.idGasto = gd.idGasto
            LEFT JOIN concepto AS cn ON gd.idConcepto = cn.idConcepto 
            WHERE 
            ? = 0 AND g.idProyecto = ?
            OR
            ? = 1 AND IFNULL(cl.informacion,'') LIKE CONCAT(?,'%') AND g.idProyecto = ?
            GROUP BY g.idGasto
            ORDER BY g.fecha DESC, g.hora DESC
            LIMIT ?,?`, [
            parseInt(req.query.opcion),
            req.query.idProyecto,

            parseInt(req.query.opcion),
            req.query.buscar,
            req.query.idProyecto,

            parseInt(req.query.posicionPagina),
            parseInt(req.query.filasPorPagina)
        ])

        let resultLista = lista.map(function (item, index) {
            return {
                ...item,
                id: (index + 1) + parseInt(req.query.posicionPagina)
            }
        });

        let total = await conec.query(`SELECT COUNT(*) AS Total 
            FROM gasto AS g
            LEFT JOIN cliente AS cl ON g.idCliente = cl.idCliente 
            INNER JOIN banco AS b ON g.idBanco = b.idBanco
            INNER JOIN moneda AS m ON g.idMoneda = m.idMoneda 
            WHERE 
            ? = 0 AND g.idProyecto = ?
            OR
            ? = 1 AND IFNULL(cl.informacion,'') LIKE CONCAT(?,'%') AND g.idProyecto = ?`, [
            parseInt(req.query.opcion),
            req.query.idProyecto,

            parseInt(req.query.opcion),
            req.query.buscar,
            req.query.idProyecto,
        ]);

        res.status(200).send({ "result": resultLista, "total": total[0].Total });
    } catch (error) {
        res.status(500).send("Se produjo un error de servidor, intente nuevamente.");
    }
});

router.post('/add', async function (req, res) {
    let connection = null;
    try {
        connection = await conec.beginTransaction();

        let result = await conec.execute(connection, 'SELECT idGasto FROM gasto');
        let idGasto = "";
        if (result.length != 0) {

            let quitarValor = result.map(function (item) {
                return parseInt(item.idGasto.replace("GT", ''));
            });

            let valorActual = Math.max(...quitarValor);
            let incremental = valorActual + 1;
            let codigoGenerado = "";
            if (incremental <= 9) {
                codigoGenerado = 'GT000' + incremental;
            } else if (incremental >= 10 && incremental <= 99) {
                codigoGenerado = 'GT00' + incremental;
            } else if (incremental >= 100 && incremental <= 999) {
                codigoGenerado = 'GT0' + incremental;
            } else {
                codigoGenerado = 'GT' + incremental;
            }

            idGasto = codigoGenerado;
        } else {
            idGasto = "GT0001";
        }

        let comprobante = await conec.execute(connection, `SELECT 
        serie,
        numeracion 
        FROM comprobante 
        WHERE idComprobante  = ?
        `, [
            req.body.idComprobante
        ]);

        let numeracion = 0;

        let gastos = await conec.execute(connection, 'SELECT numeracion FROM gasto WHERE idComprobante = ?', [
            req.body.idComprobante
        ]);

        if (gastos.length > 0) {
            let quitarValor = gastos.map(function (item) {
                return parseInt(item.numeracion);
            });

            let valorActual = Math.max(...quitarValor);
            let incremental = valorActual + 1;
            numeracion = incremental;
        } else {
            numeracion = comprobante[0].numeracion;
        }

        await conec.execute(connection, `INSERT INTO gasto(
            idGasto, 
            idCliente,
            idUsuario, 
            idMoneda, 
            idBanco,
            idProcedencia,
            idProyecto,
            idComprobante,
            serie,
            numeracion,
            metodoPago,
            estado,
            observacion,
            fecha,
            hora) 
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
            idGasto,
            req.body.idCliente,
            req.body.idUsuario,
            req.body.idMoneda,
            req.body.idBanco,
            '',
            req.body.idProyecto,
            req.body.idComprobante,
            comprobante[0].serie,
            numeracion,
            req.body.metodoPago,
            req.body.estado,
            req.body.observacion,
            currentDate(),
            currentTime()
        ]);

        let monto = 0;

        for (let item of req.body.gastoDetalle) {
            await conec.execute(connection, `INSERT INTO gastoDetalle(
                idGasto,
                idConcepto,
                precio,
                cantidad,
                idImpuesto)
                VALUES(?,?,?,?,?)`, [
                idGasto,
                item.idConcepto,
                item.monto,
                item.cantidad,
                item.idImpuesto
            ]);

            monto += item.cantidad * item.monto;
        }

        await conec.execute(connection, `INSERT INTO bancoDetalle(
        idBanco,
        idProcedencia,
        tipo,
        monto,
        fecha,
        hora,
        idUsuario)
        VALUES(?,?,?,?,?,?,?)`, [
            req.body.idBanco,
            idGasto,
            0,
            monto,
            currentDate(),
            currentTime(),
            req.body.idUsuario,
        ]);

        await conec.commit(connection);
        res.status(200).send('Datos insertados correctamente');
    } catch (error) {
        if (connection != null) {
            await conec.rollback(connection);
        }
        res.status(500).send("Se produjo un error de servidor, intente nuevamente.");
    }
});

router.get('/id', async function (req, res) {
    try {

        let result = await conec.query(`SELECT
        g.idGasto,
        u.nombres AS nombreUse,
        u.apellidos AS apellidoUse,
        m.codiso,
        m.simbolo,
        b.nombre AS nombreBanco,
        b.tipoCuenta,
        g.metodoPago,
        g.estado,
        g.observacion,
        DATE_FORMAT(g.fecha,'%d/%m/%Y') as fecha,
        g.hora,

        IFNULL(SUM(gd.precio*gd.cantidad), 0) AS monto

        FROM gasto AS g
        INNER JOIN usuario AS u ON g.idUsuario = u.idUsuario
        INNER JOIN moneda AS m ON g.idMoneda = m.idMoneda
        INNER JOIN banco AS b ON g.idBanco = b.idBanco
        LEFT JOIN gastoDetalle AS gd ON g.idGasto = gd.idGasto
        WHERE g.idGasto = ?
        GROUP BY g.idGasto`, [
            req.query.idGasto
        ]);

        if (result.length > 0) {

            let detalle = await conec.query(`SELECT 
            co.nombre as concepto,
            gd.precio,
            gd.cantidad,
            imp.nombre as impuesto,
            imp.porcentaje

            FROM gastoDetalle AS gd 
            INNER JOIN concepto AS co ON gd.idConcepto = co.idConcepto
            INNER JOIN impuesto AS imp ON gd.idImpuesto  = imp.idImpuesto 
            WHERE gd.idGasto = ?
            `, [
                req.query.idGasto
            ]);

            res.status(200).send({
                "cabecera": result[0],
                "detalle": detalle
            });
        } else {
            res.status(400).send("Datos no encontrados");
        }
    } catch (error) {
        res.status(500).send("Se produjo un error de servidor, intente nuevamente.");
    }
});

router.delete('/anular', async function (req, res) {
    let connection = null;
    try {
        connection = await conec.beginTransaction();

        await conec.execute(connection, `DELETE FROM gasto WHERE idGasto = ?`, [
            req.query.idGasto
        ]);

        await conec.execute(connection, `DELETE FROM gastoDetalle WHERE idGasto = ?`, [
            req.query.idGasto
        ]);

        await conec.execute(connection, `DELETE FROM bancoDetalle WHERE idProcedencia  = ?`, [
            req.query.idGasto
        ]);

        await conec.commit(connection);
        res.status(201).send("Se elimino la transacción correctamente.");
    } catch (error) {
        if (connection != null) {
            await conec.rollback(connection);
        }
        res.status(500).send("Se produjo un error de servidor, intente nuevamente.");
    }
});

router.get('/repgeneralgastos', async function (req, res) {
    const decryptedData = decrypt(req.query.params, 'key-report-inmobiliaria');
    req.query.idBanco = decryptedData.idBanco;
    req.query.idUsuario = decryptedData.idUsuario;
    req.query.banco = decryptedData.banco;
    req.query.usuario = decryptedData.usuario;
    req.query.opcion = decryptedData.opcion;
    req.query.idSede = decryptedData.idSede;
    req.query.fechaIni = decryptedData.fechaIni;
    req.query.fechaFin = decryptedData.fechaFin;

    const sedeInfo = await sede.infoSedeReporte(req)

    if (typeof sedeInfo !== 'object') {
        res.status(500).send(sedeInfo)
        return;
    }

    const detalle = await gasto.gastoGeneral(req)

    console.log(req.query)

    if (typeof detalle === 'object' ) {
        let data = await repFinanciero.repFiltroGastos(req, sedeInfo, detalle)

        if (typeof data === 'string') {
            res.status(500).send(data)
        } else {
            res.setHeader('Content-disposition', `inline; filename=REPORTE DE GASTOS DEL ${req.query.fechaIni} AL ${req.query.fechaFin}.pdf`);
            res.contentType("application/pdf");
            res.send(data);
        }
    } else {
        res.status(500).send(detalle)
    }


})

module.exports = router;