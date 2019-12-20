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

const util = require('../util');
const AWS = require('aws-sdk');
const _ = require('underscore');

// Logging class for sending messages to console log
class Engine {

    constructor(options) {
        this.options = options;
        this.pollerInterval = null;
        this.moduleIndex = new require('../modules')(this.options);
        this.modules = this.moduleIndex.asArray;
        this.dynamoConfig = {
            region: process.env.AWS_REGION
        };
    }

    start() {
        let _self = this;
        this.options.logger.log('Starting simulator engine..', this.options.logger.levels.INFO);
        this.options.logger.log(['simulation engine: polling device queue every', this.options.queuePollerInterval, 'ms'].join(' '), this.options.logger.levels.INFO);
        this._prepModules(0).then((result) => {
            _self.options.logger.log(result, _self.options.logger.levels.INFO);
            this.pollerInterval = setInterval(function () {
                _self._processQueue();
            }, this.options.queuePollerInterval);
        }).catch((err) => {
            _self.options.logger.log(err, _self.options.logger.levels.ROBUST);
        });;

    }

    _prepModules(index) {
        const _self = this;
        return new Promise((resolve, reject) => {
            if (index < _self.modules.length) {
                _self.modules[index].prepModule().then((result) => {
                    _self.options.logger.log(result, _self.options.logger.levels.INFO);
                    index++;
                    _self._prepModules(index).then((res) => {
                        resolve(res);
                    }).catch((err) => {
                        reject(err);
                    });
                }).catch((err) => {
                    reject(err);
                });
            } else {
                resolve('Completed preparation of all simulation engine modules.');
            }
        });
    }

    _processQueue() {
        this.options.logger.debug('simulation engine: processing device queue', this.options.logger.levels.DEBUG);

        var _self = this;
        var sqs = new AWS.SQS({
            region: this.options.region
        });
        var params = {
            QueueUrl: this.options.deviceQueueUrl,
            AttributeNames: [
                'All',
            ],
            MaxNumberOfMessages: 10,
            MessageAttributeNames: [
                'All'
            ],
            WaitTimeSeconds: 10
        };
        sqs.receiveMessage(params, function (err, data) {
            if (err) {
                _self.options.logger.log([err, err.stack].join('\n'), _self.options.logger.levels.INFO);
            } else {
                if (data.Messages) {
                    _self.options.logger.debug(['Processing items in device queue: ', data.Messages.length].join(''), _self.options.logger.levels.DEBUG);
                    _self._processQueueItems(data.Messages, 0).then((result) => {
                        _self.options.logger.log(result, _self.options.logger.levels.INFO);
                    }).catch((err) => {
                        _self.options.logger.error(err, _self.options.logger.levels.INFO);
                    });
                } else {
                    _self.options.logger.debug('No messages in device queue to process...', _self.options.logger.levels.DEBUG);
                }
            }
        });
    }

    /**
     * Process queue item to crate, hydrate or delete.
     */
    _processQueueItems(items, index) {
        const _self = this;
        return new Promise((resolve, reject) => {
            if (index < items.length) {
                this.options.logger.log(['Simulation engine queue: number of items:', items.length, ', current index:', index].join(' '), this.options.logger.levels.INFO);
                let _messageBody = JSON.parse(items[index].Body);
                this.options.logger.log(['Processing device queue message:', items[index].MessageId].join(' '), this.options.logger.levels.INFO);
                // this.options.logger.log(_messageBody, this.options.logger.levels.ROBUST);

                // verify hydrating this request will not exceed hard concurrency limit
                if (_messageBody.action === 'hydrate') {
                    this._isLimitExceeded().then((limitCheck) => {
                        if (limitCheck) {
                            _self._routeMessage(_messageBody);
                            _self._deleteQueueMessage(items[index].ReceiptHandle).then((data) => {
                                index++;
                                _self._processQueueItems(items, index).then((data) => {
                                    resolve(data);
                                });
                            });
                        } else {
                            index++;
                            _self._processQueueItems(items, index).then((data) => {
                                resolve(data);
                            });
                        }
                    });
                } else {
                    this._routeMessage(_messageBody);
                    this._deleteQueueMessage(items[index].ReceiptHandle).then((data) => {
                        index++;
                        this._processQueueItems(items, index).then((data) => {
                            resolve(data);
                        });
                    });
                }
            } else {
                resolve('Batch of queue items processed...');
            }
        });

    }

    _routeMessage(messageBody) {
        if (messageBody.type) {
            if (messageBody.type === 'automotive') {
                this.options.logger.log('Processing automotive message.', this.options.logger.levels.ROBUST);
                this.moduleIndex.byId['automotive'].process(messageBody);
            } else if (messageBody.type === 'custom widget') {
                this.options.logger.log('Processing general widget message.', this.options.logger.levels.ROBUST);
                this.moduleIndex.byId['widget'].process(messageBody);
            } else {
                this.options.logger.error('Bad message type recieved. Deleting message from queue.', this.options.logger.levels.INFO);
            }
        } else {
            this.options.logger.error('Bad message format recieved. Deleting message from queue.', this.options.logger.levels.INFO);
        }
    }

    /**
     * Delete vehicle queue message item.
     */
    _deleteQueueMessage(receiptHandle) {
        const _self = this;
        return new Promise((resolve, reject) => {

            var sqs = new AWS.SQS({
                region: this.options.region
            });
            var params = {
                QueueUrl: this.options.deviceQueueUrl,
                ReceiptHandle: receiptHandle
            };
            sqs.deleteMessage(params, function (err, data) {
                if (err) {
                    _self.options.logger.log([err, err.stack].join('\n'), _self.options.logger.levels.INFO);
                    _self.options.logger.log(['[Error] Failed to delete message from queue:', receiptHandle].join(' '), _self.options.logger.levels.INFO);
                }

                resolve('message processed for deletion');
            });
        });
    }

    /**
     * Check to see if the concurrent simulation limit is exceeded.
     */
    _isLimitExceeded() {
        let _self = this;
        return new Promise((resolve, reject) => {

            const params = {
                TableName: this.options.settingsTable,
                Key: {
                    settingId: 'current-sims'
                }
            };

            const docClient = new AWS.DynamoDB.DocumentClient(this.dynamoConfig);
            docClient.get(params, function (err, config) {
                if (err) {
                    _self.options.logger.error(err);
                    _self.options.logger.error(`Unable to load configuration entry current-sims from ${_self.options.settingsTable} ddb table. Holding hydration requests.`, _self.options.logger.levels.INFO);
                    resolve(false);
                } else {
                    let _check = false;
                    if (!_.isEmpty(config)) {
                        if (config.Item.setting < _self.options.simLimit) {
                            _check = true;
                        } else {
                            _self.options.logger.log(`The concurrent count of running simulations ${config.Item.setting} exeeds is at the maximum limit. Holding hydration requests.`, _self.options.logger.levels.INFO);
                        }
                    } else {
                        _self.options.logger.log(`The configuration entry current-sims from ${_self.options.settingsTable} ddb table does not exist. . Holding hydration requests.`, _self.options.logger.levels.INFO);
                    }

                    resolve(_check);
                }
            });
        });
    }


};

module.exports = Engine;