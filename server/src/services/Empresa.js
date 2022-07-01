const {
    sendSuccess,
    sendError,
    sendNoAutorizado
} = require('../tools/Message');
const {
    currentDate,
    currentTime,
    isDirectory,
    writeFile,
    mkdir,
    chmod,
} = require('../tools/Tools');
const path = require("path");
const Conexion = require('../database/Conexion');
const conec = new Conexion();

class Empresa {

    async config(req, res) {
        try {
            let result = await conec.query(`SELECT 
            idEmpresa,
            documento,
            razonSocial,
            nombreEmpresa,
            rutaLogo,
            rutaImage
            FROM empresa LIMIT 1`);
            if (result.length > 0) {
                sendSuccess(res, result[0]);
            } else {
                sendNoAutorizado(res, "Iniciar configuración.");
            }
        } catch (error) {
            sendNoAutorizado(res, "Iniciar configuración.");
        }
    }

    async save(req, res) {
        let connection = null;
        try {
            connection = await conec.beginTransaction();

            let empresa = await conec.execute(connection, `SELECT * FROM empresa`);
            if (empresa.length > 0) {
                await conec.rollback(connection);
                return sendSuccess(res, "Ya existe una empresa registrada.");
            }

            let result = await conec.execute(connection, 'SELECT idEmpresa FROM empresa');
            let idEmpresa = "";
            if (result.length != 0) {

                let quitarValor = result.map(function (item) {
                    return parseInt(item.idEmpresa.replace("EM", ''));
                });

                let valorActual = Math.max(...quitarValor);
                let incremental = valorActual + 1;
                let codigoGenerado = "";
                if (incremental <= 9) {
                    codigoGenerado = 'EM000' + incremental;
                } else if (incremental >= 10 && incremental <= 99) {
                    codigoGenerado = 'EM00' + incremental;
                } else if (incremental >= 100 && incremental <= 999) {
                    codigoGenerado = 'EM0' + incremental;
                } else {
                    codigoGenerado = 'EM' + incremental;
                }

                idEmpresa = codigoGenerado;
            } else {
                idEmpresa = "EM0001";
            }

            let file = path.join(__dirname, '../', 'path/company');
            if (!isDirectory(file)) {
                mkdir(file);
                chmod(file);
            }

            let fileLogo = "";
            let fileImage = "";

            if (req.body.logo !== "") {
                let nameImage = `${Date.now() + 'logo'}.${req.body.extlogo}`;

                writeFile(path.join(file, nameImage), req.body.logo)
                fileLogo = nameImage;
            }

            if (req.body.image !== "") {
                let nameImage = `${Date.now() + 'image'}.${req.body.extimage}`;

                writeFile(path.join(file, nameImage), req.body.image);
                fileImage = nameImage;
            }

            await conec.execute(connection, `INSERT INTO empresa(
                idEmpresa ,
                documento,
                razonSocial,
                nombreEmpresa,
                telefono,
                celular,
                email,
                web,
                direccion,
                logo,
                image,
                extlogo,
                extimage,
                rutaLogo,
                rutaImage,
                useSol,
                claveSol,
                certificado,
                certificado,
                fecha,
                hora,
                fupdate,
                hupdate
             ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
                idEmpresa,
                req.body.documento,
                req.body.razonSocial,
                req.body.nombreEmpresa,
                req.body.telefono,
                req.body.celular,
                req.body.email,
                req.body.web,
                req.body.direccion,
                req.body.logo,
                req.body.image,
                req.body.extlogo,
                req.body.extimage,
                fileLogo,
                fileImage,
                '',
                '',
                '',
                '',
                currentDate(),
                currentTime(),
                currentDate(),
                currentTime(),
            ]);

            await conec.commit(connection);
            sendSuccess(res, "Se registro correctamente la empresa.");
        } catch (error) {
            console.log(error);
            if (connection != null) {
                await conec.rollback(connection);
            }
            sendError(res, "Se produjo un error de servidor, intente nuevamente.");
        }
    }

}

module.exports = new Empresa();