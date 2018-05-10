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
const generatePassword = require('password-generator');


/**
 * Performs CRUD operations for users interfacing primiarly with the
 * Amazon Cogntio user pool.
 *
 * @class User
 */
class User {

    /**
     * @class User
     * @constructor
     */
    constructor() {
        this.MAX_PASSWORD_LENGTH = 18;
        this.MIN_PASSWORD_LENGTH = 12;
        this.creds = new AWS.EnvironmentCredentials('AWS'); // Lambda provided credentials
        this.dynamoConfig = {
            credentials: this.creds,
            region: process.env.AWS_REGION
        };
    }

    /**
     * Retrieves users from Amazon Cognito user pool .
     */
    getUsers() {

        return new Promise((resolve, reject) => {
            this._getUserPoolConfigInfo().then((poolinfo) => {

                let params = {
                    UserPoolId: poolinfo,
                    AttributesToGet: [
                        'email',
                        'nickname'
                    ],
                    Filter: '',
                    Limit: 0
                };

                let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
                cognitoidentityserviceprovider.listUsers(params, function(err, data) {
                    if (err) {
                        Logger.error(Logger.levels.INFO, err.message);
                        reject({
                            code: 500,
                            error: 'ListUsersFailure',
                            message: `Error occurred while attempting to list users int the user pool.`
                        });
                    }

                    let _users = [];
                    if (!_.isEmpty(data.Users)) {
                        for (let i = 0; i < data.Users.length; i++) {
                            let _user = {
                                user_id: data.Users[i].Username,
                                name: '',
                                email: '',
                                enabled: data.Users[i].Enabled,
                                status: data.Users[i].UserStatus
                            };

                            let _nm = _.where(data.Users[i].Attributes, {
                                Name: 'nickname'
                            });

                            if (_nm.length > 0) {
                                _user.name = _nm[0].Value;
                            }

                            let _em = _.where(data.Users[i].Attributes, {
                                Name: 'email'
                            });
                            if (_em.length > 0) {
                                _user.email = _em[0].Value;
                            }

                            _users.push(_user);
                        }
                    }

                    resolve(_users);
                });

            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err.message);
                Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve user pool config info.');
                reject(err);
            });

        });

    }

    /**
     * Disables a user account in the Amazon Cognito user pool.
     * @param {integer} userId - Username of account to disable in user pool.
     */
    disableUser(userId) {

        return new Promise((resolve, reject) => {

            this._getUserPoolConfigInfo().then((poolinfo) => {

                let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

                let params = {
                    UserPoolId: poolinfo,
                    Username: userId
                };
                cognitoidentityserviceprovider.adminDisableUser(params, function(err, data) {
                    if (err) {
                        Logger.error(Logger.levels.INFO, err.message);
                        Logger.error(Logger.levels.INFO, 'Error occurred while attempting to disable a user.');
                        throw err;
                    }

                    resolve(data);
                });

            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err.message);
                Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve user pool config info.');
                reject(err);
            });
        });

    };

    /**
     * Enables a user account in the Amazon Cognito user pool.
     * @param {integer} userId - Username of account to enable in user pool.
     */
    enableUser(userId) {

        return new Promise((resolve, reject) => {

            this._getUserPoolConfigInfo().then((poolinfo) => {

                let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

                let params = {
                    UserPoolId: poolinfo,
                    Username: userId
                };
                cognitoidentityserviceprovider.adminEnableUser(params, function(err, data) {
                    if (err) {
                        Logger.error(Logger.levels.INFO, err.message);
                        Logger.error(Logger.levels.INFO, 'Error occurred while attempting to enable a user.');
                        throw err;
                    }

                    resolve(data);
                });

            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err.message);
                Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve user pool config info.');
                reject(err);
            });
        });

    };

    /**
     * Deletes a user account from the Amazon Cognito user pool.
     * @param {integer} userId - Username of account to delete from the user pool.
     */
    deleteUser(userId) {

        return new Promise((resolve, reject) => {

            this._getUserPoolConfigInfo().then((poolinfo) => {

                let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

                let params = {
                    UserPoolId: poolinfo,
                    Username: userId
                };

                cognitoidentityserviceprovider.adminDeleteUser(params, function(err, data) {
                    if (err) {
                        Logger.error(Logger.levels.INFO, err.message);
                        Logger.error(Logger.levels.INFO, 'Error occurred while attempting to delete a user.');
                        throw err;
                    }

                    resolve(data);
                });

            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err.message);
                Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve user pool config info.');
                reject(err);
            });
        });

    };

    /**
     * Update the role for a user account in the Amazon Cognito user pool.
     * @param {integer} userId - Username of account to update in the user pool.
     * @param {JSON} user - User object with updated data.
     */
    updateUser(userId, user) {

        let _self = this;

        return new Promise((resolve, reject) => {

            this._getUserPoolConfigInfo().then((poolinfo) => {
                _self.setUserGroups(poolinfo, userId, user.groups, 0).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    Logger.error(Logger.levels.INFO, 'Error occurred while attempting to update the users groups.');
                    Logger.error(Logger.levels.INFO, err.message);
                    throw err;
                });
            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err.message);
                Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve user pool config info.');
                reject(err);
            });
        });
    };

    /**
     * Creates a user account in Amazon Cognito user pool and send invitation to user.
     * @param {JSON} invitation - Invitation object with user information to create invite.
     */
    createInvitation(invitation) {

        let _self = this;

        return new Promise((resolve, reject) => {
            this._getUserPoolConfigInfo().then((poolinfo) => {

                let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

                let _invitation = JSON.parse(invitation);
                var _password = this._generatedSecurePassword();
                var _username = _invitation.email.replace('@', '_').replace(/\./g, '_');

                let params = {
                    UserPoolId: poolinfo,
                    Username: _username,
                    DesiredDeliveryMediums: ['EMAIL'],
                    ForceAliasCreation: true,
                    TemporaryPassword: _password,
                    UserAttributes: [{
                        Name: 'email',
                        Value: _invitation.email
                    }, {
                        Name: 'email_verified',
                        Value: 'true'
                    }, {
                        Name: 'nickname',
                        Value: _invitation.name
                    }]
                };

                cognitoidentityserviceprovider.adminCreateUser(params, function(err, data) {
                    if (err) {
                        Logger.error(Logger.levels.INFO, err.message);
                        throw err;
                    }

                    _self.setUserGroups(poolinfo, _username, _invitation.groups, 0).then((result) => {
                        resolve(data)
                    }).catch((err) => {
                        Logger.error(Logger.levels.INFO, err.message);
                        throw err;
                    });

                });

            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err.message);
                Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve user pool config info.');
                reject(err);
            });

        });

    };

    /**
     * Retrieves a user account from the Amazon Cognito user pool.
     * @param {integer} userId - Username of account to retrieve from the user pool.
     */
    getUser(userId) {

        return new Promise((resolve, reject) => {

            this._getUserPoolConfigInfo().then((poolinfo) => {

                let params = {
                    UserPoolId: poolinfo,
                    Username: userId
                };

                let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
                cognitoidentityserviceprovider.adminGetUser(params, function(err, data) {
                    if (err) {
                        Logger.error(Logger.levels.INFO, 'Error occurred while attempting to get user.');
                        Logger.error(Logger.levels.INFO, err.message);
                        throw err;
                    }

                    let _user = {
                        user_id: data.Username,
                        name: '',
                        email: '',
                        groups: [],
                        enabled: data.Enabled,
                        created_at: data.UserCreateDate,
                        updated_at: data.UserLastModifiedDate
                    };
                    let _nm = _.where(data.UserAttributes, {
                        Name: 'nickname'
                    });
                    if (_nm.length > 0) {
                        _user.name = _nm[0].Value;
                    }

                    let _em = _.where(data.UserAttributes, {
                        Name: 'email'
                    });
                    if (_em.length > 0) {
                        _user.email = _em[0].Value;
                    }

                    let grpparams = {
                        UserPoolId: poolinfo
                    };

                    cognitoidentityserviceprovider.adminListGroupsForUser(params, function(err, grps) {
                        if (err) {
                            Logger.error(Logger.levels.INFO, 'Error occurred while attempting to list groups for user.');
                            Logger.error(Logger.levels.INFO, err.message);
                            throw err;
                        }

                        for (let i = 0; i < grps.Groups.length; i++) {
                            _user.groups.push({
                                name: grps.Groups[i].GroupName
                            });
                        }

                        resolve(_user);
                    });

                });
            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err.message);
                Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve user pool config info.');
                reject(err);
            });

        });

    };

    /**
     * List groups available in the Amazon Cognito user pool.
     */
    listGroups() {
        return new Promise((resolve, reject) => {

            this._getUserPoolConfigInfo().then((poolinfo) => {

                let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

                let params = {
                    UserPoolId: poolinfo
                };
                cognitoidentityserviceprovider.listGroups(params, function(err, data) {
                    if (err) {
                        Logger.error(Logger.levels.INFO, 'Error occurred while attempting to get cognito groups.');
                        Logger.error(Logger.levels.INFO, err.message);
                        throw err;
                    }

                    resolve(data.Groups);
                });

            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err.message);
                Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve user pool config info.');
                reject(err);
            });
        });

    };

    /**
     * Helper function to add user to a user pool group.
     * @param {string} poolinfo - Id of Cognito user pool.
     * @param {string} username - Username of congito user entity.
     * @param {Array<JSON>} groups - Array of group JSON objects.
     * @param {int} index - Current item index.
     */
    setUserGroups(poolinfo, username, groups, index) {

        let _self = this;

        return new Promise((resolve, reject) => {
            if (index < groups.length) {
                var params = {
                    GroupName: groups[index].name,
                    UserPoolId: poolinfo,
                    Username: username
                };
                let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

                if (groups[index]._state === 'new') {
                    cognitoidentityserviceprovider.adminAddUserToGroup(params, function(err, data) {
                        if (err) {
                            Logger.error(Logger.levels.INFO, err.message);
                            throw err;
                        }

                        index++;
                        _self.setUserGroups(poolinfo, username, groups, index).then((result) => {
                            resolve(result)
                        }).catch((err) => {
                            Logger.error(Logger.levels.INFO, err.message);
                            throw err;
                        });
                    });
                } else if (groups[index]._state === 'deleted') {
                    cognitoidentityserviceprovider.adminRemoveUserFromGroup(params, function(err, data) {
                        if (err) {
                            Logger.error(Logger.levels.INFO, err.message);
                            throw err;
                        }

                        index++;
                        _self.setUserGroups(poolinfo, username, groups, index).then((result) => {
                            resolve(result)
                        }).catch((err) => {
                            Logger.error(Logger.levels.INFO, err.message);
                            throw err;
                        });
                    });
                } else {
                    index++;
                    _self.setUserGroups(poolinfo, username, groups, index).then((result) => {
                        resolve(result)
                    }).catch((err) => {
                        Logger.error(Logger.levels.INFO, err.message);
                        throw err;
                    });
                }

            } else {
                resolve('group modifications complete');
            }

        });

    };

    /**
     * Helper function to retrieve user pool configuration setting from
     * Amazon DynamoDB.
     */
    _getUserPoolConfigInfo() {
        Logger.log(Logger.levels.DEBUG, 'Retrieving app-config information...');
        return new Promise((resolve, reject) => {
            let params = {
                TableName: process.env.SETTINGS_TBL,
                Key: {
                    settingId: 'app-config'
                }
            };

            const docClient = new AWS.DynamoDB.DocumentClient(this.dynamoConfig);
            docClient.get(params, function(err, config) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    reject({
                        code: 500,
                        error: 'SettingRetrievalFailure',
                        message: `Error occurred while attempting to retrieve the user pool info from 'app-config' setting.`
                    })
                }

                if (!_.isEmpty(config)) {
                    resolve(config.Item.setting.idp);
                } else {
                    return reject({
                        code: 401,
                        error: 'MissingIdpSetting',
                        message: 'No valid IDP app configuration data available.'
                    });
                }
            });
        });
    };

    /**
     * Helper function to validate that a generated password is strong.
     * @param {string} password - Password to validate.
     */
    _isStrongEnough(password) {
        const uppercaseMinCount = 1;
        const lowercaseMinCount = 1;
        const numberMinCount = 2;
        const UPPERCASE_RE = /([A-Z])/g;
        const LOWERCASE_RE = /([a-z])/g;
        const NUMBER_RE = /([\d])/g;
        const NON_REPEATING_CHAR_RE = /([\w\d\?\-])\1{2,}/g;

        let uc = password.match(UPPERCASE_RE);
        let lc = password.match(LOWERCASE_RE);
        let n = password.match(NUMBER_RE);
        let nr = password.match(NON_REPEATING_CHAR_RE);
        return password.length >= this.MIN_PASSWORD_LENGTH &&
            !nr &&
            uc && uc.length >= uppercaseMinCount &&
            lc && lc.length >= lowercaseMinCount &&
            n && n.length >= numberMinCount;
    };

    /**
     * Helper function to generated a strong password.
     */
    _generatedSecurePassword() {
        var password = '';
        var randomLength = Math.floor(Math.random() * (this.MAX_PASSWORD_LENGTH - this.MIN_PASSWORD_LENGTH)) +
            this.MIN_PASSWORD_LENGTH;
        while (!this._isStrongEnough(password)) {
            password = generatePassword(randomLength, false, /[\w\d\?\-]/);
        }

        return password;
    };

}

module.exports = User;