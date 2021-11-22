// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { I18n, Logger } from "@aws-amplify/core";
import { useState, useEffect } from 'react';
import { API } from "@aws-amplify/api";
import { API_NAME, validateField } from '../../util/Utils'
import { ISimulation, IDeviceType, IErrors, IDevice, simTypes } from "../Shared/Interfaces";
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

interface IProps {
    setSimulation: React.Dispatch<React.SetStateAction<ISimulation>>;
    simulation: ISimulation;
    setErrs: React.Dispatch<React.SetStateAction<IErrors<IDevice>[]>>;
    errs: IErrors<IDevice>[];
    simType: string;
    showValidation: number[];
    setShowValidation: React.Dispatch<React.SetStateAction<number[]>>;
}

export default function DeviceFields(props: IProps): JSX.Element {
    const logger = new Logger("Device Fields");
    const [deviceTypes, setDeviceTypes] = useState<IDeviceType[] | undefined>(undefined);
    let errs = props.errs;
    const setErrs = props.setErrs;

    /**
     * retrives the device types and adds them to state
     */
    const loadDeviceTypes = async () => {
        try {
            const results = await API.get(API_NAME, '/devicetypes', {
                queryStringParameters: { op: "list" }
            });
            setDeviceTypes([...results])
        } catch (err) {
            logger.error(I18n.get("device.types.get.error"), err);
            throw err;
        }
    }

    /**
     * React useEffect hook.
     * Loads the device types on page load
     */
    useEffect(() => {
        loadDeviceTypes();
    }, [])

    /**
     * React useEffect hook
     * run on simulation changes
     * checks for errors in device fields
     */
    useEffect(() => {
        let newErrs: IErrors<IDevice>[] = [];
        let totalDeviceAmt = 0;
        let typeIds: string[] = [];
        props.simulation.devices.forEach((device) => {
            let deviceErrs: IErrors<IDevice> = {};
            let key: keyof IDevice;
            totalDeviceAmt += device.amount;
            for (key in device) {
                if (key !== 'typeId') {
                    let error = validateField(key, device[key]);
                    deviceErrs = { ...deviceErrs, ...error };
                }
            }
            if(device.typeId && typeIds.includes(device.typeId)) {
                deviceErrs.name = I18n.get('duplicate.device.error');
            } else if(!deviceErrs.amount && totalDeviceAmt > 100) {
                deviceErrs.amount = I18n.get('device.exceed.error');
            }
            typeIds.push(device.typeId);
            newErrs.push(deviceErrs);
        });
        
        setErrs(newErrs);
    }, [props.simulation, props.simType])

    /**
     * Updates devices on field change related to devices
     * @param event 
     * @param index 
     */
    const handleDeviceFieldChange = (event: any, index: number) => {
        let value = event.target.valueAsNumber || event.target.value;
        if (event.target.id === "typeId") {
            props.simulation.devices[index]["typeId"] = value;
            const selected = event.target.selectedIndex;
            props.simulation.devices[index]["name"] = event.target.options[selected].text;
        } else {
            props.simulation.devices[index]["amount"] = value;
        }
        props.setSimulation({ ...props.simulation })
    }

    /**
     * Shows validation once device field input is focused
     * @param index 
     */
    const handleFieldFocus = (index: number) => {
        if(!props.showValidation.includes(index)) {
            props.showValidation.push(index);
            props.setShowValidation([...props.showValidation]);
        }
    }

    /**
     * Adds an extra device input field
     */
    const handleTypeInputAdd = () => {
        props.simulation.devices.push({ typeId: "", name: "", amount: 1 })
        props.setSimulation({ ...props.simulation });
    }

    /**
     * Deletes the specified device input field
     * @param index 
     */
    const handleTypeInputDelete = (index: number) => {
        props.simulation.devices.splice(index, 1);
        props.setShowValidation(props.showValidation.map((validationIdx) => {
            if(validationIdx > index) {
                validationIdx = validationIdx - 1;
            }
            return validationIdx;
        }));
        props.setSimulation({ ...props.simulation });
    }

    return (
        <Form.Group>
            <Row>
                <Col sm={5}>
                    <Form.Label>{I18n.get("device.type.select")}</Form.Label>
                </Col>
                <Col sm={5}>
                    <Form.Label>{I18n.get("device.amount.select")}</Form.Label>
                </Col>
                <Col sm={2}></Col>
            </Row>
            {
                props.simulation?.devices.map((device, index) => (
                    <Row className="form-item-spacing" key={index}>
                        <Col sm={5}>
                            <Form.Control
                                as="select"
                                id="typeId"
                                value={props.simulation.devices[index].typeId}
                                onChange={(event) => { handleDeviceFieldChange(event, index) }}
                                onFocus={() => { handleFieldFocus(index) }}
                                isInvalid={!!errs[index]?.name && props.showValidation.includes(index)}
                                isValid={!errs[index]?.name && props.showValidation.includes(index)}
                            >
                                <option className="form-option" disabled value=""></option>
                                {deviceTypes?.filter(type => {
                                    let isAuto = type.typeId.includes(simTypes.autoDemo);
                                    return props.simType === simTypes.autoDemo ? isAuto : !isAuto;
                                }).map((dtype, i) => (
                                    <option key={i} value={dtype.typeId}>{dtype.name}</option>
                                ))}
                            </Form.Control>
                            <Form.Control.Feedback type="invalid">{errs[index]?.name}</Form.Control.Feedback>
                        </Col>
                        <Col sm={5}>
                            <Form.Control
                                type="number"
                                id="amount"
                                onChange={(event) => { handleDeviceFieldChange(event, index) }}
                                onFocus={(event: any) => { handleFieldFocus(index) }}
                                value={device.amount}
                                isInvalid={!!errs[index]?.amount && props.showValidation.includes(index)}
                                isValid={!errs[index]?.amount && props.showValidation.includes(index)}
                                min={1}
                                max={100}
                            >
                            </Form.Control>
                            <Form.Control.Feedback type="invalid">{errs[index]?.amount}</Form.Control.Feedback>
                        </Col>
                        <Col sm={2}>
                            <Button
                                className="button-theme-alt"
                                onClick={() => { handleTypeInputDelete(index) }}
                                disabled={props.simulation.devices.length <= 1}
                            >
                                <i className="bi bi-trash-fill" /> {I18n.get("delete")}
                            </Button>
                        </Col>
                    </Row>
                ))
            }
            <Button
                className="button-theme"
                size="sm"
                onClick={() => handleTypeInputAdd()}
            >
                <i className="bi bi-plus" /> {I18n.get("add.type")}
            </Button>
        </Form.Group>
    )
}