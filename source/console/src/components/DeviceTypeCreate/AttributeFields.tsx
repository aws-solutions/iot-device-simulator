// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { I18n } from '@aws-amplify/core'
import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/Col';
import { IAttribute, IErrors } from '../Shared/Interfaces';
import { FormControlProps } from 'react-bootstrap/FormControl';

interface IProps {
    attr: IAttribute,
    handleFormChange: Function,
    handleFieldFocus: Function,
    errors: IErrors<IAttribute>,
    showValidation: string[]
}
export default function AttributeFields(props: IProps): JSX.Element {

    /**
     * Creates a Form control item for an attribute field
     * @param id 
     * @returns A form control item representing an attribute
     */
    const createFormControlItem = (id: keyof IAttribute) => {
        const attrType = props.attr.type;
        let formControlOptions: FormControlProps & React.InputHTMLAttributes<Function> = {};
        let options: Array<string> = [];

        if ((attrType === 'string' && id === "default") || id === 'charSet') {
            formControlOptions.type = "text";
            formControlOptions.maxLength = 256;
        } else if (id === "arr") {
            formControlOptions.type = "text";
        } else if (id === "static" || id === "tsformat") {
            formControlOptions.value = props.attr[id]?.toString();
            formControlOptions.as = "select";
            options = id === "static" ?
                [I18n.get("false"), I18n.get("true")] :
                [I18n.get("timestamp.tsformat.default"), I18n.get("timestamp.tsformat.unix")];
        } else {
            formControlNumber(formControlOptions, id);
        }
        if (id !== 'default' && attrType !== 'id') {
            formControlOptions.required = true
            formControlOptions.disabled = !!props.attr.default;
        }

        return (
            <Form.Control
                isInvalid={!!props.errors[id] && props.showValidation.includes(id)}
                isValid={!props.errors[id]  && props.showValidation.includes(id)}
                onChange={(event) => props.handleFormChange(event)}
                onFocus={(event: any) => props.handleFieldFocus(event)}
                {...formControlOptions}
                id={id}
            >
                { options.length > 0 ?
                    options.map((option, index) => (
                        <option key={index} value={option.toLowerCase()}>
                            {option}
                        </option>
                    )) :
                    undefined
                }
            </Form.Control>
        )
    }

    return (
        <Col>
            { Object.keys(props.attr).filter(
                word => !["name", "type", "payload"].includes(word)).map(
                    (id, index) => (
                        <Form.Group key={index}>
                            <Form.Label>
                                {
                                    (["min", "max", "static", "default"].includes(id) &&
                                        I18n.get(id)) ||
                                    I18n.get(`${props.attr.type.toLowerCase()}.${id}`)

                                }
                            </Form.Label>
                            {createFormControlItem(id as keyof IAttribute)}
                            <Form.Control.Feedback type="invalid">{props.errors[id as keyof IAttribute]}</Form.Control.Feedback>
                            <Form.Text>
                                {
                                    id === "static" || id === "default" ?
                                        I18n.get(`${id}.description`) :
                                        I18n.get(`${props.attr.type.toLowerCase()}.${id}.description`)
                                }
                            </Form.Text>
                        </Form.Group>
                    )
                )}
        </Col>
    )
}
function formControlNumber(formControlOptions: FormControlProps & React.InputHTMLAttributes<Function>, id: string) {
    formControlOptions.type = "number";
    if (id === "long") {
        formControlOptions.min = -180;
        formControlOptions.max = 180;
        formControlOptions.step = .000001;
    } else if (id === "lat") {
        formControlOptions.min = -90;
        formControlOptions.max = 90;
        formControlOptions.step = .000001;
    } else if (id === 'precision') {
        formControlOptions.step = .000001;
    } else if (id === "length") {
        formControlOptions.min = 1;
        formControlOptions.max = 36;
    }
}

