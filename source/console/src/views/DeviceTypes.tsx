// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { API } from '@aws-amplify/api';
import { I18n, Logger } from "@aws-amplify/core";
import { useEffect, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import { Link } from 'react-router-dom';
import DeleteConfirm from '../components/Shared/DeleteConfirmation';
import Footer from '../components/Shared/Footer';
import { IDeviceType, IPageProps } from '../components/Shared/Interfaces';
import PageTitleBar from '../components/Shared/PageTitleBar';
import { API_NAME } from '../util/Utils';


export default function DeviceTypes(props: IPageProps): JSX.Element {
    const logger = new Logger("Device Types");
    const [deviceTypes, setDeviceTypes] = useState<IDeviceType[]>([]);
    const [showAlert, setShowAlert] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteDeviceId, setDeleteDeviceId] = useState("");
    const [deleteDeviceName, setDeleteDeviceName] = useState("");
    const [deleteDeviceIndex, setDeleteDeviceIndex] = useState(-1);

    /**
     * retrieves device types and sets to state
     */
    const loadDeviceTypes = async () => {
        try {
            const results = await API.get(API_NAME, '/devicetypes', {
                queryStringParameters: { op: "list" }
            });
            setDeviceTypes([...results]);
        } catch (err) {
            logger.error(I18n.get("device.type.get.error"), err)
            throw err
        }
    }

    /**
     * deletes device type from dynamodb and reloads the page
     * @param typeId 
     */
    const handleDelete = async (typeId: string, index: number) => {
        try {
            await API.del(API_NAME, `/devicetypes/${typeId}`, {});
            deviceTypes.splice(index, 1);
            setDeviceTypes([...deviceTypes]);
        } catch (err) {
            logger.error(I18n.get("device.type.delete.error"), err);
            throw err
        }
    }

    const handleDeleteClick = async (typeId: string, name: string, index: number) => {
        setShowDeleteModal(true);
        setDeleteDeviceId(typeId);
        setDeleteDeviceName(name);
        setDeleteDeviceIndex(index);
    }

    const resetDeleteModalValues = async () => {
        setShowDeleteModal(false);
        setDeleteDeviceId("");
        setDeleteDeviceName("");
        setDeleteDeviceIndex(-1);
    }

    /** 
     * React useEffect hook
     * retrieves the device types from dynamodb
     */
    useEffect(() => { loadDeviceTypes(); }, []);

    /** React useEffect hook
     * sets showAlert on deviceTypes changes
     */
    useEffect(() => { setShowAlert(deviceTypes.length === 0); }, [deviceTypes])

    /**
     * Populates a table row for each device type
     * @returns table row per device type
     */
    const displayDeviceTypes = () => {
        if (deviceTypes) {
            return (deviceTypes.map((dtype, i) => (
                <tr key={i}>
                    <td></td>
                    <td>{dtype.name}</td>
                    <td>{dtype.topic}</td>
                    <td>{dtype.createdAt}</td>
                    <td>{dtype.updatedAt}</td>
                    <td>
                        <Link
                            to={{
                                pathname: `/device-types/${dtype.typeId}`,
                                state: {
                                    originalDeviceType: dtype
                                }
                            }}
                        >
                            <Button className="button-theme" size="sm">
                                <i className="bi bi-pencil-fill" /> {I18n.get("edit")}
                            </Button>
                        </Link>
                        <Button
                            className="button-theme-alt"
                            size="sm"
                            onClick={() => { handleDeleteClick(dtype.typeId, dtype.name, i) }}
                        >
                            <i className="bi bi-trash-fill" /> {I18n.get("delete")}
                        </Button>
                    </td>
                </tr>

            )
            ))
        }
    }

    /**
     * Creates an alert if there are no device types to display
     */
    const emptyDeviceTypeAlert = () => {
        return (
            <Alert
                className="empty-alert"
                variant="secondary"
                show={showAlert}
            >
                <Alert.Heading>
                    {I18n.get('no.device.types')}
                </Alert.Heading>
                <div>
                    <a href='/device-types/create'>{I18n.get("create.device.type")}</a>&nbsp;{I18n.get("to.get.started")}
                </div>
            </Alert>
        )
    }

    return (
        <div className="page-content">
            <PageTitleBar title={props.title} />
            <Row>
                <Col>
                    <Card className="content-card">
                        <Card.Title className="content-card-title">
                            {I18n.get("device.types")} ({deviceTypes ? deviceTypes.length : 0})
                            <Button
                                className="button-theme header-button"
                                size="sm"
                                onClick={() => { loadDeviceTypes() }}
                            >
                                <i className="bi bi-arrow-repeat" /> {I18n.get("refresh")}
                            </Button>
                            <Button
                                href="/device-types/create"
                                size="sm"
                                className="button-theme header-button"
                            >
                                <i className="bi bi-plus" /> {I18n.get("device.type.add")}
                            </Button>
                        </Card.Title>
                        <Card.Body className='content-card-body'>
                            <Table className="content-card-table" hover>
                                <thead className="table-header">
                                    <tr>
                                        <th></th>
                                        <th>{I18n.get("device.types")}</th>
                                        <th>{I18n.get("topic")}</th>
                                        <th>{I18n.get("created")}</th>
                                        <th>{I18n.get("last.updated")}</th>
                                        <th>{I18n.get("actions")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayDeviceTypes()}
                                </tbody>
                            </Table>
                            <DeleteConfirm
                                id={deleteDeviceId}
                                name={deleteDeviceName}
                                delete={handleDelete}
                                resetModalValues={resetDeleteModalValues}
                                show={showDeleteModal}
                                index={deleteDeviceIndex}
                            />
                            {emptyDeviceTypeAlert()}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <Footer pageTitle={props.title} />
        </div>
    );
}