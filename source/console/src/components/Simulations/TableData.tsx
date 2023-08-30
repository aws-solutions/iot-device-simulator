// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0


import { I18n } from '@aws-amplify/core';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/Table';
import { Link } from 'react-router-dom';
import { ISimulation } from '../Shared/Interfaces';

interface IProps {
    simulations: ISimulation[],
    handleCheckboxSelect: Function,
    setSimulations: Function,
    handleDeleteButtonClick: Function
}

export default function TableData(props: IProps): JSX.Element {
    const [showDevices, setShowDevices] = useState(-1);






    return (
        <tbody>
            { props.simulations.map((sim, i) => (
                <tr key={i}>
                    <td>
                        <Form.Check
                            id="sim.id"
                            type="checkbox"
                            checked={sim.checked}
                            onChange={(event) => { props.handleCheckboxSelect(event, i) }}
                        >
                        </Form.Check>
                    </td>
                    <td>{sim.name}</td>
                    <td>{sim.stage}</td>
                    <td>

                        &nbsp;
                        <Button
                            className="button-theme button-rounded"
                            size="sm"
                            onClick={() => { setShowDevices(i) }}
                        >
                            <i className="bi bi-info-circle" /> {I18n.get("info")}
                        </Button>
                        <Modal show={showDevices === i} onHide={() => { setShowDevices(-1) }}>
                            <Modal.Header closeButton>
                                <Modal.Title>{sim.name}</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <Table
                                    className="form-table table-header"
                                    borderless>
                                    <thead>
                                        <tr>
                                            <th>{I18n.get("device.types")}</th>
                                            <th>{I18n.get("amount")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sim.devices.map((device, j) => (
                                            <tr key={j}>
                                                <td>{device.name}</td>
                                                <td>{device.amount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Modal.Body>
                        </Modal>
                    </td>
                    <td>{sim.runs}</td>
                    <td>{sim.lastRun ? sim.lastRun : ""}</td>
                    <td>
                        <Link
                            to={{
                                pathname: `/simulations/${sim.simId}`,
                                state: {
                                    simulatiom: sim.simId
                                }
                            }}
                        >
                            <Button size="sm" className="button-theme" type="submit">
                                <i className="bi bi-eye-fill" /> {I18n.get("view")}
                            </Button>
                        </Link>
                        <Button
                            size="sm"
                            className="button-theme-alt"
                            onClick={() => { props.handleDeleteButtonClick(sim.simId, sim.name, i) }}
                        >
                            <i className="bi bi-trash-fill" /> {I18n.get("delete")}
                        </Button>
                    </td>
                </tr>
            ))
            }
        </tbody>
    )
}
