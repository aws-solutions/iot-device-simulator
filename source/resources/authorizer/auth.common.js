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
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const request = require('request');
const jwkToPem = require('jwk-to-pem');
const _ = require('underscore');
const Base64 = require('js-base64').Base64;
const crypto = require('crypto');
const url = require('url');
const moment = require('moment');
let pems = '';

/**
 * Constructs claim ticket for inbound request to manage authorization for application.
 *
 * @class Auth
 */
class Auth {

    /**
     * @class Auth
     * @constructor
     */
    constructor() { }

    /**
     * Control logic for validating if the user represented in the request Auth header has the
     * appropriate role to perform the requested operation. Additionally, it downloads JWKs for
     * deconstruction of JWT from the data lake Amazon Cognito user pool
     * @param {string} authorizationToken - Authorization token from request header.
     */
    static getUserClaimTicket(authorizationToken) {

        return new Promise((resolve, reject) => {
            let _self = this;
            this._getUserPoolConfigInfo().then((poolinfo) => {

                let iss = 'https://cognito-idp.' + process.env.AWS_REGION + '.amazonaws.com/' + poolinfo;

                Logger.log(Logger.levels.INFO, 'Processing UI token for generation of user claim ticket.');
                if (!pems) {
                    //Download the JWKs and save it as PEM
                    request({
                        url: iss + '/.well-known/jwks.json',
                        json: true
                    }, function (error, response, body) {
                        if (!error && response.statusCode === 200) {
                            pems = {};
                            let keys = body['keys'];
                            for (let i = 0; i < keys.length; i++) {
                                //Convert each key to PEM
                                let keyId = keys[i].kid;
                                let modulus = keys[i].n;
                                let exponent = keys[i].e;
                                let keyType = keys[i].kty;
                                let jwk = {
                                    kty: keyType,
                                    n: modulus,
                                    e: exponent
                                };
                                let pem = jwkToPem(jwk);
                                pems[keyId] = pem;
                            }

                            //Now continue with validating the token
                            _self._validateToken(authorizationToken, poolinfo, iss).then((ticket) => {
                                resolve(ticket);
                            }).catch((err) => {
                                Logger.error(1, err.message);
                                Logger.error(1, 'Error occurred while validating authorization token to generate claim ticket.');
                                reject(err);
                            });
                        } else {
                            //Unable to download JWKs, fail the call
                            return cb('Unable to download JWKs', null);
                        }
                    });
                } else {
                    //PEMs are already downloaded, continue with validating the token
                    _self._validateToken(authorizationToken, poolinfo, iss).then((ticket) => {
                        resolve(ticket);
                    }).catch((err) => {
                        Logger.error(1, err.message);
                        Logger.error(1, 'Error occurred while validating authorization token to generate claim ticket.');
                        reject(err);
                    });
                }
            }).catch((err) => {
                Logger.error(Logger.levels.INFO, err.message);
                Logger.error(Logger.levels.INFO, 'Error occurred while attempting to retrieve user pool config info.');
                reject(err);
            });

        });

    };

