import React from 'react';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import FileDownloader from "./hooks/FileDownloader";
import { spinnerLoading, currentDate } from '../tools/Tools';
import { connect } from 'react-redux';

class RepFinanciero extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            idProyecto: this.props.token.project.idProyecto,

            fechaIni: '',
            fechaFin: '',
            isFechaActive: false,
            isDetallado: false,

            //Cobro
            idCliente: '',
            clientes: [],

            idBanco: '',
            bancos: [],


            idUsuario: '',
            usuarios: [],
            usuarioCheck: true,

            loading: true,
            messageWarning: '',
        }

        this.refFechaIni = React.createRef();

        this.refCliente = React.createRef();
        this.refBanco = React.createRef();

        this.refUsuario = React.createRef();
        this.refBancoGasto = React.createRef();
        this.refUseFile = React.createRef();

        this.abortControllerView = new AbortController()
    }

    setStateAsync(state) {
        return new Promise((resolve) => {
            this.setState(state, resolve)
        });
    }

    componentDidMount() {
        this.loadData()
    }

    componentWillUnmount() {
        this.abortControllerView.abort();
    }

    loadData = async () => {
        try {

            const usuario = await axios.get("/api/usuario/listcombo", {
                signal: this.abortControllerView.signal
            });

            await this.setStateAsync({
                fechaIni: currentDate(),
                fechaFin: currentDate(),
                usuarios: usuario.data,

                loading: false
            });

        } catch (error) {
            if (error.message !== "canceled") {
                await this.setStateAsync({
                    msgLoading: "Se produjo un error interno, intente nuevamente."
                });
            }
        }
    }

    async onEventImpCobro() {
        if (this.state.fechaFin < this.state.fechaIni) {
            this.setState({ messageWarning: "La Fecha inicial no puede ser mayor a la fecha final." })
            this.refFechaIni.current.focus();
            return;
        }

        const data = {
            "idSede": "SD0001",
            "fechaIni": this.state.fechaIni,
            "fechaFin": this.state.fechaFin,
            "isDetallado": this.state.isDetallado,
            "idUsuario": this.state.idUsuario === '' ? '' : this.state.idUsuario,
        }

        let ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), 'key-report-inmobiliaria').toString();
        let params = new URLSearchParams({ "params": ciphertext });
        window.open("/api/cobro/repgeneralcobros?" + params, "_blank");
    }

    async onEventExcel() {
        if (this.state.fechaFin < this.state.fechaIni) {
            this.setState({ messageWarning: "La Fecha inicial no puede ser mayor a la fecha final." })
            this.refFechaIni.current.focus();
            return;
        }

        const data = {
            "idSede": "SD0001",
            "fechaIni": this.state.fechaIni,
            "fechaFin": this.state.fechaFin,
            "isDetallado": this.state.isDetallado,
            "idUsuario": this.state.idUsuario === '' ? '' : this.state.idUsuario,
        }

        let ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), 'key-report-inmobiliaria').toString();

        this.refUseFile.current.download({
            "name": "Reporte Financiero",
            "file": "/api/cobro/excelgeneralcobros",
            "filename": "financiero.xlsx",
            "params": ciphertext
        });
    }

    render() {
        return (
            <>
                {
                    this.state.loading ?
                        <div className="clearfix absolute-all bg-white">
                            {spinnerLoading(this.state.msgLoading)}
                        </div> :
                        <>
                            <div className="card my-1">
                                <h6 className="card-header">Reporte de Ingreso y Egresos</h6>
                                <div className="card-body">


                                    {
                                        this.state.messageWarning === '' ? null :
                                            <div className="alert alert-warning" role="alert">
                                                <i className="bi bi-exclamation-diamond-fill"></i> {this.state.messageWarning}
                                            </div>
                                    }


                                    <div className="row">
                                        <div className="col">
                                            <div className="form-group">
                                                <label>Filtro por fechas</label>
                                                <div className="custom-control custom-switch">
                                                    <input
                                                        type="checkbox"
                                                        className="custom-control-input"
                                                        id="customSwitch1"
                                                        checked={this.state.isFechaActive}
                                                        onChange={(event) => {
                                                            this.setState({ isFechaActive: event.target.checked, fechaIni: currentDate(), fechaFin: currentDate(), messageWarning: '' })
                                                        }}
                                                    >
                                                    </input>
                                                    <label className="custom-control-label" htmlFor="customSwitch1">{this.state.isFechaActive ? 'Activo' : 'Inactivo'}</label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col">
                                            <div className="form-group">
                                                <label>Fecha inicial <i className="fa fa-asterisk text-danger small"></i></label>
                                                <div className="input-group">
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        disabled={!this.state.isFechaActive}
                                                        ref={this.refFechaIni}
                                                        value={this.state.fechaIni}
                                                        onChange={(event) => {

                                                            if (event.target.value <= this.state.fechaFin) {
                                                                this.setState({
                                                                    fechaIni: event.target.value,
                                                                    messageWarning: '',
                                                                });
                                                            } else {
                                                                this.setState({
                                                                    fechaIni: event.target.value,
                                                                    messageWarning: 'La Fecha inicial no puede ser mayor a la fecha final.',
                                                                });
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col">
                                            <div className="form-group">
                                                <label>Fecha final <i className="fa fa-asterisk text-danger small"></i></label>
                                                <div className="input-group">
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        disabled={!this.state.isFechaActive}
                                                        value={this.state.fechaFin}
                                                        onChange={(event) => this.setState({ fechaFin: event.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col">
                                            <div className="form-group">
                                                <label>Detallado</label>
                                                <div className="custom-control custom-switch">
                                                    <input
                                                        type="checkbox"
                                                        className="custom-control-input"
                                                        id="customSwitch2"
                                                        checked={this.state.isDetallado}
                                                        onChange={(event) => {
                                                            this.setState({ isDetallado: event.target.checked})
                                                        }}
                                                    >
                                                    </input>
                                                    <label className="custom-control-label" htmlFor="customSwitch2">{this.state.isDetallado ? 'Si' : 'No'}</label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col">
                                            <div className="form-group">
                                                <label>Usuario(s)</label>
                                                <div className="input-group">
                                                    <select
                                                        title="Lista de usuarios"
                                                        className="form-control"
                                                        ref={this.refUsuario}
                                                        value={this.state.idUsuario}
                                                        disabled={this.state.usuarioCheck}
                                                        onChange={async (event) => {
                                                            await this.setStateAsync({ idUsuario: event.target.value });
                                                            if (this.state.idUsuario === '') {
                                                                await this.setStateAsync({ usuarioCheck: true });
                                                            }
                                                        }}
                                                    >
                                                        <option value="">-- Todos --</option>
                                                        {
                                                            this.state.usuarios.map((item, index) => (
                                                                <option key={index} value={item.idUsuario}>{item.nombres + ' ' + item.apellidos}</option>
                                                            ))
                                                        }
                                                    </select>
                                                    <div className="input-group-append">
                                                        <div className="input-group-text">
                                                            <div className="form-check form-check-inline m-0">
                                                                <input
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    checked={this.state.usuarioCheck}
                                                                    onChange={async (event) => {
                                                                        await this.setStateAsync({ usuarioCheck: event.target.checked })
                                                                        if (this.state.usuarioCheck) {
                                                                            await this.setStateAsync({ idUsuario: '' });
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col"></div>
                                    </div>

                                    <div className="row mt-3">
                                        <div className="col"></div>
                                        <div className="col">
                                            <button className="btn btn-outline-warning btn-sm" onClick={() => this.onEventImpCobro()}><i className="bi bi-file-earmark-pdf-fill"></i> Reporte Pdf</button>
                                        </div>
                                        <div className="col">
                                            <button className="btn btn-outline-success btn-sm" onClick={() => this.onEventExcel()}><i className="bi bi-file-earmark-excel-fill"></i> Reporte Excel</button>
                                        </div>
                                        <div className="col"></div>
                                    </div>

                                </div>
                            </div>

                            <FileDownloader ref={this.refUseFile} />
                        </>
                }
            </>

        )
    }
}

const mapStateToProps = (state) => {
    return {
        token: state.reducer
    }
}

export default connect(mapStateToProps, null)(RepFinanciero);
