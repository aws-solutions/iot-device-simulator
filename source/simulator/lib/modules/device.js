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
 * @author Solution Builders
 */
'use strict';

const AWS = require('aws-sdk');
const shortid = require('shortid');
const _ = require('underscore');
const moment = require('moment');
const UsageMetrics = require('usage-metrics');

// A base device class
class Device {

    constructor(options) {
        this.options = options;
        this.id = '';
        this.uid = shortid.generate();
        this.userId = '';
        this.sendInterval = null;
        this.stage = 'provisioning';
        this.iotdata = new AWS.IotData({
            endpoint: options.iotEndpoint,
            region: options.targetIotRegion
        });

        //v2 - added stage poller internal to check for stopping status
        this.stagePoller = null;
        this.stagePollerInterval = 30000;

    }

    run(interval, metadata) {
        this.started = moment();
        this.sendInterval = setInterval(function () {
            _self._generateMessage();
        }, interval);

        this.stagePoller = setInterval(function () {
            _self._pollDeviceStage();
        }, this.stagePollerInterval);

        this.stage = 'hydrated';
        let _self = this;
        return new Promise((resolve, reject) => {
            let _metadata = {};
            if (metadata) {
                _metadata = metadata;
            }
            _self.update(_metadata).then((result) => {
                _self._updateMetrics('updateRuns', result).then(() => {
                    resolve('Device stage set successfully to \'hydrated\'.');
                }).catch((err) => {
                    resolve('Device stage set successfully to \'hydrated\'.');
                });
            }).catch((err) => {
                _self.stage = 'sleeping';
                reject(err);
            });
        });
    }

    sleep() {
        let _self = this;
        return new Promise((resolve, reject) => {
            clearInterval(_self.sendInterval);
            clearInterval(_self.stagePoller);
            _self.stage = 'sleeping';
            _self.update().then((result) => {
                _self._updateMetrics('updateDuration', result).then(() => {
                    resolve('Device stage set successfully to \'sleeping\'.');
                }).catch((err) => {
                    resolve('Device stage set successfully to \'sleeping\'.');
                });
            }).catch((err) => {
                reject(err);
            });
        });
    }

    _publishMessage(topic, payload) {
        const _self = this;
        return new Promise((resolve, reject) => {

            var params = {
                topic: topic,
                payload: payload,
                qos: 0
            };

            if (this.options.iotEndpoint === '') {
                _self.options.logger.log('Invalid IoT Endpoint can not publish generated payload to AWS IoT.', _self.options.logger.levels.ROBUST);
                return reject(err);
            }

            this.iotdata.publish(params, function (err, data) {
                if (err) {
                    _self.options.logger.log('Error occurred while attempting to publish generated payload to AWS IoT.', _self.options.logger.levels.ROBUST);
                    _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                    reject(err);
                } else {
                    resolve(data);
                }
            });

        });
    }

