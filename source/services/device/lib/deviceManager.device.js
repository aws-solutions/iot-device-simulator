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
const PAGE_SIZE = 100;


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
    getDevices(ticket, filter, page) {
        const _self = this;
        return new Promise((resolve, reject) => {

            let _page = parseInt(page);
            if (isNaN(_page)) {
                _page = 0;
            }

            let _collatedResults = {
                page: 0,
                count: 0,
                items: []
            };

            Logger.log(Logger.levels.INFO, `Attempting to list devices for user ${ticket.userid}, page ${page}, filter: ${filter}`);

            let _filter = {};
            if (filter) {
                _filter = JSON.parse(filter);
            }
            //_self._getDevicePage(ticket, _filter, null, 0, _page).then((devices) => {
            _self._getDevicePage(ticket, _filter, null, _page, _collatedResults).then((devices) => {
                // console.log(devices)
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
    getDeviceStats(ticket, filter) {
        const _self = this;
        return new Promise((resolve, reject) => {
            Logger.log(Logger.levels.INFO, `Attempting to retrieve device stats for user ${ticket.userid}, filter: ${filter}`);

            let _filter = {};
            if (filter) {
                _filter = JSON.parse(filter);
            }
            _self._getDeviceStats(ticket, _filter, null).then((data) => {
                data.total = data.provisioning + data.hydrated + data.sleeping + data.stopping;
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
    getDeviceStatsBySubCategory(ticket, filter) {
        const _self = this;
        return new Promise((resolve, reject) => {
            _self._getDeviceStatsBySubCategory(ticket, filter, null).then((data) => {
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

            if (request.count > 100) {
                return reject({
                    code: 400,
                    error: 'DeviceCreateLimitExceeded',
                    message: 'Exceeded limit of 100 concurrent device creations per request.'
                });
            }

            _self._getDeviceType(ticket, request.typeId).then((dtype) => {
                _self._bulkCreateDevices(ticket, request, dtype, 0).then((data) => {
                    return resolve(data);
                }).catch((err) => {
                    return reject(err);
                });
            }).catch((err) => {
                return reject(err);
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
     * Updates multiple devices for user.
     * @param {JSON} ticket - authentication ticket
     * @param {array} devices - array of devices to update
     */
    bulkUpdateDevices(ticket, devices) {
        const _self = this;
        return new Promise((resolve, reject) => {
            let _cnt = 0;
            let _errs = 0;
            devices.forEach(device => {
                Logger.log(Logger.levels.INFO, `Attempting to update device ${device.id}`);
                _self.updateDevice(ticket, device.id, device).then((data) => {
                    _cnt++;
                    if (_cnt === devices.length) {
                        return resolve({
                            updated: devices.length - _errs,
                            errors: _errs
                        });
                    }
                }).catch((err) => {
                    _cnt++;
                    _errs++;
                    Logger.error(Logger.levels.INFO, err.message);
                    if (_cnt === devices.length) {
                        return resolve({
                            updated: devices.length - _errs,
                            errors: _errs
                        });
                    }
                });
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

                    if (newDevice.hasOwnProperty('operation')) {
                        let _body = {
                            action: newDevice.operation,
                            userId: ticket.userid,
                            id: deviceId,
                            type: device.Item.category
                        };

                        if (newDevice.operation === 'hydrate' && device.Item.stage === 'sleeping') {
                            device.Item.stage = 'hydrated';

                            // _updateParams.Item.stage = 'provisioning';
                            _self._queueSimulatorAction(_body).then((resp) => {
                                Logger.log(Logger.levels.INFO, resp);
                                _self._saveDevice(device.Item).then((resp) => {
                                    return resolve(device.Item);
                                }).catch((err) => {
                                    Logger.error(Logger.levels.INFO, err);
                                    return reject({
                                        code: 500,
                                        error: 'DeviceUpdateFailure',
                                        message: `Error occurred while attempting to update device ${deviceId} for user ${ticket.userid}.`
                                    });
                                });
                            }).catch((err) => {
                                Logger.error(Logger.levels.INFO, err);
                                return reject(err);
                            });
                        } else {
                            if (newDevice.operation === 'stop' && device.Item.stage === 'hydrated') {
                                device.Item.stage = 'stopping';
                            }

                            _self._saveDevice(device.Item).then((resp) => {
                                return resolve(device.Item);
                            }).catch((err) => {
                                Logger.error(Logger.levels.INFO, err);
                                return reject({
                                    code: 500,
                                    error: 'DeviceUpdateFailure',
                                    message: `Error occurred while attempting to update device ${deviceId} for user ${ticket.userid}.`
                                });
                            });                            
                        }
                    } else {
                        _self._saveDevice(device.Item).then((resp) => {
                            return resolve(device.Item);
                        }).catch((err) => {
                            Logger.error(Logger.levels.INFO, err);
                            return reject({
                                code: 500,
                                error: 'DeviceUpdateFailure',
                                message: `Error occurred while attempting to update device ${deviceId} for user ${ticket.userid}.`
                            });
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

    _saveDevice(device) {
        const _self = this;
        return new Promise((resolve, reject) => {
            let _params = {
                TableName: process.env.DEVICES_TBL,
                Item: device
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.put(_params, function(err, data) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject({
                        code: 500,
                        error: 'DeviceSaveFailure',
                        message: `Error occurred while attempting to save device ${deviceId}.`
                    });
                } else {
                    resolve(data);
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
                            docClient.scan(params, function(err, sharedData) {
                                if (err) {
                                    Logger.error(Logger.levels.INFO, err);
                                    return reject({
                                        code: 500,
                                        error: 'DeviceTypeRetrieveFailure',
                                        message: `Error occurred while attempting to search for shared device type ${deviceTypeId}.`
                                    });
                                }

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
    }

    /**
     * Get device statistics for the user.
     * @param {JSON} ticket - authorization ticket.
     * @param {string} filter - filter of devices to get stats on
     * @param {string} lastevalkey - a serializable JavaScript object representing last evaluated key
     */
    _getDeviceStats(ticket, filter, lastevalkey) {

        const _self = this;
        return new Promise((resolve, reject) => {

            let _filter = '';
            let _keyfilter = 'userId = :uid';
            let _expression = {
                ':uid': ticket.userid
            };

            if (filter) {
                if (filter.category) {
                    _keyfilter += ' and category = :category';
                    _expression[':category'] = filter.category;
                }

                if (filter.subCategory) {
                    _filter += 'subCategory = :subCategory';
                    _expression[':subCategory'] = filter.subCategory;
                }

                if (filter.stage) {
                    if (_filter.length > 0) {
                        _filter += ' and ';
                    }
                    _filter += 'stage = :stage';
                    _expression[':stage'] = filter.stage;
                }

                if (filter.deviceId) {
                    if (_filter.length > 0) {
                        _filter += ' and ';
                    }
                    _filter += 'id = :deviceId';
                    _expression[':deviceId'] = filter.deviceId;
                }
            }

            const params = {
                TableName: process.env.DEVICES_TBL,
                IndexName: 'userId-category-index',
                KeyConditionExpression: _keyfilter,
                ExpressionAttributeValues: _expression,
                ProjectionExpression: 'userId, id, category, subCategory, typeId, stage',
                Limit: 100
            };

            if (_filter.length > 0) {
                params.FilterExpression = _filter;
            }

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

                if (!_status.hasOwnProperty('stopping')) {
                    _status.stopping = 0;
                }

                if (result.LastEvaluatedKey) {
                    _self._getDeviceStats(ticket, filter, result.LastEvaluatedKey).then((data) => {
                        _status.provisioning = _status.provisioning + data.provisioning;
                        _status.hydrated = _status.hydrated + data.hydrated;
                        _status.sleeping = _status.sleeping + data.sleeping;
                        _status.stopping = _status.stopping + data.stopping;

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
     * @param {string} filter - filter of devices to get stats on
     * @param {string} lastevalkey - a serializable JavaScript object representing last evaluated key
     */
    _getDeviceStatsBySubCategory(ticket, filter, lastevalkey) {

        const _self = this;
        return new Promise((resolve, reject) => {
            let _filter = 'userId = :uid';
            let _expression = {
                ':uid': ticket.userid
            };

            if (filter.category) {
                _filter += ' and category = :category';
                _expression[':category'] = filter.category;
            }

            let params = {
                TableName: process.env.DEVICES_TBL,
                IndexName: 'userId-category-index',
                KeyConditionExpression: _filter,
                ExpressionAttributeValues: _expression,
                ProjectionExpression: 'userId, id, category, subCategory, typeId, stage',
                Limit: 100
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
                    _self._getDeviceStatsBySubCategory(ticket, filter, result.LastEvaluatedKey).then((data) => {
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
    _getDevicePage(ticket, filter, lastevalkey, targetpage, collatedResults) {
            const _self = this;
        return new Promise((resolve, reject) => {

            let _filter = '';
            let _keyfilter = 'userId = :uid';
            let _expression = {
                ':uid': ticket.userid
            };

            if (filter) {
                if (filter.category) {
                    _keyfilter += ' and category = :category';
                    _expression[':category'] = filter.category;
                }

                if (filter.subCategory) {
                    _filter += 'subCategory = :subCategory';
                    _expression[':subCategory'] = filter.subCategory;
                }

                if (filter.stage) {
                    if (_filter.length > 0) {
                        _filter += ' and ';
                    }
                    _filter += 'stage = :stage';
                    _expression[':stage'] = filter.stage;
                }

                if (filter.deviceId) {
                    if (_filter.length > 0) {
                        _filter += ' and ';
                    }
                    _filter += 'id = :deviceId';
                    _expression[':deviceId'] = filter.deviceId;
                }
            }

            let params = {
                TableName: process.env.DEVICES_TBL,
                IndexName: 'userId-category-index',
                KeyConditionExpression: _keyfilter,
                ExpressionAttributeValues: _expression,
                Limit: 100
            };

            if (_filter.length > 0) {
                params.FilterExpression = _filter;
            }

            if (lastevalkey) {
                params.ExclusiveStartKey = lastevalkey;
            }

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.query(params, function(err, result) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject(`Error occurred while attempting to retrieve page ${targetpage} from devices.`);
                }

                let _collatedResults = _self._collatePage(result.Items, collatedResults, targetpage); 
                if (_collatedResults.page === targetpage && _collatedResults.count === PAGE_SIZE) {
                    Logger.log(Logger.levels.INFO, `Collating results page.  results count: ${_collatedResults.count}, result page: ${_collatedResults.page}, result items count: ${_collatedResults.items.length}`);
                    return resolve(_collatedResults.items);
                } else {
                    if (result.LastEvaluatedKey) {
                        _self._getDevicePage(ticket, filter, result.LastEvaluatedKey, targetpage, _collatedResults).then((data) => {
                            return resolve(data);
                        }).catch((err) => {
                            return reject(err);
                        });
                    } else {
                        Logger.log(Logger.levels.INFO, `Collating results page.  results count: ${_collatedResults.count}, result page: ${_collatedResults.page}, result items count: ${_collatedResults.items.length}`);
                        return resolve(_collatedResults.items);
                    }
                }

            });

        });

    }

    _collatePage(items, collatedResults, targetPage) {
        const _pageSize = 100;
        let _results = {
            page: 0,
            count: 0,
            items: []
        };

        if (items.length > 0) {
            const _pageItemsNeeded = PAGE_SIZE - collatedResults.count;
            // console.log(_pageItemsNeeded)
            // console.log(`current page: ${collatedResults.page}, target page: ${targetPage}`)
            if (collatedResults.page !== targetPage) {
                // console.log(`collatedResults.page !== targetPage, items length: ${items.length}, _pageItemsNeeded: ${_pageItemsNeeded}`)
                if (items.length >= _pageItemsNeeded) {
                    // flip page and update count
                    _results.page = collatedResults.page + 1;
                    _results.count = items.length - _pageItemsNeeded;
                    // console.log(`updated results count: ${_results.count}, updated page: ${_results.page}`)
                    if (_results.page === targetPage) {
                        _results.items = items.slice(_pageItemsNeeded + 1);
                    }
                } else {
                    _results.page = collatedResults.page;
                    _results.count += items.length;
                }
            } else if (collatedResults.page === targetPage) {
                // console.log(`collatedResults.page === targetPage, items length: ${items.length}, _pageItemsNeeded: ${_pageItemsNeeded}`)
                // console.log(JSON.stringify(collatedResults));
                if (items.length > _pageItemsNeeded) {
                    let _slicedItems = items.slice(0, _pageItemsNeeded);
                    _results.items = [
                        ...collatedResults.items,
                        ..._slicedItems
                    ];
                } else {
                    _results.items = [
                        ...collatedResults.items,
                        ...items
                    ];
                }
                _results.page = collatedResults.page;
                _results.count = _results.items.length;
            }
        } else {
            _results = {
                ...collatedResults
            }
        }

        Logger.log(Logger.levels.INFO, `Collating results page.  updated results count: ${_results.count}, updated page: ${_results.page}, item count: ${_results.items.length}`);
        return _results;

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
     * Creates devices 25 at a time.
     * @param {JSON} ticket - user ticket.
     * @param {JSON} request - creation request.
     * @param {JSON} dtype - device type template for device creation.
     */
    _bulkCreateDevices(ticket, request, dtype, index) {
        const _self = this;
        return new Promise((resolve, reject) => {
            let _count = 0;
            if (index < request.count) {
                let _requestItems = [];

                for (let i = 0; i < request.count; i++) {
                    if (_count >= 25 || (index >= request.count)) {
                        break;
                    }
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
                    index++;
                    _count++;
                }

                let params = {
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
                        _self._bulkCreateDevices(ticket, request, dtype, index).then((createResp) => {
                            _count =  _count + createResp.processedItems
                            resolve({
                                processedItems: _count
                            });
                        }).catch((err) => {
                            return reject(err);
                        });
                    }).catch((err) => {
                        return reject(err);
                    });

                });
            } else {
                resolve({
                    processedItems: _count,
                    desc: `Simulator attempt to create ${request.count} devices complete.`
                });
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