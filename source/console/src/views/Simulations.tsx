// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { API } from '@aws-amplify/api';
import { I18n, Logger } from '@aws-amplify/core';
import { Fragment, useEffect, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import DeleteConfirm from '../components/Shared/DeleteConfirmation';
import Footer from '../components/Shared/Footer';
import { IPageProps, ISimulation } from '../components/Shared/Interfaces';
import PageTitleBar from '../components/Shared/PageTitleBar';
import TableData from '../components/Simulations/TableData';
import { API_NAME } from '../util/Utils';

export default function Simulations(props: IPageProps): JSX.Element {
    const logger = new Logger("Simulations");
    const [simulations, setSimulations] = useState<ISimulation[]>([]);
    const [showAlert, setShowAlert] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteSimulationId, setDeleteSimulationId] = useState("");
    const [deleteSimulationName, setDeleteSimulationName] = useState("");
    const [deleteSimulationIndex, setDeleteSimulationIndex] = useState(-1);

    /**
     * get simulations from ddb
     */
    const loadSimulations = async () => {
        try {
            const results = await API.get(API_NAME, '/simulation', {
                queryStringParameters: { op: "list" }
            });
            setSimulations([...results]);
        } catch (err) {
            logger.error(I18n.get("simulations.get.error"), err);
            throw err;
        }
    }

    /**
     * react useEffect hook
     * gets simulation data when page is loaded
     */
    useEffect(() => { loadSimulations(); }, []);

    /**
     * react useEffect hook
     * sets showAlert on simulation changes
     */
    useEffect(() => { setShowAlert(simulations.length === 0) }, [simulations]);

    /**
     * updates state on checkbox selection
     * @param event 
     * @param index 
     */
    const handleCheckboxSelect = (event: any, index?: number) => {
        if (event.target.id === "all") {
            if (event.target.checked) {
                simulations.forEach((sim) => {
                    sim.checked = true;
                })
            } else {
                simulations.forEach((sim) => {
                    if (sim.checked) sim.checked = false;
                })
            }
        }
        else if (index !== undefined) {
            if (typeof simulations[index].checked !== "undefined") {
                simulations[index].checked = !simulations[index].checked;
            } else {
                simulations[index].checked = true;
            }
        }
        setSimulations([...simulations]);
    }

    /**
     * start all checked simulations
     */
    const startSims = async () => {
        let sims: Array<ISimulation> = []
        simulations.forEach((sim) => {
            if (sim.stage === "sleeping" && sim.checked) {
                sims.push(sim);
                sim.stage = "running";
            }
        })
        if (sims.length > 0) {
            const body = {
                action: "start",
                simulations: sims
            }
            try {
                await API.put(API_NAME, `/simulation`, { body: body });
                setSimulations(sims);
            } catch (err) {
                logger.error(I18n.get("simulation.start.error"), err);
                throw err;
            }
        }
    }

    /**
     * stop all checked simulations
     */
    const stopSims = async () => {
        let sims: Array<ISimulation> = []
        simulations.forEach((sim) => {
            if (sim.stage === "running" && sim.checked) {
                sim.stage = "stopping"
                sims.push(sim);
            }
        })
        if (sims.length > 0) {
            const body = {
                action: "stop",
                simulations: sims
            }
            try {
                await API.put(API_NAME, `/simulation`, { body: body });
                setSimulations(sims);
            } catch (err) {
                logger.error(I18n.get("simulation.stop.error"), err);
                throw err;
            }
        }
    }

    /**
     * Create buttons to start and stop simulation
     */
    const simControlButtons = () => {
        let showControl = false;
        for (const sim of simulations) {
            if (sim.checked) {
                showControl = true;
                break;
            }
        }

        if (showControl) {
            return (
                <Fragment>
                    <Button
                        size="sm"
                        className="button-theme-alt header-button mr-3"
                        onClick={() => { stopSims() }}
                    >
                        <i className="bi bi-stop-fill" /> {I18n.get("simulation.stop")}
                    </Button>
                    <Button
                        size="sm"
                        className="button-theme header-button"
                        onClick={() => { startSims() }}
                    >
                        <i className="bi bi-play-fill" /> {I18n.get("simulation.start")}
                    </Button>
                </Fragment>
            )
        } else {
            return;
        }
    }

    /**
     * show Alert if there are no simulations to display
     */
    const emptySimAlert = () => {
        return (
            <Alert
                className="empty-alert"
                variant="secondary"
                show={showAlert}
            >
                <Alert.Heading>
                    {I18n.get('no.simulations')}
                </Alert.Heading>
                <div>
                    <a href='/device-types/create'>{I18n.get('create.device.type')}</a>&nbsp;{I18n.get('to.get.started')}.<br />
                    {I18n.get('if.device.type.created')},&nbsp;
                    <a href='/simulations/create'>{I18n.get('create.simulation').toLowerCase()}</a>&nbsp;
                    {I18n.get("begin.simulating.devices")}.
                </div>
            </Alert>
        )
    }

    /**
    * deletes the given simulation from ddb and reloads the page
    * @param simId 
    * @param index
    */
    const handleDelete = async (simId: string, index: number) => {
        try {
            await API.del(API_NAME, `/simulation/${simId}`, {});
            simulations.splice(index, 1);
            setSimulations([...simulations]);
        } catch (err) {
            logger.error(I18n.get("simulation.delete.error"), err);
            throw err;
        }
    }

    const enableDeleteModal = async (simulationId: string, name: string, index: number) => {
        setShowDeleteModal(true);
        setDeleteSimulationId(simulationId);
        setDeleteSimulationName(name);
        setDeleteSimulationIndex(index);
    }

    const resetDeleteModalValues = async () => {
        setShowDeleteModal(false);
        setDeleteSimulationId("");
        setDeleteSimulationName("");
        setDeleteSimulationIndex(-1);
    }

    return (
        <div className="page-content">
            <PageTitleBar title={props.title} />
            <Row>
                <Col>
                    <Card className="content-card">
                        <Card.Title className="content-card-title">
                            {I18n.get("simulations")} ({simulations ? simulations.length : 0})
                            <Button
                                size="sm"
                                className="button-theme header-button"
                                onClick={() => { loadSimulations() }}
                            >
                                <i className="bi bi-arrow-repeat" /> {I18n.get("refresh")}
                            </Button>
                            <Button
                                size="sm"
                                href="/simulations/create"
                                className="button-theme header-button">
                                <i className="bi bi-plus" /> {I18n.get("add.simulation")}
                            </Button>
                            {simControlButtons()}
                        </Card.Title>
                        <Card.Body className='content-card-body'>
                            <Table className="content-card-table" hover>
                                <thead className="table-header">
                                    <tr>
                                        <th><Form.Check
                                            type="checkbox"
                                            id="all"
                                            onChange={(event) => { handleCheckboxSelect(event) }} />
                                        </th>
                                        <th>{I18n.get("simulations")}</th>
                                        <th>{I18n.get("stage")}</th>
                                        <th>{I18n.get("devices")}</th>
                                        <th>{I18n.get("runs")}</th>
                                        <th>{I18n.get("last.run")}</th>
                                        <th>{I18n.get("actions")}</th>
                                    </tr>
                                </thead>
                                {simulations ?
                                    <TableData
                                        simulations={simulations}
                                        handleCheckboxSelect={handleCheckboxSelect}
                                        setSimulations={setSimulations}
                                        handleDeleteButtonClick={enableDeleteModal}
                                    /> :
                                    ""
                                }
                            </Table>
                            <DeleteConfirm
                                id={deleteSimulationId}
                                name={deleteSimulationName}
                                delete={handleDelete}
                                resetModalValues={resetDeleteModalValues}
                                show={showDeleteModal}
                                index={deleteSimulationIndex}
                            />
                            {emptySimAlert()}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <Footer pageTitle={props.title}/>
        </div>
    );
}