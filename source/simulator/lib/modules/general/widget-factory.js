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
 * @author Solution Builders
 */

'use strict';

let DeviceFactory = require('../device-factory.js');
let Widget = require('./widget.js');
const _ = require('underscore');
const util = require('../../util');

class WidgetFactory extends DeviceFactory {

    constructor(options) {
        super(options);
        this._initialize_data(options);
    }

    _initialize_data(options) {
        this.options = options;
        this.config = {};
        this.routes = [];
    }

    /**
     * Re-instantiate (hydrate) simulator vehicle.
     */
    hydrate(params) {
        const _self = this;
        return new Promise((resolve, reject) => {
            _self.options.logger.log('Processing widget hydration request.', _self.options.logger.levels.ROBUST);
            _self.options.logger.debug(params, _self.options.logger.levels.ROBUST);
            super.loadDevice(params.userId, params.id).then((device) => {
                super.loadDeviceType(device.userId, device.typeId).then((dtype) => {
                    let _widget = {};
                    let _params = {
                        id: device.id,
                        userId: device.userId,
                        duration: dtype.spec.duration
                    };

                    if (dtype.spec.hasOwnProperty('payload')) {
                        _widget = new Widget(_self.options, _params, dtype.spec);

                        _self.options.logger.log(['Widget object hydrated. ID:', _widget.id].join(' '), _self.options.logger.levels.INFO);
                        resolve(_widget);
                    } else {
                        reject(`Unable to hydrate widget. No device type payload defined for the device type for widget '${device.id}'.`);
                    }
                }).catch((err) => {
                    _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                    reject('Unable to load device type to hydrate widget');
                });
            }).catch((err) => {
                _self.options.logger.log(err, _self.options.logger.levels.INFO);
                reject('Unable to load device to hydrate widget');
            });

        });

    }

    delete(vehicleId, cb) {
        let _this = this;
    }

    /**
     * Provision simulator vehicle.
     */
    provision(params) {
        const _self = this;
        return new Promise((resolve, reject) => {
            _self._createWidget(params).then((widget) => {
                if (!_.isEmpty(widget)) {
                    // TODO: add vehicle to device table
                    resolve(widget);
                } else {
                    reject('Widget factory failed to create widget.')
                }
            }).catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Create vehicle IoT device on platform.
     */
    _createWidget(params) {
        const _self = this;
        return new Promise((resolve, reject) => {
            _self.options.logger.log('Processing widget creation request.', _self.options.logger.levels.ROBUST);
            super.loadDeviceType(params.userId, params.typeId).then((dtype) => {
                let _widget = {};

                let _params = {
                    userId: params.userId,
                    duration: dtype.spec.duration
                };
                _widget = new Widget(_self.options, _params, dtype.spec);

                _self.options.logger.log(['New widget object created. ID:', _widget.id].join(' '), _self.options.logger.levels.INFO);
                resolve(_widget);
            }).catch((err) => {
                _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                reject('Unable to load device type to provision widget');
            });

        });
    }

};

module.exports = WidgetFactory;