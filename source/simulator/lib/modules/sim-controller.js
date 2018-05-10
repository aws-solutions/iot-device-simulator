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

const AWS = require('aws-sdk');
const shortid = require('shortid');
const _ = require('underscore');
const moment = require('moment');

// A base device class
class SimController {

    constructor(options) {
        this.options = options;
        this.key = 'controller';
        this.name = 'Controller parent class';
        this.enabled = true;
        this.gcInterval = this.options.garbageCollectionInterval;
        this.moduleReady = false;
        this.dynamoConfig = {
            region: process.env.AWS_REGION
        };
        this.devices = [];
    }

    prepModule() {}

    runGC() {
        const _self = this;
        this.options.logger.log(`Setting garbage collection internal for ${this.name} to ${this.gcInterval} ms`, this.options.logger.levels.INFO);
        this.sendInterval = setInterval(function() {
            _self.GC();
        }, this.gcInterval);
    }

    GC() {
        const _self = this;
        this.options.logger.log(`Running ${this.name} garbage collection`, this.options.logger.levels.ROBUST);
        var _removals = _.where(this.devices, {
            stage: 'sleeping'
        });
        this.options.logger.log(`Number of devices for ${this.name} garbage collection: ${_removals.length}`, this.options.logger.levels.ROBUST);
        if (_removals.length > 0) {
            for (var j = 0; j < _removals.length; j++) {
                this.options.logger.log([`Attempting to remove ${this.name} device`, _removals[j].id].join(' '), this.options.logger.levels.INFO);
                let _index = _.findIndex(this.devices, function(o) {
                    o.id === _removals[j].id
                });
                this.devices.splice(_index, 1);
                this._updateCurrentSimulationCount('decrement').then((res) => {
                    _self.options.logger.log(res, _self.options.logger.levels.ROBUST);
                }).catch((err) => {
                    _self.options.logger.error(err, this.options.logger.levels.INFO);
                });
            }
        }
        this.options.logger.log(`Number of active devices for ${this.name} module: ${this.devices.length}`, this.options.logger.levels.ROBUST);
    }

    process(request) {
        if (this.moduleReady) {
            if (request.action === 'create') {
                this._processCreate(request);
            } else if (request.action === 'hydrate') {
                this._processHydrate(request);
            } else if (request.action === 'delete') {} else
            if (request.action === 'stop') {
                this._processStop(request);
            }
        } else {
            this.options.logger.warn(`The ${this.name} module did not properly initiate and will not process requests.`, this.options.logger.levels.ROBUST);
        }
    }

    _processCreate(request) {}

    _processHydrate(request) {}

    _processStop(request) {}

    _updateCurrentSimulationCount(op) {
        let _self = this;

        return new Promise((resolve, reject) => {
            let _expr = (op === 'decrement' ? 'set setting = setting - :val' : 'set setting = setting + :val');
            let params = {
                TableName: _self.options.settingsTable,
                Key: {
                    settingId: 'current-sims'
                },
                UpdateExpression: _expr,
                ExpressionAttributeValues: {
                    ':val': 1
                },
                ReturnValues: 'ALL_NEW'
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.update(params, function(err, data) {
                if (err) {
                    _self.options.logger.error(err, _self.options.logger.levels.ROBUST);
                    reject(`Unable to update configuration entry current-sims from ${_self.options.settingsTable} ddb table.`);
                } else {
                    resolve(`Updated current-sims configuration entry successfully.`);
                }
            });
        });
    }

};

module.exports = SimController;