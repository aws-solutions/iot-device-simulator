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

const Logger = require('logger');
const moment = require('moment');
const AWS = require('aws-sdk');
const _ = require('underscore');
const shortid = require('shortid');


/**
 * Performs crud actions for a device type, such as, creating, retrieving, updating and deleting device types.
 *
 * @class DeviceTypeManager
 */
class DeviceTypeManager {

    /**
     * @class DeviceTypeManager
     * @constructor
     */
    constructor() {
        this.creds = new AWS.EnvironmentCredentials('AWS'); // Lambda provided credentials
        this.dynamoConfig = {
            credentials: this.creds,
            region: process.env.AWS_REGION
        };
    }

    /**
     * Get device types for the user.
     * @param {JSON} ticket - authorization ticket.
     */
    getDeviceTypes(ticket, page) {
        const _self = this;
        return new Promise((resolve, reject) => {

            let _page = parseInt(page);
            if (isNaN(_page)) {
                _page = 0;
            }

            _self._getDeviceTypePage(ticket, null, 0, _page).then((dtypes) => {
                resolve(dtypes);
            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err);
                Logger.error(Logger.levels.INFO, `Error occurred while attempting to retrieve device types for user ${ticket.userid}.`);
                reject({
                    code: 500,
                    error: 'DeviceTypeRetrievalFailure',
                    message: err
                });
            });

        });
    }


    /**
     * Retrieves a user's device types statistics.
     * @param {JSON} ticket - authentication ticket
     */
    getDeviceTypeStats(ticket) {
        const _self = this;
        return new Promise((resolve, reject) => {
            _self._getDeviceTypeStats(ticket, null).then((data) => {
                resolve(data);
            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err);
                Logger.error(Logger.levels.INFO, `Error occurred while attempting to retrieve device type stats for user ${ticket.userid}.`);
                reject({
                    code: 500,
                    error: 'DeviceTypeStatsRetrievalFailure',
                    message: err
                });
            });
        });
    }

    /**
     * Retrieves a device type for user.
     * @param {JSON} ticket - authentication ticket
     * @param {string} deviceTypeId - id of device type to retrieve
     */
    getDeviceType(ticket, deviceTypeId) {

        const _self = this;
        return new Promise((resolve, reject) => {

            let params = {
                TableName: process.env.DEVICE_TYPES_TBL,
                Key: {
                    userId: ticket.userid,
                    typeId: deviceTypeId
                }
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.get(params, function (err, data) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject({
                        code: 500,
                        error: 'DeviceTypeRetrieveFailure',
                        message: `Error occurred while attempting to retrieve device type ${deviceTypeId} for user ${ticket.userid}.`
                    });
                }

                if (!_.isEmpty(data)) {
                    return resolve(data.Item);
                } else {
                    // check for default type
                    Logger.error(Logger.levels.INFO, `The device type ${deviceTypeId} for user ${ticket.userid} does not exist.`);
                    params = {
                        TableName: process.env.DEVICE_TYPES_TBL,
                        Key: {
                            userId: '_default_',
                            typeId: deviceTypeId
                        }
                    };
                    docClient.get(params, function (err, defaultData) {
                        if (err) {
                            Logger.error(Logger.levels.INFO, err);
                            return reject({
                                code: 500,
                                error: 'DeviceTypeRetrieveFailure',
                                message: `Error occurred while attempting to retrieve default device type ${deviceTypeId}.`
                            });
                        }

                        if (!_.isEmpty(defaultData)) {
                            return resolve(defaultData.Item);
                        } else {
                            // v2.0 checking for shared device
                            Logger.error(Logger.levels.INFO, `The _default_ device type ${deviceTypeId} does not exist, checking for shared device type.`);
                            params = {
                                TableName: process.env.DEVICE_TYPES_TBL,
                                FilterExpression: 'typeId = :tid and visibility = :vis',
                                ExpressionAttributeValues: {
                                    ':tid': deviceTypeId,
                                    ':vis': 'shared'
                                },
                                Limit: 100
                            };
                            console.log(params)
                            docClient.scan(params, function (err, sharedData) {
                                if (err) {
                                    Logger.error(Logger.levels.INFO, err);
                                    return reject({
                                        code: 500,
                                        error: 'DeviceTypeRetrieveFailure',
                                        message: `Error occurred while attempting to search for shared device type ${deviceTypeId}.`
                                    });
                                }
                                console.log(sharedData)
                                if (sharedData.Items.length > 0) {
                                    // v2.0 - validate device type is shared
                                    if (sharedData.Items[0].hasOwnProperty('visibility')) {
                                        if (sharedData.Items[0].visibility === 'shared') {
                                            return resolve(sharedData.Items[0]);
                                        } else {
                                            return reject({
                                                code: 400,
                                                error: 'MissingDeviceType',
                                                message: `The device type ${deviceTypeId} for user ${ticket.userid}, default or shared does not exist.`
                                            });
                                        }
                                    } else {
                                        return reject({
                                            code: 400,
                                            error: 'MissingDeviceType',
                                            message: `The device type ${deviceTypeId} for user ${ticket.userid}, default or shared does not exist.`
                                        });
                                    }
                                } else {
                                    return reject({
                                        code: 400,
                                        error: 'MissingDeviceType',
                                        message: `The device type ${deviceTypeId} for user ${ticket.userid}, default or shared does not exist.`
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });
    };

    /**
     * Creates a device type for user.
     * @param {JSON} ticket - authentication ticket
     * @param {JSON} deviceType - device type object
     */
    createDeviceType(ticket, deviceType) {

        const _self = this;
        return new Promise((resolve, reject) => {

            let _id = _.has(deviceType, 'typeId') ? deviceType.typeId : shortid.generate();
            if (_id === "") {
                _id = shortid.generate();
            }

            // v2.0 - added device type visilibility, default is private.
            let _deviceType = {
                userId: ticket.userid,
                typeId: _id,
                custom: deviceType.custom,
                name: deviceType.name,
                spec: deviceType.spec,
                visibility: deviceType.visibility === 'shared' ? 'shared' : 'private',
                createdAt: moment().utc().format(),
                updatedAt: moment().utc().format()
            };

            let params = {
                TableName: process.env.DEVICE_TYPES_TBL,
                Item: _deviceType
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.put(params, function (err, data) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject({
                        code: 500,
                        error: 'DeviceTypeCreateFailure',
                        message: `Error occurred while attempting to create device type for user ${ticket.userid}.`
                    });
                }

                resolve(_deviceType);
            });

        });

    };


    /**
     * Deletes a device type for user.
     * @param {JSON} ticket - authentication ticket
     * @param {string} deviceTypeId - id of device type to delete
     */
    deleteDeviceType(ticket, deviceTypeId) {

        const _self = this;
        return new Promise((resolve, reject) => {

            let params = {
                TableName: process.env.DEVICE_TYPES_TBL,
                Key: {
                    userId: ticket.userid,
                    typeId: deviceTypeId
                }
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.get(params, function (err, deviceType) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject({
                        code: 500,
                        error: 'DeviceTypeRetrieveFailure',
                        message: `Error occurred while attempting to retrieve device type ${deviceTypeId} for user ${ticket.userid} to delete.`
                    });
                }

                if (!_.isEmpty(deviceType)) {
                    docClient.delete(params, function (err, data) {
                        if (err) {
                            Logger.error(Logger.levels.INFO, err);
                            return reject({
                                code: 500,
                                error: 'DeviceTypeDeleteFailure',
                                message: `Error occurred while attempting to delete device type ${deviceTypeId} for user ${ticket.userid}.`
                            });
                        }

                        resolve(data);
                    });
                } else {
                    return reject({
                        code: 400,
                        error: 'MissingDeviceType',
                        message: `The requested device type ${deviceTypeId} for user ${ticket.userid} does not exist.`
                    });
                }
            });
        });
    };

    /**
     * Updates a device type for user.
     * @param {JSON} ticket - authentication ticket
     * @param {string} deviceTypeId - id device type to update
     * @param {string} newDeviceType - new device type object
     */
    updateDeviceType(ticket, deviceTypeId, newDeviceType) {

        const _self = this;
        return new Promise((resolve, reject) => {

            let _params = {
                TableName: process.env.DEVICE_TYPES_TBL,
                Key: {
                    userId: ticket.userid,
                    typeId: deviceTypeId
                }
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.get(_params, function (err, deviceType) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject({
                        code: 500,
                        error: 'DeviceTypeRetrieveFailure',
                        message: `Error occurred while attempting to retrieve device type ${deviceTypeId} for user ${ticket.userid} to update.`
                    });
                }

                if (!_.isEmpty(deviceType)) {
                    deviceType.Item.updatedAt = moment().utc().format();
                    deviceType.Item.spec = newDeviceType.spec;
                    // v2.0 - added device type visilibility, default is private.
                    deviceType.Item.visibility = newDeviceType.visibility === 'shared' ? 'shared' : 'private';

                    let _updateParams = {
                        TableName: process.env.DEVICE_TYPES_TBL,
                        Item: deviceType.Item
                    };

                    docClient.put(_updateParams, function (err, data) {
                        if (err) {
                            Logger.error(Logger.levels.INFO, err);
                            return reject({
                                code: 500,
                                error: 'DeviceTypeUpdateFailure',
                                message: `Error occurred while attempting to update device type ${deviceTypeId} for user ${ticket.userid}.`
                            });
                        }

                        resolve(data);
                    });
                } else {
                    return reject({
                        code: 400,
                        error: 'MissingDeviceType',
                        message: `The requested device type ${deviceTypeId} for user ${ticket.userid} does not exist.`
                    });
                }
            });
        });
    };

    /**
     * Get specific device types page for the user.
     * @param {JSON} ticket - authorization ticket.
     * @param {string} lastevalkey - a serializable JavaScript object representing last evaluated key
     * @param {int} curpage - current page evaluated
     * @param {int} targetpage - target page of device types to Retrieves
     */
    _getDeviceTypePage(ticket, lastevalkey, curpage, targetpage) {
        const _self = this;
        return new Promise((resolve, reject) => {

            // const params = {
            //     TableName: process.env.DEVICE_TYPES_TBL,
            //     KeyConditionExpression: 'userId = :uid',
            //     ExpressionAttributeValues: {
            //         ':uid': ticket.userid
            //     },
            //     Limit: 20
            // };

            // v2.0 - moving to scan to retrieve 'shared' device types as well
            const params = {
                TableName: process.env.DEVICE_TYPES_TBL,
                FilterExpression: 'userId = :uid or visibility = :vis',
                ExpressionAttributeValues: {
                    ':uid': ticket.userid,
                    ':vis': 'shared'
                },
                Limit: 50
            };

            if (lastevalkey) {
                params.ExclusiveStartKey = lastevalkey;
            }

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            // v2.0 - moving to scan to retrieve 'shared' device types as well
            //docClient.query(params, function(err, result) {
            docClient.scan(params, function (err, result) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject(`Error occurred while attempting to retrieve page ${targetpage} from device types.`);
                }

                if (curpage === targetpage) {
                    // filter out automotive device types
                    return resolve(_.filter(result.Items, (type) => {
                        return type.typeId !== 'automotive'
                    }));
                } else if (result.LastEvaluatedKey) {
                    curpage++;
                    _self._getDeviceTypePage(ticket, result.LastEvaluatedKey, curpage, targetpage);
                } else {
                    return resolve([]);
                }

            });

        });

    };

    /**
     * Get device types statistics for the user.
     * @param {JSON} ticket - authorization ticket.
     * @param {string} lastevalkey - a serializable JavaScript object representing last evaluated key
     */
    _getDeviceTypeStats(ticket, lastevalkey) {

        const _self = this;
        return new Promise((resolve, reject) => {
            let params = {
                TableName: process.env.DEVICE_TYPES_TBL,
                KeyConditionExpression: 'userId = :uid',
                ExpressionAttributeValues: {
                    ':uid': ticket.userid
                },
                ProjectionExpression: 'userId, typeId, custom',
                Limit: 75
            };

            if (lastevalkey) {
                params.ExclusiveStartKey = lastevalkey;
            }

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.query(params, function (err, result) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject(`Error occurred while attempting to retrieve stats for ${process.env.DEVICE_TYPES_TBL}.`);
                }

                // filter out automotive device types
                let items = _.filter(result.Items, (type) => {
                    return type.typeId !== 'automotive'
                });

                let _stats = {
                    total: items.length
                };

                if (result.LastEvaluatedKey) {
                    _self._getDeviceTypeStats(ticket, result.LastEvaluatedKey).then((data) => {
                        _stats.total = _stats.total + data.total;
                        resolve(_stats);
                    }).catch((err) => {
                        Logger.error(Logger.levels.INFO, err);
                        reject(`Error occurred while attempting to retrieve device type statistics for user ${ticket.userid}.`);
                    });
                } else {
                    resolve(_stats);
                }

            });

        });

    }

}

module.exports = DeviceTypeManager;