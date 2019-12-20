/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

/**
 * Viperlight is a customized derivative of the open source project Hawkeye [https://github.com/Stono/hawkeye].
 */

/**
 * @author Solution Builders
 */

'use strict';
let Device = require('../device.js');
const Generator = require('./generator');
const moment = require('moment');

// Logging class for sending messages to console log
class Widget extends Device {

    constructor(options, params, spec) {
        super(options);
        if (!params.id) {
            this.id = this.uid;
        } else {
            this.id = params.id;
        }
        this.description = 'A device that generates randomized simulated data.';
        this.generator = new Generator(this.options);
        this.userId = params.userId;
        this.messageSpec = spec;
        this.duration = params.duration;
        this.info = {};

        this.currentState = {};
    }

    /**
     * Start widget.
     */
    start() {
        let _self = this;

        return new Promise((resolve, reject) => {
            this.currentState = {};
            _self.run(_self.messageSpec.interval).then((result) => {
                _self.started = moment();
                _self.options.logger.log(result, this.options.logger.levels.ROBUST);
                resolve(`Widget ${_self.id} started.`);
            }).catch((err) => {
                this.options.logger.error(err, this.options.logger.levels.ROBUST);
                reject(`Widget ${_self.id} failed to start.`);
            });
        });
    }

    /**
     * Stop widget.
     */
    stop() {
        let _self = this;

        return new Promise((resolve, reject) => {
            _self.sleep().then((result) => {
                _self.options.logger.log(result, this.options.logger.levels.ROBUST);
                resolve(`Widget ${_self.id} stopped.`);
            }).catch((err) => {
                this.options.logger.error(err, this.options.logger.levels.ROBUST);
                reject(`Widget ${_self.id} failed to stop.`);
            });
        });

    };

    _generateMessage() {
        this.options.logger.debug(`generating message for '${this.id}' device [widget]`, this.options.logger.levels.ROBUST);
        let _time_delta = moment().diff(this.started);
        if (_time_delta > this.duration) {
            this.options.logger.log(`Widget '${this.id}' run duration has elapsed.`, this.options.logger.levels.ROBUST);
            const _self = this;
            this.stop().then((result) => {
                _self.options.logger.log(result, _self.options.logger.levels.INFO);
            }).catch((err) => {
                _self.options.logger.error(err, _self.options.logger.levels.ROBUST);
            });
        } else {
            if (this.messageSpec.hasOwnProperty('payload')) {
                let _message = this._generateMessageConstruct();

                let _payload = JSON.stringify(_message.payload);
                this.options.logger.debug(`Sending data for '${this.id}' (${this.userId}) to AWS IoT ${_payload} to ${_message.topic}`, this.options.logger.levels.DEBUG);
                this._publishMessage(_message.topic, _payload).then((result) => {
                    this.options.logger.debug(`Message successfully sent for '${this.id}' to configured topic.`, this.options.logger.levels.DEBUG);
                }).catch((err) => {
                    this.options.logger.error(err, this.options.logger.levels.ROBUST);
                    this.options.logger.debug(`Error occurred while attempting to send message for '${this.id}' to configured topic.`, this.options.logger.levels.DEBUG);
                });
            } else {
                this.options.logger.log(`No payload defined for the device type for widget '${this.id}'. Attempting to stop.`, this.options.logger.levels.INFO);
                this.stop().then((result) => {
                    _self.options.logger.log(result, _self.options.logger.levels.ROBUST);
                }).catch((err) => {
                    _self.options.logger.error(err, _self.options.logger.levels.INFO);
                });
            }
        }
    }

    //v2 - add ability to use attribute values in the topic
    _generateMessageConstruct() {
        let _message = {
            topic: this.messageSpec.topic,
            payload: {}
        };
        _message.payload = this._generateMessagePayload(this.messageSpec.payload);

        const varRegex = /\$\{(\w+)\}/g; // matches ${name}
        const attributesToRemove = {};
        _message.topic = this.messageSpec.topic.replace(varRegex, function (match, capture) {
            attributesToRemove[capture] = 0;
            return _message.payload[capture];
        });

        // for (var v in attributesToRemove) {
        //     delete _message.payload[v];
        // }

        _message.payload._id_ = this.id;

        return _message;
    }

