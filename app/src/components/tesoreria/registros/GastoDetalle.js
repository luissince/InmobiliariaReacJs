import React from 'react';
import axios from 'axios';
import {
    formatMoney,
    timeForma24,
    numberFormat,
    calculateTaxBruto,
    calculateTax,
    spinnerLoading
} from '../../tools/Tools';
import { connect } from 'react-redux';

class GastoDetalle extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            estado: '',
            usuario: '',
            fecha: '',
            cuentaBancaria: '',
            observacion: '',
            metodoPago: '',
            total: '',
            codiso: '',
            simbolo: '',

            gasto: true,
            detalle: [],

            loading: true,
            msgLoading: 'Cargando datos...',
        }
        this.abortControllerView = new AbortController();
    }

    setStateAsync(state) {
        return new Promise((resolve) => {
            this.setState(state, resolve)
        });
    }

    async componentDidMount() {
        const url = this.props.location.search;
        const idResult = new URLSearchParams(url).get("idGasto");
        if (idResult !== null) {
            this.loadDataId(idResult);
        } else {
            this.props.history.goBack();
        }
    }

    componentWillUnmount() {
        this.abortControllerView.abort();
    }

    async loadDataId(id) {
        try {
            let result = await axios.get('/api/gasto/id', {
                signal: this.abortControllerView.signal,
                params: {
                    "idGasto": id
                }
            });

            let cabecera = result.data.cabecera;

            await this.setStateAsync({
                estado: cabecera.estado.toString(),
                usuario: cabecera.apellidoUse + " " + cabecera.nombreUse,
                fecha: cabecera.fecha + " " + timeForma24(cabecera.hora),
                cuentaBancaria: cabecera.nombreBanco,
                observacion: cabecera.observacion === "" ? "" : cabecera.observacion,
                metodoPago: cabecera.metodoPago === 1 ? "Efectivo"
                    : cabecera.metodoPago === 2 ? "Consignación"
                        : cabecera.metodoPago === 3 ? "Transferencia"
                            : cabecera.metodoPago === 4 ? "Cheque"
                                : cabecera.metodoPago === 5 ? "Tarjeta crédito"
                                    : "Tarjeta débito",
                total: formatMoney(cabecera.monto),
                simbolo: cabecera.simbolo,
                codiso: cabecera.codiso,

                gasto: result.data.detalle.length !== 0 ? true : false,
                detalle: result.data.detalle,

                loading: false
            });
        } catch (error) {
            if (error.message !== "canceled") {
                this.props.history.goBack();
            }
        }
    }

    renderTotal() {
        let subTotal = 0;
        let impuestoTotal = 0;
        let total = 0;

        for (let item of this.state.detalle) {
            let cantidad = item.cantidad;
            let valor = item.precio;

            let impuesto = item.porcentaje;

            let valorActual = cantidad * valor;
            let valorSubNeto = calculateTaxBruto(impuesto, valorActual);
            let valorImpuesto = calculateTax(impuesto, valorSubNeto);
            let valorNeto = valorSubNeto + valorImpuesto;

            subTotal += valorSubNeto;
            impuestoTotal += valorImpuesto;
            total += valorNeto;
        }

        return (
            <>
                <tr>
                    <th className="text-right">Sub Total:</th>
                    <th className="text-right">{numberFormat(subTotal, this.state.codiso)}</th>
                </tr>
                <tr>
                    <th className="text-right">Impuesto:</th>
                    <th className="text-right">{numberFormat(impuestoTotal, this.state.codiso)}</th>
                </tr>
                <tr className="border-bottom">
                </tr>
                <tr>
                    <th className="text-right h5">Total:</th>
                    <th className="text-right h5">{numberFormat(total, this.state.codiso)}</th>
                </tr>
            </>
        )
    }

    render() {
        return (
            <>
                {
                    this.state.loading ?
                        <div className="clearfix absolute-all bg-white">
                            {spinnerLoading(this.state.msgLoading)}
                        </div> : null
                }

                <div className='row'>
                    <div className='col-lg-12 col-md-12 col-sm-12 col-xs-12'>
                        <div className="form-group">
                            <h5>
                                <span role="button" onClick={() => this.props.history.goBack()}><i className="bi bi-arrow-left-short"></i></span> Gasto
                                <small className="text-secondary"> detalle</small>
                            </h5>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12">
                        <div className="form-group">
                            <button type="button" className="btn btn-light"><i className="fa fa-print"></i> Imprimir</button>
                            {" "}
                            <button type="button" className="btn btn-light"><i className="fa fa-edit"></i> Editar</button>
                            {" "}
                            <button type="button" className="btn btn-light"><i className="fa fa-remove"></i> Eliminar</button>
                            {" "}
                            <button type="button" className="btn btn-light"><i className="fa fa-file-archive-o"></i> Adjuntar</button>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12">
                        <div className="form-group">
                            <div className="table-responsive">
                                <table width="100%">
                                    <thead>
                                        <tr>
                                            <th className="table-secondary w-25 p-1 font-weight-normal "><span>Recibo de caja</span></th>
                                            <th className="table-light border-bottom w-75 pl-2 pr-2 pt-1 pb-1 font-weight-normal"></th>
                                        </tr>
                                        {/* <tr>
                                            <th className="table-secondary w-25 p-1 font-weight-normal ">Estado</th>
                                            <th className="table-light border-bottom w-75 pl-2 pr-2 pt-1 pb-1 font-weight-normal"></th>
                                        </tr> */}
                                        <tr>
                                            <th className="table-secondary w-25 p-1 font-weight-normal ">Usuario</th>
                                            <th className="table-light border-bottom w-75 pl-2 pr-2 pt-1 pb-1 font-weight-normal">{this.state.usuario}</th>
                                        </tr>
                                        <tr>
                                            <th className="table-secondary w-25 p-1 font-weight-normal ">Fecha</th>
                                            <th className="table-light border-bottom w-75 pl-2 pr-2 pt-1 pb-1 font-weight-normal">{this.state.fecha}</th>
                                        </tr>
                                        <tr>
                                            <th className="table-secondary w-25 p-1 font-weight-normal ">Cuenta bancaria</th>
                                            <th className="table-light border-bottom w-75 pl-2 pr-2 pt-1 pb-1 font-weight-normal">{this.state.cuentaBancaria}</th>
                                        </tr>
                                        <tr>
                                            <th className="table-secondary w-25 p-1 font-weight-normal ">Observación</th>
                                            <th className="table-light border-bottom w-75 pl-2 pr-2 pt-1 pb-1 font-weight-normal">{this.state.observacion}</th>
                                        </tr>
                                        <tr>
                                            <th className="table-secondary w-25 p-1 font-weight-normal ">Método de pago</th>
                                            <th className="table-light border-bottom w-75 pl-2 pr-2 pt-1 pb-1 font-weight-normal">{this.state.metodoPago}</th>
                                        </tr>
                                        <tr>
                                            <th className="table-secondary w-25 p-1 font-weight-normal ">Total</th>
                                            <th className="table-light border-bottom w-75 pl-2 pr-2 pt-1 pb-1 font-weight-normal">{numberFormat(this.state.total, this.state.codiso)}</th>
                                        </tr>
                                        <tr>
                                            <th className="table-secondary w-25 p-1 font-weight-normal ">Archivos adjuntos</th>
                                            <th className="table-light border-bottom w-75 pl-2 pr-2 pt-1 pb-1 font-weight-normal"> </th>
                                        </tr>
                                    </thead>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12">
                        <div className="form-group">
                            <div className="table-responsive">
                                <table className="table table-light table-striped">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Concepto</th>
                                            <th>Cantidad</th>
                                            <th>Impuesto</th>
                                            <th>Valor</th>
                                            <th>Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            this.state.detalle.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{++index}</td>
                                                    <td>{item.concepto}</td>
                                                    <td className="text-right">{formatMoney(item.cantidad)}</td>
                                                    <td className="text-right">{item.impuesto}</td>
                                                    <td className="text-right">{numberFormat(item.precio, this.state.codiso)}</td>
                                                    <td className="text-right">{numberFormat(item.cantidad * item.precio, this.state.codiso)}</td>
                                                </tr>
                                            ))
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-8 col-md-8 col-sm-12 col-xs-12">
                    </div>
                    <div className="col-lg-4 col-md-4 col-sm-12 col-xs-12">
                        <table width="100%">
                            <thead>
                                {this.renderTotal()}
                            </thead>
                        </table>
                    </div>
                </div>
            </>
        )
    }
}


const mapStateToProps = (state) => {
    return {
        token: state.reducer
    }
}

export default connect(mapStateToProps, null)(GastoDetalle);