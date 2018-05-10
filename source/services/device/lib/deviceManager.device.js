/*********************************************************************************************************************
 *  Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the 'License'). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
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
const randomstring = require('randomstring');


/**
 * Performs crud actions for a device, such as, creating, retrieving, updating and deleting devices.
 *
 * @class DeviceManager
 */
class DeviceManager {

    /**
     * @class DeviceManager
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
     * Get devices for the user.
     * @param {JSON} ticket - authorization ticket.
     */
    getDevices(ticket, category, page) {
        const _self = this;
        return new Promise((resolve, reject) => {

            let _page = parseInt(page);
            if (isNaN(_page)) {
                _page = 0;
            }

            _self._getDevicePage(ticket, category, null, 0, _page).then((devices) => {
                resolve(devices);
            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err);
                Logger.error(Logger.levels.INFO, `Error occurred while attempting to retrieve devices for user ${ticket.userid}.`);
                reject({
                    code: 500,
                    error: 'DeviceRetrievalFailure',
                    message: err
                });
            });

        });
    }

    /**
     * Retrieves a user's device widget statistics.
     * @param {JSON} ticket - authentication ticket
     */
    getDeviceStats(ticket, category) {
        const _self = this;
        return new Promise((resolve, reject) => {
            _self._getDeviceStats(ticket, category, null).then((data) => {
                data.total = data.provisioning + data.hydrated + data.sleeping;
                resolve(data);
            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err);
                Logger.error(Logger.levels.INFO, `Error occurred while attempting to retrieve device stats for user ${ticket.userid}.`);
                reject({
                    code: 500,
                    error: 'DeviceStatsRetrievalFailure',
                    message: err
                });
            });
        });
    }

    /**
     * Retrieves a user's device widget statistics grouped by subCategory.
     * @param {JSON} ticket - authentication ticket
     */
    getDeviceStatsBySubCategory(ticket, category) {
        const _self = this;
        return new Promise((resolve, reject) => {
            _self._getDeviceStatsBySubCategory(ticket, category, null).then((data) => {
                let _total = 0;
                for (let key in data) {
                    _total += data[key];
                }
                data.total = _total;
                resolve(data);
            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err);
                Logger.error(Logger.levels.INFO, `Error occurred while attempting to retrieve device stats by subcategory for user ${ticket.userid}.`);
                reject({
                    code: 500,
                    error: 'DeviceStatsSubCatRetrievalFailure',
                    message: err
                });
            });
        });
    }

    /**
     * Retrieves a device for user.
     * @param {JSON} ticket - authentication ticket
     * @param {string} deviceId - id of device to retrieve
     */
    getDevice(ticket, deviceId) {

        const _self = this;
        return new Promise((resolve, reject) => {

            const params = {
                TableName: process.env.DEVICES_TBL,
                Key: {
                    userId: ticket.userid,
                    id: deviceId
                }
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.get(params, function(err, data) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject({
                        code: 500,
                        error: 'DeviceRetrieveFailure',
                        message: `Error occurred while attempting to retrieve device ${deviceId} for user ${ticket.userid}.`
                    });
                }

                if (!_.isEmpty(data)) {
                    return resolve(data.Item);
                } else {
                    return reject({
                        code: 400,
                        error: 'MissingDevice',
                        message: `The device ${deviceId} for user ${ticket.userid} does not exist.`
                    });
                }
            });
        });
    }

    /**
     * Creates a device for user.
     * @param {JSON} ticket - authentication ticket
     * @param {JSON} request - device creation request object
     */
    createDevice(ticket, request) {

        const _self = this;
        return new Promise((resolve, reject) => {

            if (request.count > 25) {
                return reject({
                    code: 400,
                    error: 'DeviceCreateLimitExceeded',
                    message: 'Exceeded limit of 25 concurrent device creations per request.'
                });
            }

            let params = {
                TableName: process.env.DEVICE_TYPES_TBL,
                Key: {
                    userId: ticket.userid,
                    typeId: request.typeId
                }
            };

            _self._getDeviceType(ticket, request.typeId).then((dtype) => {
                let _requestItems = [];
                let _metadata = [];

                for (let i = 0; i < request.count; i++) {
                    let _metadata = {};
                    _metadata = _self._generateDefaultMetadata(request.metadata, dtype.typeId);
                    _requestItems.push({
                        PutRequest: {
                            Item: {
                                userId: ticket.userid,
                                id: shortid.generate(),
                                metadata: _metadata,
                                stage: 'provisioning',
                                runs: 0,
                                category: dtype.custom ? 'custom widget' : dtype.typeId,
                                subCategory: dtype.name,
                                typeId: dtype.typeId,
                                createdAt: moment().utc().format(),
                                updatedAt: moment().utc().format()
                            }
                        }
                    });
                }

                params = {
                    RequestItems: {},
                    ReturnConsumedCapacity: 'TOTAL',
                    ReturnItemCollectionMetrics: 'SIZE'
                };
                params.RequestItems[`${process.env.DEVICES_TBL}`] = _requestItems;

                let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
                docClient.batchWrite(params, function(err, data) {
                    if (err) {
                        Logger.error(Logger.levels.INFO, err);
                        return reject({
                            code: 500,
                            error: 'DeviceBatchCreateFailure',
                            message: `Error occurred while attempting to batch create devices for user ${ticket.userid}.`
                        });
                    }

                    _self._queueBulkSimulatorActions(_requestItems, 0).then((resp) => {
                        resolve({
                            processedItems: _requestItems.length,
                            consumedCapacity: data.ConsumedCapacity.CapacityUnits
                        });
                    }).catch((err) => {
                        return reject(err);
                    });

                });
            }).catch((err) => {
                reject(err);
            });
        });

    }

    /**
     * Deletes a device for user.
     * @param {JSON} ticket - authentication ticket
     * @param {string} DeviceId - id of device to delete
     */
    deleteDevice(ticket, deviceId) {

        const _self = this;
        return new Promise((resolve, reject) => {

            let params = {
                TableName: process.env.DEVICES_TBL,
                Key: {
                    userId: ticket.userid,
                    id: deviceId
                }
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.get(params, function(err, device) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject({
                        code: 500,
                        error: 'DeviceRetrieveFailure',
                        message: `Error occurred while attempting to retrieve device ${deviceId} for user ${ticket.userid} to delete.`
                    });
                }

                if (!_.isEmpty(device)) {
                    docClient.delete(params, function(err, data) {
                        if (err) {
                            Logger.error(Logger.levels.INFO, err);
                            return reject({
                                code: 500,
                                error: 'DeviceDeleteFailure',
                                message: `Error occurred while attempting to delete device ${deviceId} for user ${ticket.userid}.`
                            });
                        }

                        resolve(data);
                    });
                } else {
                    return reject({
                        code: 400,
                        error: 'MissingDevice',
                        message: `The requested device ${deviceId} for user ${ticket.userid} does not exist.`
                    });
                }
            });
        });
    }

    /**
     * Updates a device for user.
     * @param {JSON} ticket - authentication ticket
     * @param {string} deviceId - id device to update
     * @param {string} newDevice - new device object
     */
    updateDevice(ticket, deviceId, newDevice) {

        const _self = this;
        return new Promise((resolve, reject) => {

            let _params = {
                TableName: process.env.DEVICES_TBL,
                Key: {
                    userId: ticket.userid,
                    id: deviceId
                }
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.get(_params, function(err, device) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject({
                        code: 500,
                        error: 'DeviceRetrieveFailure',
                        message: `Error occurred while attempting to retrieve device ${deviceId} for user ${ticket.userid} to update.`
                    });
                }

                if (!_.isEmpty(device)) {
                    device.Item.updatedAt = moment().utc().format();
                    device.Item.typeId = newDevice.typeId;
                    device.Item.category = newDevice.category;
                    device.Item.subCategory = newDevice.subCategory;
                    device.Item.metadata = newDevice.metadata;
                    device.Item.stage = newDevice.stage;

                    let _updateParams = {
                        TableName: process.env.DEVICES_TBL,
                        Item: device.Item
                    };

                    if (newDevice.hasOwnProperty('operation')) {
                        let _body = {
                            action: newDevice.operation,
                            userId: ticket.userid,
                            id: deviceId,
                            type: device.Item.category
                        };

                        if (newDevice.operation === 'hydrate') {
                            _updateParams.Item.stage = 'provisioning';
                        }

                        _self._queueSimulatorAction(_body).then((resp) => {
                            Logger.log(Logger.levels.INFO, resp);
                            docClient.put(_updateParams, function(err, data) {
                                if (err) {
                                    Logger.error(Logger.levels.INFO, err);
                                    return reject({
                                        code: 500,
                                        error: 'DeviceUpdateFailure',
                                        message: `Error occurred while attempting to update device ${deviceId} for user ${ticket.userid}.`
                                    });
                                }

                                resolve(device.Item);
                            });
                        }).catch((err) => {
                            Logger.error(Logger.levels.INFO, err);
                            return reject(err);
                        });
                    } else {
                        docClient.put(_updateParams, function(err, data) {
                            if (err) {
                                Logger.error(Logger.levels.INFO, err);
                                return reject({
                                    code: 500,
                                    error: 'DeviceUpdateFailure',
                                    message: `Error occurred while attempting to update device ${deviceId} for user ${ticket.userid}.`
                                });
                            }

                            resolve(device.Item);
                        });
                    }

                } else {
                    return reject({
                        code: 400,
                        error: 'MissingDevice',
                        message: `The requested device ${deviceId} for user ${ticket.userid} does not exist.`
                    });
                }
            });
        });
    }

    /**
     * Retrieves a device type for user.
     * @param {JSON} ticket - authentication ticket
     * @param {string} deviceTypeId - id of device type to retrieve
     */
    _getDeviceType(ticket, deviceTypeId) {
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
            docClient.get(params, function(err, data) {
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
                    Logger.error(Logger.levels.INFO, `User ${ticket.userid} does not have a device type ${deviceTypeId} defined, checking for a default.`);
                    // user has no device type defined check for a device type with a default owner
                    params = {
                        TableName: process.env.DEVICE_TYPES_TBL,
                        Key: {
                            userId: '_default_',
                            typeId: deviceTypeId
                        }
                    };

                    docClient.get(params, function(err, defaultData) {
                        if (err) {
                            Logger.error(Logger.levels.INFO, err);
                            return reject({
                                code: 500,
                                error: 'DefaultDeviceTypeRetrieveFailure',
                                message: `Error occurred while attempting to retrieve _default_ device type ${deviceTypeId}.`
                            });
                        }

                        if (!_.isEmpty(defaultData)) {
                            return resolve(defaultData.Item);
                        } else {
                            return reject({
                                code: 400,
                                error: 'MissingDefaultDeviceType',
                                message: `The device type ${deviceTypeId} for user ${ticket.userid} does not exist.`
                            });
                        }
                    });
                }
            });
        });
    }

    /**
     * Get device statistics for the user.
     * @param {JSON} ticket - authorization ticket.
     * @param {string} category - category of devices to get stats on
     * @param {string} lastevalkey - a serializable JavaScript object representing last evaluated key
     */
    _getDeviceStats(ticket, category, lastevalkey) {

        const _self = this;
        return new Promise((resolve, reject) => {
            let _filter = 'userId = :uid';
            let _expression = {
                ':uid': ticket.userid
            };

            if (category) {
                _filter += ' and category = :category';
                _expression[':category'] = category;
            }

            let params = {
                TableName: process.env.DEVICES_TBL,
                IndexName: 'userId-category-index',
                KeyConditionExpression: _filter,
                ExpressionAttributeValues: _expression,
                ProjectionExpression: 'userId, id, category, subCategory, typeId, stage',
                Limit: 75
            };

            if (lastevalkey) {
                params.ExclusiveStartKey = lastevalkey;
            }
            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.query(params, function(err, result) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject(`Error occurred while attempting to retrieve stats for ${process.env.DEVICES_TBL}.`);
                }

                let _status = _.countBy(result.Items, function(o) {
                    return o.stage;
                });

                if (!_status.hasOwnProperty('provisioning')) {
                    _status.provisioning = 0;
                }

                if (!_status.hasOwnProperty('hydrated')) {
                    _status.hydrated = 0;
                }

                if (!_status.hasOwnProperty('sleeping')) {
                    _status.sleeping = 0;
                }

                if (result.LastEvaluatedKey) {
                    _self._getDeviceStats(ticket, category, result.LastEvaluatedKey).then((data) => {
                        _status.provisioning = _status.provisioning + data.provisioning;
                        _status.hydrated = _status.hydrated + data.hydrated;
                        _status.sleeping = _status.sleeping + data.sleeping;

                        resolve(_status);
                    }).catch((err) => {
                        Logger.error(Logger.levels.INFO, err);
                        return reject(`Error occurred while attempting to retrieve stats for ${process.env.DEVICES_TBL}.`);
                    });
                } else {
                    resolve(_status);
                }

            });

        });

    }

    /**
     * Get device statistics by sub category for the user.
     * @param {JSON} ticket - authorization ticket.
     * @param {string} category - category of devices to get stats on
     * @param {string} lastevalkey - a serializable JavaScript object representing last evaluated key
     */
    _getDeviceStatsBySubCategory(ticket, category, lastevalkey) {

        const _self = this;
        return new Promise((resolve, reject) => {
            let _filter = 'userId = :uid';
            let _expression = {
                ':uid': ticket.userid
            };

            if (category) {
                _filter += ' and category = :category';
                _expression[':category'] = category;
            }

            let params = {
                TableName: process.env.DEVICES_TBL,
                IndexName: 'userId-category-index',
                KeyConditionExpression: _filter,
                ExpressionAttributeValues: _expression,
                ProjectionExpression: 'userId, id, category, subCategory, typeId, stage',
                Limit: 75
            };

            if (lastevalkey) {
                params.ExclusiveStartKey = lastevalkey;
            }
            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.query(params, function(err, result) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject(`Error occurred while attempting to retrieve stats by subCategory for ${process.env.DEVICES_TBL}.`);
                }

                let _status = _.countBy(result.Items, function(o) {
                    return o.subCategory;
                });

                if (result.LastEvaluatedKey) {
                    _self._getDeviceStatsBySubCategory(ticket, category, result.LastEvaluatedKey).then((data) => {
                        for (let key in data) {
                            if (_status.hasOwnProperty(key)) {
                                _status[key] = _status[key] + data[key];
                            } else {
                                _status[key] = data[key];
                            }
                        }
                        resolve(_status);
                    }).catch((err) => {
                        Logger.error(Logger.levels.INFO, err);
                        return reject(`Error occurred while attempting to retrieve stats by subCategory for ${process.env.DEVICES_TBL}.`);
                    });
                } else {
                    resolve(_status);
                }

            });

        });

    }


    /**
     * Get specific devices page for the user.
     * @param {JSON} ticket - authorization ticket.
     * @param {string} lastevalkey - a serializable JavaScript object representing last evaluated key
     * @param {int} curpage - current page evaluated
     * @param {int} targetpage - target page of devices to Retrieves
     */
    _getDevicePage(ticket, category, lastevalkey, curpage, targetpage) {
        const _self = this;
        return new Promise((resolve, reject) => {

            let _filter = 'userId = :uid';
            let _expression = {
                ':uid': ticket.userid
            };

            if (category) {
                _filter += ' and category = :category';
                _expression[':category'] = category;
            }

            const params = {
                TableName: process.env.DEVICES_TBL,
                IndexName: 'userId-category-index',
                KeyConditionExpression: _filter,
                ExpressionAttributeValues: _expression,
                Limit: 20
            };

            if (lastevalkey) {
                params.ExclusiveStartKey = lastevalkey;
            }

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.query(params, function(err, result) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject(`Error occurred while attempting to retrieve page ${targetpage} from devices.`);
                }

                if (curpage === targetpage) {
                    return resolve(result.Items);
                } else if (result.LastEvaluatedKey) {
                    curpage++;
                    _self._getDevicePage(ticket, category, result.LastEvaluatedKey, curpage, targetpage).then((data) => {
                        resolve(data);
                    }).catch((err) => {
                        return reject(err);
                    });
                } else {
                    return resolve([]);
                }

            });

        });

    }

    /**
     * Sends a simulator action request to queue.
     * @param {JSON} body - simulator action body.
     */
    _queueBulkSimulatorActions(requests, index) {
        const _self = this;
        return new Promise((resolve, reject) => {

            if (index < requests.length) {
                let _body = {
                    action: 'hydrate',
                    userId: requests[index].PutRequest.Item.userId,
                    id: requests[index].PutRequest.Item.id,
                    type: requests[index].PutRequest.Item.category
                };

                let sqsParams = {
                    QueueUrl: process.env.SIMULATOR_QUEUE,
                    MessageBody: JSON.stringify(_body)
                };

                let sqs = new AWS.SQS();
                sqs.sendMessage(sqsParams, function(err, resp) {
                    if (err) {
                        Logger.error(Logger.levels.INFO, err);
                        Logger.error(Logger.levels.INFO, `Error occurred while attempting to send action request to simulator queue.`);
                    } else {
                        Logger.log(Logger.levels.INFO, `Simualtor action ${JSON.stringify(sqsParams)} successfully queued.`);
                    }

                    index++;
                    _self._queueBulkSimulatorActions(requests, index).then((data) => {
                        resolve(data);
                    }).catch((err) => {
                        return reject(err);
                    });

                });
            } else {
                resolve(`Simulator successfully queued ${requests.length} hydrate actions.`);
            }
        });
    }

    /**
     * Sends a simulator action request to queue.
     * @param {JSON} body - simulator action body.
     */
    _queueSimulatorAction(body) {
        const _self = this;
        return new Promise((resolve, reject) => {

            let sqsParams = {
                QueueUrl: process.env.SIMULATOR_QUEUE,
                MessageBody: JSON.stringify(body)
            };

            let sqs = new AWS.SQS();
            sqs.sendMessage(sqsParams, function(err, resp) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject(`Error occurred while attempting to send action request to simulator queue.`);
                }

                resolve(`Simualtor action ${JSON.stringify(sqsParams)} successfully queued.`);
            });
        });
    }

    /**
     * Builds default metadata for defined device types.
     * @param {string} metadata - currently defined metadata.
     * @param {string} deviceTypeId - device type id to check for default metadata.
     */
    _generateDefaultMetadata(metadata, deviceTypeId) {
        let _metadata = JSON.parse(JSON.stringify(metadata));;
        if (deviceTypeId === 'automotive') {
            let _vin = randomstring.generate({
                length: 17,
                charset: 'abcdefghijklmnopqrstuvwxyz0123456789',
                capitalization: 'uppercase'
            });
            _metadata['vin'] = _vin;
            _metadata['route'] = 'N/A';
        }

        return _metadata;
    }

    /**
     * Retrieves app configuration settings.
     */
    _getConfigInfo() {

        return new Promise((resolve, reject) => {

            let params = {
                TableName: process.env.SETTINGS_TBL,
                Key: {
                    settingId: 'app-config'
                }
            };

            const docClient = new AWS.DynamoDB.DocumentClient(this.dynamoConfig);
            docClient.get(params, function(err, resp) {
                if (err) {
                    Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve application settings.');
                    Logger.error(Logger.levels.INFO, err.message);
                    throw err;
                }

                resolve(resp);
            });

        });

    }

}

module.exports = DeviceManager;