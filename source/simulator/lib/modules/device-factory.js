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
const _ = require('underscore');

// A base device factory class
class DeviceFactory {

    constructor(options) {
        this.options = options;
        this.dynamoConfig = {
            region: process.env.AWS_REGION
        };
    }

    /**
     * Load the catalog of routes for vehicles to traverse.
     */
    loadDeviceType(userId, type) {
        let _self = this;
        return new Promise((resolve, reject) => {
            _self._loadDeviceType(_self.options.deviceTypeTable, userId, type).then((dtype) => {
                resolve(dtype);
            }).catch((err) => {
                _self.options.logger.log("Unable to load user device type for module. Attempting default type.", _self.options.logger.levels.INFO);
                _self._loadDeviceType(_self.options.deviceTypeTable, '_default_', type).then((dtype) => {
                    resolve(dtype);
                }).catch((err) => {
                    _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                    _self.options.logger.log('Unable to load user or default device type for module. Attempting shared type lookup.', _self.options.logger.levels.INFO);
                    _self._loadSharedDeviceType(_self.options.deviceTypeTable, type).then((sharedtype) => {
                        resolve(sharedtype);
                    }).catch((err) => {
                        _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                        reject('Unable to load user, default or shared device type for module.');
                    });
                });
            });
        });
    }

    loadDevice(userId, deviceId) {
        let _self = this;

        return new Promise((resolve, reject) => {
            let params = {
                TableName: _self.options.deviceTable,
                Key: {
                    userId: userId,
                    id: deviceId
                }
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.get(params, function (err, device) {
                if (err) {
                    _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
                    return reject(`Error loading device from ddb, id: ${deviceId}, userId: ${userId}`);
                }

                if (!_.isEmpty(device)) {
                    resolve(device.Item);
                } else {
                    reject(`Device id: ${deviceId}, userId: ${userId} not found.`);
                }

            });
        });
    }

    hydrate() { }

    delete() { }

    create() { }

    provision() { }

    _loadDeviceType(table, userId, type) {
        let _self = this;
        return new Promise((resolve, reject) => {

            const params = {
                TableName: table,
                Key: {
                    userId: userId,
                    typeId: type
                }
            };

            const docClient = new AWS.DynamoDB.DocumentClient(this.dynamoConfig);
            docClient.get(params, function (err, dtype) {
                if (err) {
                    _self.options.logger.log(err, _self.options.logger.levels.INFO);
                    return reject(`Unable to load device type entry ${type}`);
                }

                if (!_.isEmpty(dtype)) {
                    resolve(dtype.Item);
                } else {
                    reject(`Unable to load device type entry ${type}`);
                }
            });
        });
    }

    //v2.0 - added lookup for user shared device types.
    _loadSharedDeviceType(table, type) {
        let _self = this;
        return new Promise((resolve, reject) => {
            const params = {
                TableName: table,
                FilterExpression: 'typeId = :tid and visibility = :vis',
                ExpressionAttributeValues: {
                    ':tid': type,
                    ':vis': 'shared'
                },
                Limit: 100
            };

            const docClient = new AWS.DynamoDB.DocumentClient(this.dynamoConfig);
            docClient.scan(params, function (err, sharedData) {
                if (err) {
                    _self.options.logger.log(err, _self.options.logger.levels.INFO);
                    return reject(`Unable to load device type entry ${type}`);
                }

                if (sharedData.Items.length > 0) {
                    // v2.0 - validate device type is shared
                    if (sharedData.Items[0].hasOwnProperty('visibility')) {
                        if (sharedData.Items[0].visibility === 'shared') {
                            resolve(sharedData.Items[0]);
                        } else {
                            reject(`Unable to load device type entry ${type}. Visibility is private.`);
                        }
                    } else {
                        reject(`Unable to load device type entry ${type}. Visibility is private.`);
                    }
                } else {
                    reject(`Unable to load device type entry ${type}`);
                }
            });
        });
    }

};

module.exports = DeviceFactory;