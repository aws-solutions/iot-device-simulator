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
let VehicleFactory = require('./vehicle/vehicle-factory');
let SimController = require('../sim-controller');
const _ = require('underscore');

// Automotive class for simulating vehicle power train telemetry
class Auto extends SimController {

    constructor(options) {
        super(options);
        this.key = 'automotive';
        this.name = 'Automotive Simulation Controller';
        this.description = 'Creates simulated telemetry for a vehicle based on a powertrain dynamics model';
        this.vehicleFactory = new VehicleFactory(options);
    }

    prepModule() {
        let _self = this;
        return new Promise((resolve, reject) => {
            _self.vehicleFactory.loadConfig().then((configResult) => {
                _self.options.logger.log(configResult, _self.options.logger.levels.INFO);
                _self.vehicleFactory.loadRoutes().then((result) => {
                    _self.options.logger.log(result, _self.options.logger.levels.INFO);
                    _self.runGC();
                    _self.moduleReady = true;
                    resolve([_self.name, 'module preparation complete.'].join(' '));
                }).catch((err) => {
                    _self.options.logger.error(err, _self.options.logger.levels.INFO);
                    _self.moduleReady = false;
                    resolve([_self.name, 'module preparation failed to load routes.'].join(' '));
                });
            }).catch((err) => {
                _self.options.logger.error(err, _self.options.logger.levels.INFO);
                _self.moduleReady = false;
                resolve([_self.name, 'module preparation failed to load configuration.'].join(' '));
            });
        });
    }

    _processCreate(request) {
        let _self = this;
        this.options.logger.log('Create new device for \'Automotive\' module', this.options.logger.levels.ROBUST);
        let _count = 1;
        if (request.hasOwnProperty('count')) {
            _count = request.count;
        }

        for (let i = 0; i < _count; i++) {
            this.vehicleFactory.provision(request).then((vehicle) => {
                _self.options.logger.log(`Attempting to start vehicle '${vehicle.id}'.`, _self.options.logger.levels.ROBUST);
                vehicle.start();
                _self.devices.push(vehicle);
                _self.options.logger.log(`Number of active devices for Automotive module: ${_self.devices.length}`, _self.options.logger.levels.ROBUST);
            }).catch((err) => {
                _self.options.logger.error(err, _self.options.logger.levels.ROBUST);
            });
        }
    }

    _processHydrate(request) {
        let _self = this;
        this.options.logger.log('Hydrating device for \'Automotive\' module', this.options.logger.levels.ROBUST);
        this.vehicleFactory.hydrate(request).then((vehicle) => {
            _self.options.logger.log(`Attempting to start vehicle '${vehicle.id}'.`, _self.options.logger.levels.ROBUST);
            vehicle.start().then((data) => {
                _self.devices.push(vehicle);
                _self.options.logger.log(`Number of active devices for Automotive module: ${_self.devices.length}`, _self.options.logger.levels.ROBUST);
                _self.options.logger.log(data, _self.options.logger.levels.ROBUST);
                _self._updateCurrentSimulationCount('increment').then((res) => {
                    _self.options.logger.log(res, _self.options.logger.levels.ROBUST);
                }).catch((err) => {
                    _self.options.logger.error(err, this.options.logger.levels.INFO);
                });
            }).catch((err) => {
                _self.options.logger.error(err, _self.options.logger.levels.INFO);
            });
        }).catch((err) => {
            _self.options.logger.error(err, _self.options.logger.levels.INFO);
        });
    }

    _processStop(request) {
        let _self = this;
        this.options.logger.log('Attempting to stop device for \'Automotive\' module', this.options.logger.levels.ROBUST);
        var _vehicle = _.where(this.devices, {
            id: request.id
        });
        if (_vehicle.length > 0) {
            _vehicle[0].stop().then((result) => {
                _self.options.logger.log(result, _self.options.logger.levels.ROBUST);
            }).catch((err) => {
                _self.options.logger.error(err, _self.options.logger.levels.INFO);
            });
        }
    }


};

module.exports = Object.freeze(Auto);