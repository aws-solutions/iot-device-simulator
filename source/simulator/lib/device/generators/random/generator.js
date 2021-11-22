// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';
const faker = require('faker');
const { nanoid, customAlphabet } = require('nanoid');
const randomLocation = require('random-location')
const moment = require('moment');

/**
 * @class Generator - Generates messages for devices
 */
class Generator {
    constructor(options) {
        this.options = options;
        this.currentState = options.currentState || {};
        this.staticValues = options.staticValues || {};
        this.isRunning = true;
        this.messages = [];
    }

    /**
     * generates the complete message to be sent
     * @param {object} payload 
     * @param {string} topic 
     * @param {string} id 
     */
    generateMessagePayload(payload, topic, id) {
        let _message = {
            topic: topic,
            payload: {}
        };
        _message.payload = this.generatePayload(payload);
        _message.payload._id_ = id;
        this.messages.push(_message);
    }

    //generats the attribute payload for the messages 
    generatePayload(payload) {
        let generatedPayload = {};
        for (let attribute of payload) {
            if (attribute.static) {
                // check to see if attribute already generated
                if (this.staticValues.hasOwnProperty(attribute.name)) {
                    generatedPayload[attribute.name] = this.staticValues[attribute.name];
                } else {
                    generatedPayload[attribute.name] = this._processSpecAttribute(attribute);
                }
            } else {
                generatedPayload[attribute.name] = this._processSpecAttribute(attribute);
            }
        }

        return (generatedPayload);

    }

    //process a specific attribute from payload
    _processSpecAttribute(attribute) {
        let _value = null;
        //Use default property if available
        if (attribute.hasOwnProperty('default')) {
            if(typeof attribute.default === 'string') {
                if (attribute.default.trim() !== '') {
                    return (attribute.default.trim());
                }
            } else if (attribute.type === 'bool') {
                return (!!attribute.default);
            } else {
                return (attribute.default);
            }
        }

        //Add attribute to state if not already added
        if (!this.currentState.hasOwnProperty(attribute.name)) {
            this.currentState[attribute.name] = {
                cnt: 1
            };
        }
        //generate value according to type
        switch (attribute.type) {
            case 'id': {
                let length = attribute.length || 21;
                if (attribute.charSet) {
                    _value = customAlphabet(attribute.charSet, length)();
                } else {
                    _value = nanoid(length);
                }
                if (attribute.static) {
                    this.staticValues[attribute.name] = _value;
                }
                break;
            }
            case 'string': {
                let { min, max } = attribute;
                let length = faker.datatype.number({ min: min, max: max, precision: 1 })
                _value = faker.datatype.string(length);
                if (attribute.static) {
                    this.staticValues[attribute.name] = _value;
                }
                break;
            }
            case 'int': {
                let { min, max } = attribute;
                _value = faker.datatype.number({ min: min, max: max });
                break;
            }
            case 'timestamp': {
                if (attribute.tsformat === 'unix') {
                    _value = moment().format('x');
                } else {
                    _value = moment().utc().format('YYYY-MM-DDTHH:mm:ss');
                }
                break;
            }
            case 'bool': {
                _value = faker.datatype.boolean();
                break;
            }
            case 'float': {
                let { min, max, precision } = attribute;
                _value = faker.datatype.number({ min: min, max: max, precision: precision });
                break;
            }
            case 'pickOne': {
                _value = faker.random.arrayElement(attribute.arr);
                if (attribute.hasOwnProperty('static') && attribute.static) {
                    this.staticValues[attribute.name] = _value;
                }
                break;
            }
            case 'location': {
                const _center = {
                    latitude: attribute.lat,
                    longitude: attribute.long
                }
                _value = randomLocation.randomCirclePoint(_center, attribute.radius);
                break;
            }
            case 'sinusoidal': {
                _value = this.sin(attribute.min, attribute.max, this.currentState[attribute.name].cnt);
                break;
            }
            case 'decay': {
                _value = this.decay(attribute.min, attribute.max, this.currentState[attribute.name].cnt);
                break;
            }
            case 'object': {
                _value = this.generatePayload(attribute.payload);
                break;
            }
            default: {
                _value = '';
                break;
            }
        }
        //increment current state for attribute
        this.currentState[attribute.name] = {
            cnt: this.currentState[attribute.name].cnt + 1
        }
        return (_value);
    }

    /**
     * Clear all messages waiting to be sent
     */
    clearMessages() {
        this.messages = [];
    }

    /**
     * stop the generator
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Calculates sin
     * @param {number} min 
     * @param {number} max 
     * @param {number} step 
     * @returns calculated sin
     */
    sin(min, max, step) {
        let _sin = Math.sin(2 * Math.PI * step / 100 * 5) * Math.random();
       return this._median([min, max]) + this._median([0, max - min]) * _sin;
    }

    /**
     * Calculates decay
     * @param {number} min 
     * @param {number} max 
     * @param {number} step 
     * @returns calculated decay
     */
    decay(min, max, step) {
        return max - ((max - min) * (1 - Math.exp(-(0.05 * step))));
    }

    /**
     * Calculates the median
     * @param {_median} values 
     * @returns the calculated median
     */
    _median(values) {
        if (values.length === 0) return 0;
        values.sort(function (a, b) {
            return (a - b);
        });
        let half = Math.floor(values.length / 2);
        if (values.length % 2)
            return (values[half]);
        else
            return ((values[half - 1] + values[half]) / 2.0);
    }

}

module.exports = Generator;