    update(metadata) {
        let _self = this;

        return new Promise((resolve, reject) => {
            let params = {
                TableName: _self.options.deviceTable,
                Key: {
                    userId: _self.userId,
                    id: _self.id
                }
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.get(params, function (err, device) {
                if (err) {
                    _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                    reject(['Error loading device from ddb to update, id:', _self.id, ', userId: ', _self.userId].join(' '));
                }

                if (!_.isEmpty(device)) {
                    device.Item.updatedAt = moment().utc().format();
                    device.Item.stage = _self.stage;

                    if (metadata) {
                        device.Item.metadata = metadata;
                    }

                    if (_self.stage === 'hydrated') {
                        device.Item.startedAt = moment().utc().format();
                        device.Item.runs = device.Item.runs + 1;
                    } else if (_self.stage === 'sleeping') {
                        device.Item.endedAt = moment().utc().format();
                    }

                    let params = {
                        TableName: _self.options.deviceTable,
                        Item: device.Item
                    };

                    docClient.put(params, function (err, data) {
                        if (err) {
                            _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                            reject(['Error updating device to ddb, id:', _self.id, ', userId: ', _self.userId].join(' '));
                        } else {
                            resolve(device.Item);
                        }
                    });
                } else {
                    reject(['Device id:', , _self.id, ', userId: ', _self.userId, 'not found, unable to update.'].join(' '));
                }

            });
        });
    }

    _sendUsageMetrics(payload) {
        let _self = this;

        return new Promise((resolve, reject) => {
            if (_.isString(this.options.anonymousData)) {
                if (this.options.anonymousData === "Yes") {
                    let _usageMetrics = new UsageMetrics();
                    _usageMetrics.sendAnonymousMetric(payload).then((data) => {
                        _self.options.logger.debug(data, _self.options.logger.levels.ROBUST);
                        _self.options.logger.log('Annonymous metrics successfully sent.', _self.options.logger.levels.ROBUST);
                        resolve('Annonymous metrics successfully sent.');
                    }).catch((err) => {
                        _self.options.logger.error(err, _self.options.logger.levels.ROBUST);
                        reject('Annonymous metrics transmission failed.');
                    });
                } else {
                    this.options.logger.log('Annonymous metrics configuration is disabled.', _self.options.logger.levels.ROBUST);
                    reject('Annonymous metrics configuration is disabled.');
                }
            } else {
                this.options.logger.log('Annonymous metrics configuration is invalid.', _self.options.logger.levels.ROBUST);
                reject('Annonymous metrics configuration is invalid.');
            }
        });
    }

    _updateMetrics(action, device) {
        let _self = this;

        return new Promise((resolve, reject) => {
            let params = {
                TableName: _self.options.metricsTable,
                Key: {
                    userId: _self.userId
                }
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.get(params, function (err, metric) {
                if (err) {
                    _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                    _self.options.logger.log(`Error loading metrics from ddb to update for userId: ${_self.userId}`, _self.options.logger.levels.INFO);
                }

                let _metric = null;
                let _usageData = {};
                if (_.isEmpty(metric)) {
                    _metric = {
                        createdAt: moment().utc().format(),
                        deviceBreakdown: {
                            id: moment().format('YYYYMM'),
                            simulations: []
                        },
                        monthlyRuns: [{
                            auto: 0,
                            generic: 0,
                            id: moment().subtract(1, 'month').format('YYYYMM'),
                            month: moment().subtract(1, 'month').format('MMM'),
                            runs: 0
                        }],
                        totalDuration: 0,
                        totalRuns: 0,
                        userId: _self.userId
                    }
                } else {
                    _metric = metric.Item;
                }

                if (action === 'updateRuns') {
                    _metric = _self._updateRunMetrics(_metric, device.subCategory);
                    _usageData = {
                        MetricType: 'SimulationRuns',
                        SimulationRuns: 1,
                        SimulationCategory: device.category
                    };
                } else if (action === 'updateDuration') {
                    let _duration = moment(device.endedAt).diff(moment(device.startedAt), 'minutes');
                    _metric = _self._updateDurationMetrics(_metric, device.category, _duration);
                    _usageData = {
                        MetricType: 'SimulationDuration',
                        SimulationDuration: _duration,
                        SimulationCategory: device.category
                    };
                }

                _metric.updatedAt = moment().utc().format();

                let params = {
                    TableName: _self.options.metricsTable,
                    Item: _metric
                };

                docClient.put(params, function (err, data) {
                    if (err) {
                        _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                        _self.options.logger.log(`Error updating metric to ddb for userId: ${_self.userId}`, _self.options.logger.levels.INFO);
                    }

                    let _useMetric = {
                        Solution: 'SO0041',
                        UUID: _self.options.uuid,
                        TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
                        Data: _usageData
                    };
                    _self._sendUsageMetrics(_useMetric).then((data) => {
                        resolve(`Processing user (${_self.userId}) metric update is complete.`);
                    }).catch((err) => {
                        resolve(`Processing user (${_self.userId}) metric update failed.`);
                    });

                });

            });
        });
    }

    _updateRunMetrics(metric, category) {
        metric.totalRuns = metric.totalRuns + 1;

        if (metric.deviceBreakdown.id !== moment().format('YYYYMM')) {
            // reset stats
            metric.deviceBreakdown.id = moment().format('YYYYMM');
            if (metric.deviceBreakdown.hasOwnProperty('simulations')) {
                metric.deviceBreakdown.simulations.length = 0;
            } else {
                metric.deviceBreakdown.simulations = [];
            }
        }

        if (metric.deviceBreakdown.hasOwnProperty('simulations')) {
            let _simtype = _.where(metric.deviceBreakdown.simulations, {
                category: category
            });

            if (_simtype.length > 0) {
                _simtype[0].runs = _simtype[0].runs + 1;
            } else {
                metric.deviceBreakdown.simulations.push({
                    category: category,
                    runs: 1
                });
            }

        } else {
            metric.deviceBreakdown.simulations = [{
                category: category,
                runs: 1
            }];
        }

        if (metric.hasOwnProperty('monthlyRuns')) {
            let _month = _.where(metric.monthlyRuns, {
                id: moment().format('YYYYMM')
            });

            if (_month.length > 0) {
                _month[0].runs = _month[0].runs + 1;
            } else {
                metric.monthlyRuns.push({
                    auto: 0,
                    generic: 0,
                    id: moment().format('YYYYMM'),
                    month: moment().format('MMM'),
                    runs: 1
                });
            }
        } else {
            metric.monthlyRuns = [{
                auto: 0,
                generic: 0,
                id: moment().format('YYYYMM'),
                month: moment().format('MMM'),
                runs: 1
            }, {
                auto: 0,
                generic: 0,
                id: moment().subtract(1, 'month').format('YYYYMM'),
                month: moment().subtract(1, 'month').format('MMM'),
                runs: 0
            }];
        }

        return metric;
    }

    _updateDurationMetrics(metric, category, duration) {
        metric.totalDuration = metric.totalDuration + duration;

        let _default = {
            auto: 0,
            generic: 0,
            id: moment().format('YYYYMM'),
            month: moment().format('MMM'),
            runs: 1
        };

        if (category === 'automotive') {
            _default.auto = duration;
        } else {
            _default.generic = duration;
        }

        if (metric.hasOwnProperty('monthlyRuns')) {
            let _month = _.where(metric.monthlyRuns, {
                id: moment().format('YYYYMM')
            });

            if (_month.length > 0) {
                if (category === 'automotive') {
                    _month[0].auto = _month[0].auto + duration;
                } else {
                    _month[0].generic = _month[0].generic + duration;
                }
            } else {
                metric.monthlyRuns.push(_default);
            }
        } else {
            metric.monthlyRuns = [_default, {
                auto: 0,
                generic: 0,
                id: moment().subtract(1, 'month').format('YYYYMM'),
                month: moment().subtract(1, 'month').format('MMM'),
                runs: 0
            }];
        }

        return metric;
    }

    _pollDeviceStage() {
        let _self = this;
        let params = {
            TableName: this.options.deviceTable,
            Key: {
                userId: this.userId,
                id: this.id
            }
        };

        let docClient = new AWS.DynamoDB.DocumentClient(this.dynamoConfig);
        docClient.get(params, function (err, device) {
            if (err) {
                _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                _self.options.logger.log(`Error retrieving device from ddb to check stage change, id:, ${_self.id}, userId: ${_self.userId}`, _self.options.logger.levels.INFO);
            } else {
                if (!_.isEmpty(device)) {
                    if (device.Item.stage === 'stopping') {
                        _self.options.logger.log(`Device id:, ${_self.id}, userId: ${_self.userId} stage set to stopping. Attempting to stop.`, _self.options.logger.levels.INFO);
                        _self.stop().then((result) => {
                            _self.options.logger.log(result, _self.options.logger.levels.INFO);
                        }).catch((err2) => {
                            _self.options.logger.log(err2, _self.options.logger.levels.INFO);
                        });
                    }
                } else {
                    _self.options.logger.log(`Device id: ${_self.id}, userId: ${_self.userId} not found, unable to check stage change.`, _self.options.logger.levels.INFO);
                }
            }
        });
    }

    /**
     * Generates and publish simulated device data.
     */
    _generateMessage() { }


    /**
     * Start device simulation.
     */
    start() { }

    /**
     * Stop device simulation.
     */
    stop() { }
};

module.exports = Device;