    /**
     * Validates the user represented in the request Auth header token has the
     * appropriate role to perform the requested operation. The token processed by this function
     * is from the data lake GUI represented by the Amazon Cognito JWT provided by an authenticated
     * user
     * @param {string} authorizationToken - Authorization token from request header.
     */
    static _validateToken(authorizationToken, userPoolId, iss) {

        return new Promise((resolve, reject) => {
            let _self = this;
            let _ticket = {
                auth_status: 'Unauthorized token',
                auth_status_reason: '',
                user: {}
            };

            let token = authorizationToken;

            //Fail if the token is not jwt
            let decodedJwt = jwt.decode(authorizationToken, {
                complete: true
            });

            if (!decodedJwt) {
                _ticket.auth_status_reason = 'Not a valid JWT token';
                Logger.error(Logger.levels.INFO, JSON.stringify(_ticket));
                throw new Error('Invalid JWT token decoded when validating authorization token.');
            }

            //Fail if token is not from your UserPool
            if (decodedJwt.payload.iss != iss) {
                _ticket.auth_status_reason = 'invalid issuer';
                Logger.error(Logger.levels.INFO, JSON.stringify(_ticket));
                throw new Error('Invalid issuer identified for decoded JWT token when validating authorization token.');
            }

            //Reject the jwt if it's not an 'Id Token'
            if (decodedJwt.payload.token_use != 'id') {
                _ticket.auth_status_reason = 'Not an id token';
                Logger.error(Logger.levels.INFO, JSON.stringify(_ticket));
                throw new Error('Decoded token not identified as an Id Token when validating authorization token.');
            }

            //Get the kid from the token and retrieve corresponding PEM
            let kid = decodedJwt.header.kid;
            let pem = pems[kid];
            if (!pem) {
                _ticket.auth_status_reason = 'Invalid access token';
                Logger.error(Logger.levels.INFO, JSON.stringify(_ticket));
                throw new Error('Invalid access token identified when validating authorization token.');
            }

            //Verify the signature of the JWT token to ensure it's really coming from your User Pool
            jwt.verify(token, pem, {
                issuer: iss
            }, function (err, payload) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    throw new Error('Unable to verify the signature of the JWT token to ensure it was generated from application User Pool');
                } else {
                    // Generate the claim ticket for the user.
                    _self._generateClaimTicket(decodedJwt.payload['cognito:username'], _ticket, userPoolId).then((ticket) => {
                        resolve(ticket);
                    }).catch((err) => {
                        Logger.error(1, err.message);
                        Logger.error(1, 'Error occurred while attempting to generate the user\'s claim ticket.');
                        throw err;
                    });
                }
            });

        });
    }

    /**
     * Retrieves a user from the data lake Amazon Cognito user pool and validates that thier assigned
     * role is authorized to perform the requested operation.
     * @param {array} authorizedRoles - Roles authorized to perform the requested operation.
     * @param {string} username - Username of Amazon Cognito user to check role.
     * @param {JSON} ticket - Data lake authorization ticket.
     */
    static _generateClaimTicket(username, ticket, userPoolId) {

        return new Promise((resolve, reject) => {
            // get the user from cognito
            this._getUserFromCognito(username, userPoolId).then((user) => {
                ticket.auth_status = 'validated';
                ticket.auth_status_reason = 'User is a valid entity of the user pool directory';
                ticket.userid = user.user_id;
                ticket.user_enabled = user.enabled;
                ticket.groups = user.groups;
                resolve(ticket);
            }).catch((err) => {
                Logger.error(1, err.message);
                Logger.error(1, 'Error occurred while attempting to retrieve user from Cognito.');
                throw err;
            });

        });

    }

    /**
     * Helper function to retrieve user account from the data lake Amazon Cognito user pool.
     * @param {string} userid - Username of the user to retr from the data lake Amazon Cognito user pool.
     */
    static _getUserFromCognito(userid, userPoolId) {

        return new Promise((resolve, reject) => {

            let params = {
                UserPoolId: userPoolId,
                Username: userid
            };

            let cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
            cognitoidentityserviceprovider.adminGetUser(params, function (err, data) {
                if (err) {
                    Logger.error(1, err.message);
                    Logger.error(1, 'Error occurred while attempting to retrieve user from user pool.');
                    throw err;
                }

                let _user = {
                    user_id: data.Username,
                    sub: '',
                    enabled: data.Enabled,
                    groups: []
                };

                let _sub = _.where(data.UserAttributes, {
                    Name: 'sub'
                });
                if (_sub.length > 0) {
                    _user.sub = _sub[0].Value;
                }

                cognitoidentityserviceprovider.adminListGroupsForUser(params, function (err, data) {
                    if (err) {
                        Logger.error(1, err.message);
                        Logger.error(1, 'Error occurred while attempting to retrieve user\'s groups from user pool.');
                        throw err;
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
     * Helper function to retrieve user pool configuration setting from
     * Amazon DynamoDB.
     */
    static _getUserPoolConfigInfo() {
        Logger.log(Logger.levels.INFO, 'Retrieving app-config information...');
        return new Promise((resolve, reject) => {
            let creds = new AWS.EnvironmentCredentials('AWS'); // Lambda provided credentials
            const docClient = new AWS.DynamoDB.DocumentClient({
                credentials: this.creds,
                region: process.env.AWS_REGION
            });
            let params = {
                TableName: process.env.SETTINGS_TBL,
                Key: {
                    settingId: 'app-config'
                }
            };
            console.log(params)
            docClient.get(params, function (err, config) {
                if (err) {
                    Logger.error(Logger.levels.INFO, err);
                    throw new Error('Error retrieving app configuration settings [ddb].');
                }

                if (!_.isEmpty(config)) {
                    resolve(config.Item.setting.idp);
                    return;
                } else {
                    throw new Error('No valid IDP app configuration data available.');
                }
            });
        });
    }
}

module.exports = Auth;