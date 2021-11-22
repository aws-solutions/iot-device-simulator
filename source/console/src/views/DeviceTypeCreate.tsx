// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { I18n, Logger } from '@aws-amplify/core';
import { useHistory, useLocation } from 'react-router';
import { useEffect, useState, Fragment } from 'react';
import { API } from '@aws-amplify/api';
import { API_NAME, validateField, validateFileContents, VehicleDemoPayload } from '../util/Utils';
import moment from 'moment'
import ModalForm from '../components/DeviceTypeCreate/ModalForm';
import PageTitleBar from '../components/Shared/PageTitleBar';
import Footer from '../components/Shared/Footer';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Modal from 'react-bootstrap/Modal';
import Alert from 'react-bootstrap/Alert';
import { IAttribute, IDeviceType, IPageProps, IErrors } from '../components/Shared/Interfaces';

interface IProps extends IPageProps {
    deviceType?: IDeviceType
}

export default function DeviceTypeCreate(props: IProps): JSX.Element {
    const history = useHistory();
    const logger = new Logger("Device Type Create");
    let location = useLocation<{ originalDeviceType?: IDeviceType }>();
    let originalDeviceType = null;

    if (location.state) {
        originalDeviceType = location.state.originalDeviceType;
    }

    const [deviceType, setDeviceType] = useState<IDeviceType>(
        originalDeviceType ?
            originalDeviceType :
            {
                name: "",
                topic: "",
                typeId: "",
                payload: []
            }
    );
    const [showAttrFormModal, setShowAttrFormModal] = useState<boolean>(false);
    const [showAttrModal, setShowAttrModal] = useState<string>("");
    const [refAttrPayload, setRefAttrPayload] = useState<IAttribute[] | undefined>(undefined);
    const [errs, setErrs] = useState<IErrors<IDeviceType>>({});
    const [showAlert, setShowAlert] = useState("");
    const [showValidation, setShowValidation] = useState<string[]>([]);

    /**
     * react useEffect hoook
     * runs on device type state change
     * validates device type form fields
     */
    useEffect(() => {
        let newErrs = {};
        Object.entries(deviceType).forEach((entry) => {
            const key = entry[0];
            const value = entry[1];
            if (key === "name" || key === "topic") {
                let error: any = validateField(key, value);
                newErrs = { ...newErrs, ...error }
            }
        })
        setErrs({ ...newErrs });
    }, [deviceType])

    /**
     * updates state on form changes
     * @param event 
     */
    const handleFormChange = (event: any) => {
        deviceType[event.target.id as keyof IDeviceType] = event.target.value;
        setDeviceType({ ...deviceType })
    }

    /**
     * Shows form validation when a field is focused
     * @param event 
     */
    const handleFieldFocus = (event: any) => {
        if(!showValidation.includes(event.target.id)) {
            showValidation.push(event.target.id);
            setShowValidation([...showValidation]);
        }
    }

    /**
     * updates payload attributes based on device type
     * @param newAttr 
     */
    const handleModalSubmit = (newAttr: IAttribute) => {
        if (refAttrPayload) {
            refAttrPayload.push(newAttr);
        } else {
            deviceType.payload.push(newAttr);
        }
        setDeviceType({ ...deviceType });
    }

    /**
     * updates dynamodb on form submission
     */
    const handleSubmit = async (event: any) => {
        const form = event.currentTarget;
        event.preventDefault();
        form.checkValidity();
        if (Object.keys(errs).length > 0) {
            return;
        }

        try {
            await API.post(API_NAME, '/devicetypes', { body: deviceType });
            history.push('/device-types');
        } catch (err) {
            logger.error(I18n.get("device.type.create.error"), err);
            throw err;
        }

    }

    /**
     * resets state on modal close
     */
    const closeAttrFormModal = () => {
        setRefAttrPayload(undefined);
        setShowAttrFormModal(false);
    }

    /**
     * 
     * @param attr 
     * @returns Modal which displays attribute
     */
    const attributeModal = (attr: IAttribute, indicesString: string) => {
        return (
            <Modal show={showAttrModal === indicesString} onHide={() => setShowAttrModal("")}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {attr.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <pre>{JSON.stringify(attr, null, 2)}</pre>
                </Modal.Body>
            </Modal>
        )
    }

    /**
     * Deletes the given attribute from the form
     * @param indices
     */
    const handleDelete = (indices: string) => {
        let payloadIndices = indices.split('-');
        let itemIndex = Number(payloadIndices.pop());
        let payload = deviceType.payload;
        payloadIndices.forEach(index => {
            let i = Number(index);
            payload = payload[i].payload!;

        });
        payload.splice(itemIndex, 1);
        setDeviceType({ ...deviceType });
    }

    /**
     * gets sample data for each attribute
     * @returns stringified sample data
     */
    const getDataSample = () => {
        let sample: any = {};

        for (let attribute of deviceType.payload) {
            sample[attribute.name] = generateSampleData(attribute);
        }

        return JSON.stringify(sample, undefined, 2);
    }

    /**
     * generates sample data for an attirbute
     * @param attr 
     * @returns sample data
     */
    const generateSampleData = (attr: IAttribute) => {
        if (attr.default) {
            return attr.default;
        }

        if (attr.type === 'string') {
            if (attr.default) {
                return attr.default;
            } else {
                return 'asdqwiei1238';
            }
        } else if (attr.type === 'id') {
            return 'rLdMw4VRZ';
        } else if (attr.type === 'int' || attr.type === 'decay' || attr.type === 'sinusoidal') {
            return attr.max;
        } else if (attr.type === 'timestamp') {
            if (attr.tsformat === 'unix') {
                return moment('2018-02-15 13:50:18').utc().format('x');
            } else {
                return moment('2018-02-15 13:50:18').utc().format('YYYY-MM-DDTHH:mm:ss');
            }
        } else if (attr.type === 'float') {
            return attr.max! - 1 + attr.precision!;
        } else if (attr.type === 'bool') {
            return 'true';
        } else if (attr.type === 'location') {
            return `{ 'latitude': ${attr.lat}, 'longitude': ${attr.long} }`;
        } else if (attr.type === 'pickOne') {
            if (attr.arr) return attr.arr[0];
        } else if (attr.type === 'object') {
            let _s: any = {};
            if (attr.payload) {
                for (let attribute of attr.payload) {
                    _s[attribute.name] = generateSampleData(attribute);
                }
            }
            return _s;
        }
    }

    /**
     * Generates a table row for each attribute
     * @param payload the payload containing attributes to parse
     * @param nesting the nesting of the table
     * @param prefix parent index prefix to add to index string if nested
     *  @returns a table row for each attribute
     */
    const parseTableRows = (payload: IAttribute[], nesting = 0, prefix = '') => {
        return (payload.map((attribute, i) => (
            <Fragment key={`${prefix}${i}`}>
                <tr>
                    <td style={{ paddingLeft: `${nesting * 2.5}vh` }}>
                        {attribute.name}
                    </td>
                    <td>
                        {attribute.type}
                    </td>
                    <td>
                        {attribute.static?.toString()}
                    </td>
                    <td>
                        <Row>
                            {
                                (attribute.type === "object" &&
                                    <Button
                                        size="sm"
                                        onClick={
                                            () => {
                                                setRefAttrPayload(attribute.payload);
                                                setShowAttrFormModal(true)
                                            }
                                        }
                                        className="button-theme"
                                    >
                                        <i className="bi bi-plus" />
                                        {I18n.get("add.attribute")}
                                    </Button>
                                ) ||
                                <Button
                                    size="sm"
                                    className="button-theme"
                                    onClick={() => { setShowAttrModal(`${prefix}${i}`) }}
                                >
                                    <i className="bi bi-eye-fill" /> {I18n.get("view")}
                                </Button>
                            }
                            {attribute.type !== "object" ? attributeModal(attribute, `${prefix}${i}`) : ""}
                            <Button
                                size="sm"
                                onClick={() => handleDelete(`${prefix}${i}`)}
                                className="button-theme-alt"
                            >
                                <i className="bi bi-trash-fill" /> {I18n.get("delete")}
                            </Button>
                        </Row>
                    </td>
                </tr>
                {   attribute.payload &&
                    attribute.payload.length > 0 &&
                    parseTableRows(attribute.payload, nesting + 1, `${prefix}${i}-`)
                }
            </Fragment>)
        ))
    }

    let fileReader = new FileReader();
    fileReader.onload = (event: any) => {
        const contents = JSON.parse(event.target.result);
        try {
            validateFileContents(contents);
        } catch (err) {
            setShowAlert(`${err instanceof Error ? err.message : ""}`);
            return;
        }
        setDeviceType({ ...deviceType, ...contents });
    }

    const downloadDeviceType = () => {
        let fileData = (({ name, topic, payload }) => ({ name, topic, payload }))(deviceType);

        let data = JSON.stringify(fileData);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${deviceType.name}.json`;
        link.href = url;
        link.click();

    }

    const readFile = (event: any) => {
        if (event.target.files[0].type === 'application/json') {
            fileReader.readAsText(event.target.files[0]);
        } else {
            setShowAlert(`${event.target.files[0].name} ${I18n.get("json.invalid")}`);
        }
        event.target.value = null;
    }


    return (
        <div className="page-content">
            <PageTitleBar title={props.title} />
            <Card className="content-card">
                <Card.Title className="content-card-title">
                    {I18n.get("device.type.definition")}
                    {originalDeviceType ?
                        <Button
                            className="button-theme header-button"
                            size="sm"
                            onClick={downloadDeviceType}
                            disabled={Object.keys(errs).length > 0}
                        >
                            <i className="bi bi-download" /> {I18n.get("export")}
                        </Button> :
                        <Fragment>
                            <Button
                                size="sm"
                                className="button-theme header-button"
                                onClick={() => setDeviceType({ ...deviceType, ...VehicleDemoPayload })}
                            >
                                <i className="bi bi-geo" /> {I18n.get('vehicle.demo')}
                            </Button>
                            <Form.Control
                                type="file"
                                id="fileUpload"
                                accept=".json"
                                onChange={(event: any) => { readFile(event) }}
                                hidden></Form.Control>
                            <Button
                                size="sm"
                                className="button-theme header-button"
                            >
                                <Form.Label htmlFor="fileUpload" className="button-file-upload">
                                    <i className="bi bi-upload" /> {I18n.get("import")}
                                </Form.Label>
                            </Button>
                        </Fragment>
                    }
                </Card.Title>
                <Card.Subtitle className="content-card-subtitle">
                    {I18n.get("device.type.create.description")}
                </Card.Subtitle>
                <Alert show={!!showAlert} variant="danger" onClose={() => setShowAlert("")} dismissible>
                    <Alert.Heading>{I18n.get('json.error')}</Alert.Heading>
                    <div>
                        {showAlert.split('\n').map((line, index) => <p key={index}>{line}</p>)}
                    </div>
                </Alert>
                <Card.Body>
                    <Form
                        name="deviceTypeForm"
                        id="deviceTypeForm"
                        onSubmit={(event) => { handleSubmit(event) }}
                    >
                        <Form.Group className="form-item-spacing">
                            <Form.Label>{I18n.get("device.type.name")}</Form.Label>
                            <Form.Control
                                required
                                type="text"
                                id="name"
                                maxLength={128}
                                value={deviceType.name}
                                onChange={(event) => handleFormChange(event)}
                                onFocus={(event: any) => handleFieldFocus(event)}
                                isInvalid={!!errs.name && showValidation.includes('name')}
                                isValid={!errs.name  && showValidation.includes('name')}
                            >
                            </Form.Control>
                            <Form.Control.Feedback type="invalid">{errs.name}</Form.Control.Feedback>
                            <Form.Text className="muted">
                                {I18n.get("device.type.name.description")}
                            </Form.Text>
                        </Form.Group>
                        <Form.Group className="form-item-spacing">
                            <Form.Label>{I18n.get("topic")}</Form.Label>
                            <Form.Control
                                required
                                type="text"
                                id="topic"
                                maxLength={128}
                                value={deviceType.topic}
                                isInvalid={!!errs.topic && showValidation.includes('topic')}
                                isValid={!errs.topic  && showValidation.includes('topic')}
                                onChange={(event) => handleFormChange(event)}
                                onFocus={(event: any) => handleFieldFocus(event)}
                            >
                            </Form.Control>
                            <Form.Control.Feedback type="invalid">{errs.topic}</Form.Control.Feedback>
                            <Form.Text className="muted">
                                {I18n.get("topic.description")}
                            </Form.Text>
                        </Form.Group>
                        <Form.Group className="form-item-spacing">
                            <Form.Label>
                                {I18n.get("payload")}
                                <br />
                                <Form.Text className="muted sublabel">
                                    {I18n.get("payload.description")}
                                </Form.Text>
                            </Form.Label>
                            <Table className="form-table table-header">
                                <thead>
                                    <tr>
                                        <th >{I18n.get("message.attribute")}</th>
                                        <th>{I18n.get("data.type")}</th>
                                        <th>{I18n.get("static.value")}</th>
                                        <th>{I18n.get("actions")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parseTableRows(deviceType.payload)}
                                </tbody>
                            </Table>
                            <ModalForm refAttr={refAttrPayload} showModal={showAttrFormModal} closeModal={closeAttrFormModal} handleModalSubmit={handleModalSubmit} />
                            <Button
                                size="sm"
                                onClick={() => setShowAttrFormModal(true)}
                                className="button-theme"
                            >
                                <i className="bi bi-plus" /> {I18n.get("add.attribute")}
                            </Button>
                        </Form.Group>
                        <Form.Label>{I18n.get("payload.sample")}</Form.Label>
                        <pre>{getDataSample()}</pre>
                        <Row className="float-right">
                            <Button
                                className="button-theme"
                                form="deviceTypeForm"
                                type="submit"
                                disabled={Object.keys(errs).length > 0}
                            >
                                {I18n.get("save")}
                            </Button>
                            <Button
                                className="button-theme-alt"
                                onClick={() => { history.goBack() }}
                            >
                                {I18n.get("cancel")}
                            </Button>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>
            <Footer pageTitle={props.title} />
        </div>
    );
}