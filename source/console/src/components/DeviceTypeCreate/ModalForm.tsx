// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { I18n } from '@aws-amplify/core';
import { useState, useEffect } from 'react';
import AttributeFields from './AttributeFields';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { IAttribute, IErrors, AttributeTypeMap } from '../Shared/Interfaces';
import { validateField, validateRange, getAttrFields } from '../../util/Utils';

interface IProps {
    closeModal: Function,
    handleModalSubmit: Function,
    showModal: boolean,
    refAttr?: IAttribute[]

}

export default function ModalForm(props: IProps): JSX.Element {
    const initialState = { name: "", type: "id" };
    let [attr, setAttr] = useState<IAttribute>(initialState)
    let [errs, setErrs] = useState<IErrors<IAttribute>>({});
    let [showValidation, setShowValidation] = useState<string[]>([]);

    /**
     * react useEffect hook
     * validate fields on attribute state update
     */
    useEffect(() => {
        let newErrs: IErrors<IAttribute> = {};
        const attrKeys = Object.keys(attr);
        attrKeys.forEach((key: string) => {
            const value = attr[key as keyof IAttribute];
            let error: any = validateField(key, value);

            if (!error[key]) {
                if (key === 'min') {
                    error = validateRange(key, Number(value!), Number(attr['max']));
                } else if (key === 'max') {
                    error = validateRange('min', Number(attr['min']), Number(value!)
                    );
                }
            }
            newErrs = { ...newErrs, ...error }
        })

        if (attr.default) {
            newErrs = newErrs.name ? { name: newErrs.name } : {};
        }
        setErrs({ ...newErrs });
    }, [attr])

    /**
     * checks validity of attribtue fields and submits
     * @param e 
     */
    const handleSubmit = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.checkValidity();
        if (Object.keys(errs).length === 0) {
            props.handleModalSubmit(attr);
            handleModalClose();
        }
    }

    /**
     * get fields belonging to an attribute
     * @param type 
     * @returns Object containing attribtue fields with initial values
     */
    const getAttrFieldDefaults = (type: string) => {
        let attrFields: string[];
        attrFields = getAttrFields(type);
        return attrFields.reduce(
            (acc: { [key: string]: any }, curr) => {
                let value: any;
                if (curr === "static") {
                    value = false;
                }
                else if (curr === "tsformat") {
                    value = "default";
                } else if (curr === "payload") {
                    value = [];
                }
                else {
                    value = undefined;
                }
                return (acc[curr] = value, acc)
            },
            {}
        );
    }

    /**
     * react useEffect hook
     * Resets attribute fields to that of intial type whenever modal is closed
     */
    useEffect(() => {
        if (props.showModal === false) {
            setAttr({ ...attr, ...getAttrFieldDefaults(attr.type) })
        }
    }, [props.showModal])

    /**
     * reset state and close modal
     */
    const handleModalClose = () => {
        setAttr(initialState);
        setShowValidation([]);
        props.closeModal();
    }

    /**
     * update state on form field change
     * @param event 
     */
    const handleFormChange = (event: any) => {
        let attrName = event.currentTarget.id as keyof IAttribute;
        let attrItem: { [key: string]: any } = {};
        let newFields = {};
        let valueAsNum = isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber;
        attrItem[attrName] = valueAsNum ?? event.target.value;
        if (attrName === 'static') {
            attrItem[attrName] = attrItem[attrName] === 'true';
        } else if (attrName === "type") {
            Array.from(document.querySelectorAll("input")).forEach((input: HTMLInputElement) => {
                if(Object.keys(AttributeTypeMap).includes(input.id) && !["name", "type"].includes(input.id)) {
                    input.value = "";
                }
            });
            newFields = getAttrFieldDefaults(event.target.value);
            attr = { name: attr.name, type: event.target.value };
            setShowValidation(showValidation.filter(id => id === "name" || id === 'type'));
        } else if (attrName === "arr") {
            attrItem[attrName] = attrItem[attrName].split(',');
        }
        setAttr({ ...attr, ...newFields, ...attrItem });
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

    return (
        <Modal show={props.showModal} onHide={() => handleModalClose()}>
            <Modal.Header closeButton>
                <Modal.Title>{I18n.get("add.attribute")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form
                    name="attributeForm"
                    id="attributeForm"
                    onSubmit={(event) => { handleSubmit(event) }}
                >
                    <Form.Group>
                        <Form.Label>{I18n.get("attribute.name")}</Form.Label>
                        <Form.Control
                            required
                            type="text"
                            id="name"
                            maxLength={128}
                            isValid={!errs.name && showValidation.includes('name')}
                            isInvalid={!!errs.name && showValidation.includes('name')}
                            onChange={(event) => handleFormChange(event)}
                            onFocus={(event: any) => handleFieldFocus(event)}
                        >
                        </Form.Control>
                        <Form.Control.Feedback type="invalid">{errs.name}</Form.Control.Feedback>
                        <Form.Text className="muted">{I18n.get("attribute.name.description")}</Form.Text>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>{I18n.get("attribute.data.type")}</Form.Label>
                        <Form.Control as="select" id="type" onChange={(event) => handleFormChange(event)}>
                            <option value="id">{I18n.get("id")}</option>
                            <option value="bool">{I18n.get("bool")}</option>
                            <option value="decay">{I18n.get("decay")}</option>
                            <option value="float">{I18n.get("float")}</option>
                            <option value="int">{I18n.get("int")}</option>
                            <option value="location">{I18n.get("location")}</option>
                            <option value="object">{I18n.get("object")}</option>
                            <option value="string">{I18n.get("string")}</option>
                            <option value="sinusoidal">{I18n.get("sinusoidal")}</option>
                            <option value="timestamp">{I18n.get("timestamp")}</option>
                            <option value="pickOne">{I18n.get("pickone")}</option>
                        </Form.Control>
                    </Form.Group>
                    <AttributeFields 
                        showValidation={showValidation}
                        errors={errs} 
                        attr={attr} 
                        handleFormChange={handleFormChange} 
                        handleFieldFocus={handleFieldFocus}
                    />
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    className="button-theme-alt"
                    onClick={() => handleModalClose()}
                >
                    {I18n.get("cancel")}
                </Button>
                <Button
                    type="submit"
                    className="button-theme"
                    form="attributeForm"
                    disabled={Object.keys(errs).length > 0}
                >
                    {I18n.get("save")}
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