    _generateMessagePayload(payload) {
        let _message = {};
        for (let i = 0; i < payload.length; i++) {
            if (payload[i].hasOwnProperty('name')) {
                if (payload[i].static) {
                    // check to see if attribute already generated
                    if (this.info.hasOwnProperty(payload[i].name)) {
                        _message[payload[i].name] = this.info[payload[i].name];
                    } else {
                        _message[payload[i].name] = this._processSpecAttribtue(payload[i]);
                    }
                } else {
                    _message[payload[i].name] = this._processSpecAttribtue(payload[i]);
                }
            }
        }

        return _message;
    }

    _processSpecAttribtue(attribute) {
        let _value = null;
        if (attribute.hasOwnProperty('default')) {
            if (attribute.default !== '') {
                return attribute.default;
            }
        }

        if (!this.currentState.hasOwnProperty(attribute.name)) {
            this.currentState[attribute.name] = {
                value: _value,
                cnt: 1
            };
        }

        // TODO: skip if spec item has no 'type' defined for now
        if (attribute.hasOwnProperty('type')) {
            switch (attribute.type) {
                case 'id':
                    _value = this.id;
                    break;
                case 'string':
                    _value = this.generator.str(attribute.smin, attribute.smax);
                    if (attribute.hasOwnProperty('static')) {
                        this.info[attribute.name] = _value;
                    }
                    break;
                case 'int':
                    _value = this.generator.int(attribute.min, attribute.max);
                    break;
                case 'timestamp':
                    _value = this.generator.ts(attribute.format);
                    break;
                case 'bool':
                    _value = this.generator.bool(attribute.bmin, attribute.bmax, attribute.seed);
                    break;
                case 'range':
                    _value = this.generator.range(attribute.start, attribute.stop, attribute.step);
                    break;
                case 'float':
                    _value = this.generator.float(attribute.imin, attribute.imax, attribute.dmin, attribute.dmax, attribute.precision);
                    break;
                case 'pickSome':
                    _value = this.generator.pickSome(attribute.arr, attribute.count, attribute.shuffle);
                    break;
                case 'pickOne':
                    _value = this.generator.pickOne(attribute.arr);
                    //v2 - added ability for pickOne to pick value once per simulation and be static
                    if (attribute.hasOwnProperty('static')) {
                        this.info[attribute.name] = _value;
                    }
                    break;
                case 'uuid':
                    _value = this.generator.uuid();
                    if (attribute.hasOwnProperty('static')) {
                        this.info[attribute.name] = _value;
                    }
                    break;
                case 'shortid':
                    _value = this.generator.shortid();
                    if (attribute.hasOwnProperty('static')) {
                        this.info[attribute.name] = _value;
                    }
                    break;
                case 'location':
                    const _center = {
                        latitude: attribute.lat,
                        longitude: attribute.long
                    }

                    _value = this.generator.location(_center, attribute.radius);
                    break;
                case 'sinusoidal':
                    _value = this.generator.sin(attribute.min, attribute.max, this.currentState[attribute.name].cnt);
                    break;
                case 'decay':
                    _value = this.generator.decay(attribute.min, attribute.max, this.currentState[attribute.name].cnt);
                    break;
                case 'object':
                    _value = this._generateMessagePayload(attribute.payload);
                    break;
                default:
                    _value = '';
                    break;
            }
        }

        if (this.currentState.hasOwnProperty(attribute.name)) {
            this.currentState[attribute.name] = {
                value: _value,
                cnt: this.currentState[attribute.name].cnt + 1
            };
        }
        return _value;
    }

};

module.exports = Widget;