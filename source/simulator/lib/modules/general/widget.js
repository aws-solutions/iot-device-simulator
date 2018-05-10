/*********************************************************************************************************************
 *  Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
 *                                                                                                                    *
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES *
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
    }

    /**
     * Start widget.
     */
    start() {
        let _self = this;

        return new Promise((resolve, reject) => {
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
            let _message = {};
            if (this.messageSpec.hasOwnProperty('payload')) {
                for (let i = 0; i < this.messageSpec.payload.length; i++) {
                    // TODO: skip if spec item has no 'name' defined for now
                    if (this.messageSpec.payload[i].hasOwnProperty('name')) {
                        if (this.messageSpec.payload[i].static) {
                            // check to see if attribute already generated
                            if (this.info.hasOwnProperty(this.messageSpec.payload[i].name)) {
                                _message[this.messageSpec.payload[i].name] = this.info[this.messageSpec.payload[i].name];
                            } else {
                                _message[this.messageSpec.payload[i].name] = this._processSpecAttribtue(this.messageSpec.payload[i]);
                            }
                        } else {
                            _message[this.messageSpec.payload[i].name] = this._processSpecAttribtue(this.messageSpec.payload[i]);
                        }
                    }
                }

                _message._id_ = this.id;
                let _payload = JSON.stringify(_message);
                this.options.logger.debug(`Sending data for '${this.id}' (${this.userId}) to AWS IoT ${_payload} to ${this.messageSpec.topic}`, this.options.logger.levels.DEBUG);
                this._publishMessage(this.messageSpec.topic, _payload).then((result) => {
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

    _processSpecAttribtue(attribute) {
        let _value = null;
        if (attribute.hasOwnProperty('default')) {
            if (attribute.default !== '') {
                return attribute.default;
            }
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
                default:
                    _value = '';
                    break;
            }
        }
        return _value;
    }

};

module.exports = Widget;