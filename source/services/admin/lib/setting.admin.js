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
 * Performs CRUD operations for settings interfacing primiarly with the
 * Amazon DynamoDB settings table.
 *
 * @class Setting
 */
class Setting {

    /**
     * @class Setting
     * @constructor
     */
    constructor() {
        this.creds = new AWS.EnvironmentCredentials('AWS'); // Lambda provided credentials
        this.dynamoConfig = {
            credentials: this.creds,
            region: process.env.AWS_REGION
        };
        this.ddbTable = process.env.SETTINGS_TBL;
    }

    /**
     * Retrieves app configuration settings.
     */
    getAppSettings(settingId) {

        return new Promise((resolve, reject) => {

            let params = {
                TableName: this.ddbTable,
                Key: {
                    settingId: settingId
                }
            };

            const docClient = new AWS.DynamoDB.DocumentClient(this.dynamoConfig);
            docClient.get(params, function (err, data) {
                if (err) {
                    Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve application settings.');
                    Logger.error(Logger.levels.INFO, err.message);
                    return reject({
                        code: 500,
                        error: 'SettingRetrievalFailure',
                        message: `Error occurred while attempting to retrieve the setting ${settingId}.`
                    });
                }

                if (!_.isEmpty(data)) {
                    return resolve(data.Item);
                } else {
                    return reject({
                        code: 401,
                        error: 'MissingSetting',
                        message: `The setting ${settingId} does not exist.`
                    });
                }
            });

        });

    };

    /**
     * Updates the app configuration settings.
     * @param {JSON} config - Updated configuation settings object.
     */
    updateAppSettings(setting) {

        let _self = this;

        return new Promise((resolve, reject) => {

            let params = {
                TableName: _self.ddbTable,
                Key: {
                    settingId: setting.settingId
                }
            };

            const docClient = new AWS.DynamoDB.DocumentClient(_self.dynamoConfig);
            // get the current app-config settings
            docClient.get(params, function (err, resp) {
                if (err) {
                    Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve the application settings.');
                    Logger.error(Logger.levels.INFO, err.message);
                    reject({
                        code: 500,
                        error: 'SettingRetrieveFailure',
                        message: `Error occurred while attempting to retrieve setting ${setting.settingId} to update.`
                    });
                }

                // only update the manifest expiration period
                if (!_.isEmpty(resp)) {

                    resp.Item.setting = setting.setting;
                    resp.Item.updated_at = moment.utc().format();
                    let params = {
                        TableName: _self.ddbTable,
                        Item: resp.Item
                    };

                    docClient.put(params, function (err, data) {
                        if (err) {
                            Logger.error(Logger.levels.INFO, 'Error occurred while attempting to update the application settings.');
                            Logger.error(Logger.levels.INFO, err.message);
                            reject({
                                code: 500,
                                error: 'SettingUpdateFailure',
                                message: `Error occurred while attempting to update setting ${setting.settingId}.`
                            });
                        }

                        resolve(resp.Item);
                    });
                } else {
                    reject({
                        code: 400,
                        error: 'MissingSetting',
                        message: `The requested setting ${setting.settingId} does not exist.`
                    });
                }
            });

        });
    };


}

module.exports = Setting;