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

let DeviceFactory = require('../../device-factory.js');
const AWS = require('aws-sdk');
let Vehicle = require('./vehicle.js');
const _ = require('underscore');
const https = require('https');
const util = require('../../../util');

// A base class is defined using the new reserved 'class' keyword
class VehicleFactory extends DeviceFactory {

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
     * Load the catalog of routes for vehicles to traverse.
     */
    loadRoutes() {
        const _self = this;
        return new Promise((resolve, reject) => {

            var s3 = new AWS.S3();
            let params = {
                Bucket: _self.config.routeBucket,
                Key: _self.config.routeManifestPath
            };

            s3.getObject(params, function(err, data) {
                if (err) {
                    _self.options.logger.log(`Error retrieving routes manifest from ${_self.config.routeBucket}/${_self.config.routeManifestPath}`, _self.options.logger.levels.INFO);
                    reject('Unable to load routes for automotive simulation engine.');
                } else {
                    _self.options.logger.debug(`Retrieved route manifest from ${_self.config.routeBucket}/${_self.config.routeManifestPath}`, _self.options.logger.levels.ROBUST);
                    let _manifest = JSON.parse(data.Body.toString('utf-8'));
                    _self._loadRoutes(_manifest.routes, 0).then((data) => {
                        resolve(['Simulation routes [', _self.routes.length, '] loaded...'].join(' '));
                    }).catch((err) => {
                        _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                        reject('Unable to load and cache routes for automotive simulation engine.');
                    });
                }
            });
        });
    }


    /**
     * Load the configuration.
     */
    loadConfig() {
        let _self = this;
        return new Promise((resolve, reject) => {
            util.loadConfigValues('automotive').then((config) => {
                _self.config = config.setting;
                resolve(`Automotive conifguration loaded...`);
            }).catch((err) => {
                _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                reject('Unable to load configuration for automotive module.');
            });
        });
    }

    /**
     * Re-instantiate (hydrate) simulator vehicle.
     */
    hydrate(params) {
        const _self = this;
        return new Promise((resolve, reject) => {
            _self.options.logger.log('Processing vehicle hydration request.', _self.options.logger.levels.ROBUST);
            super.loadDeviceType(params.userId, 'automotive').then((dtype) => {
                let _vehicle = {};

                let _route = _.where(this.routes, {
                    route_id: _self._getRandomRoute().route_id
                });
                if (_route.length === 0) {
                    _self.options.logger.log('Failed to find simulator route in loaded settings. Vehicle creation failed.', _self.options.logger.levels.ROBUST);
                } else {
                    super.loadDevice(params.userId, params.id).then((device) => {
                        let _params = {
                            id: params.id,
                            route: _route[0],
                            vin: device.metadata.vin,
                            userId: params.userId,
                            aggregateMetrics: dtype.spec.aggregateMetrics,
                            aggregationTransmissionTime: dtype.spec.aggregationTransmissionTime,
                            measurementPollerInterval: dtype.spec.measurementPollerInterval,
                            dataTopic: dtype.spec.dataTopic,
                            dataAggregatedTopic: dtype.spec.dataAggregatedTopic,
                            errorTopic: dtype.spec.errorTopic,
                            tripBucket: dtype.spec.tripBucket
                        };
                        _vehicle = new Vehicle(_self.options, _params);

                        _self.options.logger.log(['Vehicle object hydrated. VIN:', _vehicle.VIN].join(' '), _self.options.logger.levels.INFO);
                        resolve(_vehicle);
                    }).catch((err) => {
                        _self.options.logger.log(err, _self.options.logger.levels.INFO);
                        reject('Unable to load device to hydrate vehicle');
                    });
                }
            }).catch((err) => {
                _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                reject('Unable to load device type to hydrate vehicle');
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
            _self._createVehicle(params).then((vehicle) => {
                if (!_.isEmpty(vehicle)) {
                    // TODO: add vehicle to device table
                    resolve(vehicle);
                } else {
                    reject('Vehicle factory failed to create vehicle.')
                }
            }).catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Create vehicle IoT device on platform.
     */
    _createVehicle(params) {
        const _self = this;
        return new Promise((resolve, reject) => {
            _self.options.logger.log('Processing vehicle creation request.', _self.options.logger.levels.ROBUST);
            super.loadDeviceType(params.userId, 'automotive').then((dtype) => {
                let _vehicle = {};

                let _route = _.where(this.routes, {
                    route_id: _self._getRandomRoute().route_id
                });
                if (_route.length === 0) {
                    _self.options.logger.log('Failed to find simulator route in loaded settings. Vehicle creation failed.', _self.options.logger.levels.ROBUST);
                } else {
                    let _params = {
                        id: params.id,
                        route: _route[0],
                        vin: params.vin,
                        userId: params.userId,
                        aggregateMetrics: dtype.spec.aggregateMetrics,
                        aggregationTransmissionTime: dtype.spec.aggregationTransmissionTime,
                        measurementPollerInterval: dtype.spec.measurementPollerInterval,
                        dataTopic: dtype.spec.dataTopic,
                        dataAggregatedTopic: dtype.spec.dataAggregatedTopic,
                        errorTopic: dtype.spec.errorTopic,
                        tripBucket: dtype.spec.tripBucket
                    };
                    _vehicle = new Vehicle(_self.options, _params);

                    _self.options.logger.log(['New vehicle object created. VIN:', _vehicle.VIN].join(' '), _self.options.logger.levels.INFO);
                    resolve(_vehicle);
                }
            }).catch((err) => {
                _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                reject('Unable to load device type to provision vehicle');
            });

        });
    }

    _getRandomRoute() {
        const _rand = Math.floor(Math.random() * (this.routes.length - 0)) + 0;
        return this.routes[_rand];
    }

    _loadRoutes(routes, index) {
        const _self = this;
        return new Promise((resolve, reject) => {
            if (index < routes.length) {
                var s3 = new AWS.S3();
                let params = {
                    Bucket: _self.config.routeBucket,
                    Key: routes[index].s3path
                };

                s3.getObject(params, function(err, data) {
                    if (err) {
                        _self.options.logger.log(`Error retrieving route data from ${_self.config.routeBucket}/${routes[index].s3path}`, _self.options.logger.levels.INFO);
                        reject('Unable to load all routes for vehicle factory');
                    } else {
                        _self.options.logger.debug(`Retrieved route data from ${_self.config.routeBucket}/${routes[index].s3path} for route ${routes[index].id}`, _self.options.logger.levels.ROBUST);
                        let _route = JSON.parse(data.Body.toString('utf-8'));
                        _self.routes.push(_route);
                        index++;
                        _self._loadRoutes(routes, index).then((data) => {
                            resolve(data);
                        }).catch((err) => {
                            _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                            reject(`Unable to load route ${routes[index].id}`);
                        });
                    }
                });
            } else {
                resolve(`All routes loaded from ${_self.config.routeBucket}...`);
            }

        });
    }

};

module.exports = VehicleFactory;