// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { I18n, Logger } from "@aws-amplify/core";
import { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { API } from '@aws-amplify/api';
import { API_NAME, validateField } from '../util/Utils';
import { IErrors, IPageProps, ISimulation, IDevice, simTypes } from '../components/Shared/Interfaces'
import PageTitleBar from '../components/Shared/PageTitleBar';
import Footer from '../components/Shared/Footer';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';
import DeviceFields from '../components/SimulationCreate/DeviceFields';

/** 
 * Renders The simulation Creation Form
 * @returns The simulation creation form
 */
export default function SimulationCreate(props: IPageProps): JSX.Element {
    const history = useHistory();
    const logger = new Logger("Simulation Create");

    const [simType, setSimType] = useState<string>("Custom");
    const [errs, setErrs] = useState<IErrors<ISimulation>>({});
    const [deviceErrs, setDeviceErrs] = useState<Array<IErrors<IDevice>>>([]);
    const [simulation, setSimulation] = useState<ISimulation>({
        simId: "",
        name: "",
        stage: "",
        duration: 1,
        interval: 1,
        devices: [{ typeId: "", name: "", amount: 1 }]
    });
    const [showValidation, setShowValidation] = useState<string[]>([]);
    const [showDeviceValidation, setShowDeviceValidation] = useState<number[]>([]);

    /**
     * React useEffect hook
     * run on simulation and deviceErrs changes
     * Checks for errors and updates accordingly
     */
    useEffect(() => {
        let newErrs: IErrors<ISimulation> = {};
        Object.entries(simulation).forEach((entry) => {
            const key = entry[0];
            const value = entry[1];

            if (key === "name" || key === "interval" || key === "duration") {
                let error: IErrors<ISimulation> = validateField(key, value);
                newErrs = { ...newErrs, ...error }
            } else if (key === "devices") {
                deviceErrs.forEach((device) => {
                    if (Object.keys(device).length > 0) {
                        let error = { devices: "error" }
                        newErrs = { ...newErrs, ...error }
                    }
                })
            }
        })
        if (!newErrs.interval && !newErrs.duration) {
            if (simulation.interval >= simulation.duration)
                newErrs = { ...newErrs, interval: `${I18n.get("interval.error")}` };
        }
        setErrs({ ...newErrs });
    }, [simulation, deviceErrs])

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
            await API.post(API_NAME, '/simulation', { body: simulation });
            history.push('../');
        } catch (err) {
            logger.error(I18n.get("simulation.create.error"), err);
            throw err;
        }
    }

    /**
     * Updates simulation parameters on form changes
     * @param event 
     */
    const handleFormChange = (event: any) => {
        let value = event.target.valueAsNumber || event.target.value;
        switch (event.target.id) {
            case "name":
                simulation.name = value;
                break;
            case "interval":
                simulation.interval = value;
                break;
            case "duration":
                simulation.duration = value;
                break;
            case "type":
                const type = event.target.value;
                if (type === simTypes.autoDemo) {
                    simulation.simId = simTypes.autoDemo;
                } else {
                    simulation.simId = "";
                }
                let devices = [{ typeId: "", name: "", amount: 1 }];
                simulation.devices = devices;
                setSimType(type);
                setShowDeviceValidation([]);
                break;
            default: return;
        }
        setSimulation({ ...simulation });
    }

    /**
     * Shows form validation when a field is focused
     * @param event 
     */
    const handleFieldFocus = (event: any) =>  {
        if(!showValidation.includes(event.target.id)) {
            showValidation.push(event.target.id);
            setShowValidation([...showValidation]);
        }
    }

    return (
        <div className="page-content">
            <PageTitleBar title={props.title} />
            <Card className="content-card">
                <Card.Title className="content-card-title">
                    {I18n.get("create.simulation")}
                </Card.Title>
                <Card.Subtitle className="content-card-subtitle">
                    {I18n.get("create.simulation.description")}
                </Card.Subtitle>
                <Card.Body>
                    <Form
                        id="simulationForm"
                        name="simulationForm"
                        onSubmit={(event) => handleSubmit(event)}
                    >
                        <Form.Group>
                            <Form.Label>
                                {I18n.get("simulation.name")}
                            </Form.Label>
                            <Form.Control
                                type="text"
                                id="name"
                                onChange={(event) => { handleFormChange(event) }}
                                onFocus={(event: any) => handleFieldFocus(event)}
                                isInvalid={!!errs.name && showValidation.includes('name')}
                                isValid={!errs.name}
                                value={simulation.name}
                                maxLength={30}
                            >
                            </Form.Control>
                            <Form.Control.Feedback type="invalid">{errs.name}</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>
                                {I18n.get("simulation.type")}
                            </Form.Label>
                            <Form.Control
                                as="select"
                                id="type"
                                onChange={(event) => {handleFormChange(event)}}
                                onFocus={(event: any) => handleFieldFocus(event)}
                                isInvalid={!simType && showValidation.includes('type')}
                                isValid={!!simType && showValidation.includes('type')}
                            >
                                <option value={simTypes.custom}>{I18n.get("user.created")}</option>
                                <option value={simTypes.autoDemo}>{I18n.get("vehicle.demo")}</option>
                            </Form.Control>
                            <Form.Text>
                                {I18n.get("simulation.type.description")}
                            </Form.Text>
                        </Form.Group>
                        <DeviceFields
                            simType={simType}
                            simulation={simulation}
                            setSimulation={setSimulation}
                            errs={deviceErrs}
                            setErrs={setDeviceErrs}
                            showValidation={showDeviceValidation}
                            setShowValidation={setShowDeviceValidation}
                        />
                        <Form.Group>
                            <Form.Label>{I18n.get("interval")}</Form.Label>
                            <Form.Control
                                type="number"
                                id="interval"
                                onChange={(event) => handleFormChange(event)}
                                onFocus={(event: any) => handleFieldFocus(event)}
                                isInvalid={!!errs.interval && showValidation.includes('interval')}
                                isValid={!errs.interval && showValidation.includes('interval')}
                                value={simulation.interval}
                                min={1}
                            >
                            </Form.Control>
                            <Form.Control.Feedback type="invalid">{errs.interval}</Form.Control.Feedback>
                            <Form.Text muted>
                                {I18n.get("interval.description")}
                            </Form.Text>
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>{I18n.get("duration")}</Form.Label>
                            <Form.Control
                                type="number"
                                id="duration"
                                onChange={(event) => handleFormChange(event)}
                                onFocus={(event: any) => handleFieldFocus(event)}
                                isInvalid={!!errs.duration && showValidation.includes('duration')}
                                isValid={!errs.duration && showValidation.includes('duration')}
                                value={simulation.duration}
                                min={1}
                                max={604800}
                            >
                            </Form.Control>
                            <Form.Control.Feedback type="invalid">{errs.duration}</Form.Control.Feedback>
                            <Form.Text>
                                {I18n.get("duration.description")}
                            </Form.Text>
                        </Form.Group>

                        <Row className="float-right">
                            <Button
                                className="button-theme"
                                form="simulationForm"
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
            <Footer pageTitle={props.title}/>
        </div>
    )
}