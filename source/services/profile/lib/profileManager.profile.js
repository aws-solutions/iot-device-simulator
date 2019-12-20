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
 * Performs profile actions for a user, such as, retrieving and updating user profile information.
 *
 * @class ProfileManager
 */
class ProfileManager {

    /**
     * @class ProfileManager
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
     * Get profile information for the user stored outside of cognitio user pool.
     * @param {JSON} ticket - authorization ticket.
     */
    getProfile(ticket) {

        return new Promise((resolve, reject) => {

            this._getConfigInfo().then((config) => {
                this._getUserFromCognito(ticket.userid, config.Item.setting.idp).then((user) => {
                    user.mapboxToken = _.has(config.Item.setting, 'mapboxToken') ? config.Item.setting.mapboxToken : '';
                    resolve(user);
                }).catch((err) => {
                    Logger.error(Logger.levels.INFO, err.message);
                    Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve user from cognito.');
                    reject(err);
                });
            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err.message);
                Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve config info.');
                reject(err);
            });
        });
    }

    /**
     * Helper function to retrieve user account from the Amazon Cognito user pool.
     * @param {string} userid - Username of the user to retr from the Amazon Cognito user pool.
     * @param {string} userPoolId - Unique id for the Amazon Cognito user pool.
     */
    _getUserFromCognito(userid, userPoolId) {

        return new Promise((resolve, reject) => {

            Logger.log(Logger.levels.ROBUST, ['Attempting to get user', userid, 'from pool', userPoolId].join(' '));

            let params = {
                UserPoolId: userPoolId,
                Username: userid
            };

            let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
            cognitoidentityserviceprovider.adminGetUser(params, function (err, data) {
                if (err) {
                    Logger.error(Logger.levels.INFO, 'Error occurred while attempting to get user from cognito.');
                    Logger.error(Logger.levels.INFO, err.message);
                    reject({
                        code: 500,
                        error: 'UserRetrievalFailure',
                        message: `Error occurred while attempting to retrieve user ${userid} from pool.`
                    });
                }

                let _user = {
                    user_id: data.Username,
                    email: '',
                    name: '',
                    enabled: data.Enabled,
                    groups: []
                };

                var _dn = _.where(data.UserAttributes, {
                    Name: 'nickname'
                });

                if (_dn.length > 0) {
                    _user.name = _dn[0].Value;
                }

                var _em = _.where(data.UserAttributes, {
                    Name: 'email'
                });

                if (_em.length > 0) {
                    _user.email = _em[0].Value;
                }

                cognitoidentityserviceprovider.adminListGroupsForUser(params, function (err, data) {
                    if (err) {
                        Logger.error(Logger.levels.INFO, 'Error occurred while attempting to list groups for user from cognito.');
                        Logger.error(Logger.levels.INFO, err.message);
                        reject({
                            code: 500,
                            error: 'UserGroupsRetrievalFailure',
                            message: `Error occurred while attempting to retrieve user ${userid} groups from pool.`
                        });
                    }

                    for (let i = 0; i < data.Groups.length; i++) {
                        _user.groups.push(data.Groups[i].GroupName);
                    }

                    resolve(_user);
                });
            });
        });
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
            docClient.get(params, function (err, resp) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err.message);
                    reject({
                        code: 500,
                        error: 'SettingRetrieveFailure',
                        message: 'Error occurred while attempting to retrieve application settings.'
                    });
                }

                if (!_.isEmpty(resp)) {
                    resolve(resp);
                } else {
                    return reject({
                        code: 401,
                        error: 'MissingSetting',
                        message: `The configuration setting for 'app-config' does not exist.`
                    });
                }
            });

        });

    };

}

module.exports = ProfileManager;