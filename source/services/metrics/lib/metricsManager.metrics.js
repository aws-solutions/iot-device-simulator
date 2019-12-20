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


/**
 * Performs metrics actions for a user, such as, retrieving user metrics information for simulations.
 *
 * @class MetricsManager
 */
class MetricsManager {

    /**
     * @class MetricsManager
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
     * Get aggregate metrics information for the user on simulations.
     * @param {JSON} ticket - authorization ticket.
     */
    getMetrics(ticket) {

        const _self = this;
        return new Promise((resolve, reject) => {

            const params = {
                TableName: process.env.METRICS_TBL,
                Key: {
                    userId: ticket.userid
                }
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.get(params, function (err, data) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject({
                        code: 500,
                        error: 'MetricsRetrievalFailure',
                        message: `Error occurred while attempting to retrieve the metrics for user ${ticket.userid}.`
                    });
                }

                if (!_.isEmpty(data)) {
                    return resolve(data.Item);
                } else {
                    // no metrics record, baseline the metrics record.
                    _self._baselineMetricsRecord(ticket).then((metric) => {
                        resolve(metric);
                    }).catch((err) => {
                        Logger.error(Logger.levels.INFO, `Error occurred while attempting to baseline metrics for user ${ticket.userid}.`);
                        reject(err);
                    });
                }
            });
        });
    }


    _baselineMetricsRecord(ticket) {

        const _self = this;
        return new Promise((resolve, reject) => {

            let _metric = {
                createdAt: moment().utc().format(),
                deviceBreakdown: {
                    id: moment().format('YYYYMM'),
                    simulations: []
                },
                monthlyRuns: [{
                    auto: 0,
                    generic: 0,
                    id: moment().format('YYYYMM'),
                    month: moment().format('MMM'),
                    runs: 0
                }, {
                    auto: 0,
                    generic: 0,
                    id: moment().subtract(1, 'month').format('YYYYMM'),
                    month: moment().subtract(1, 'month').format('MMM'),
                    runs: 0
                }],
                totalDuration: 0,
                totalRuns: 0,
                userId: ticket.userid,
                updatedAt: moment().utc().format()
            };

            let params = {
                TableName: process.env.METRICS_TBL,
                Item: _metric
            };

            let docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            docClient.put(params, function (err, data) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    return reject({
                        code: 500,
                        error: 'MetricsBaselineFailure',
                        message: `Error occurred while attempting to create baseline metrics for user ${ticket.userid}.`
                    });
                }

                resolve(_metric);
            });

        });

    }

}

module.exports = MetricsManager;