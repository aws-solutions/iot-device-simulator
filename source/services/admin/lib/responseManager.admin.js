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

/**
 * Lib
 */
const _ = require('underscore');
const Logger = require('logger');
const Auth = require('authorizer');
const User = require('./user.admin.js');
const Setting = require('./setting.admin.js');

// Logging class for orchestrating microservice responses
class ResponseManager {

    constructor() {}

    static respond(event) {
        return new Promise((resolve, reject) => {
            let _response = '';
            if (event.httpMethod === 'OPTIONS') {
                let _response = {
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                        'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'
                    },
                    body: JSON.stringify({})
                };
                resolve(_response);
            } else {
                Auth.getUserClaimTicket(event.headers.Authorization).then((ticket) => {
                    this._processRequest(event, ticket).then((data) => {
                        resolve(data);
                    }).catch(err => {
                        resolve(err);
                    });
                }).catch(err => {
                    _response = this._buildOutput(401, {
                        error: 'AccessDeniedException',
                        message: err.message
                    });
                    resolve(_response);
                });
            }
        });
    }

    /**
     * Routes the request to the appropriate logic based on the request resource and method.
     * @param {JSON} event - Request event.
     * @param {JSON} ticket - authorization ticket.
     */
    static _processRequest(event, ticket) {

        let INVALID_PATH_ERR = {
            error: 'InvalidAction',
            message: `Invalid path request ${event.resource}, ${event.httpMethod}`
        };

        let INVALID_OP_ERR = {
            error: 'InvalidOperation',
            message: `Invalid operation requested ${event.resource}, ${event.httpMethod}`
        };


        let isAdmin = _.contains(ticket.groups, 'Administrators');

        let _user = new User();
        let _setting = new Setting();
        let _response = {};
        let _operation = '';
        let _body = {};
        if (event.body) {
            _body = JSON.parse(event.body);
        }

        return new Promise((resolve, reject) => {

            if (event.resource === '/admin/invitations' && event.httpMethod === 'POST' && isAdmin) {
                _operation = 'create invitation for a new user';
                Logger.log(Logger.levels.INFO, ['Attempting to', _operation].join(' '));
                _user.createInvitation(event.body).then((data) => {
                    resolve(this._processResponse(200, data, _operation));
                }).catch((err) => {
                    reject(this._processResponse(err.code, err, _operation));
                });
            } else if (event.resource === '/admin/groups' && event.httpMethod === 'GET' && isAdmin) {
                _operation = 'list groups';
                Logger.log(Logger.levels.INFO, ['Attempting to', _operation].join(' '));
                _user.listGroups().then((data) => {
                    resolve(this._processResponse(200, data, _operation));
                }).catch((err) => {
                    reject(this._processResponse(err.code, err, _operation));
                });
            } else if (event.resource.startsWith('/admin/users') && isAdmin) {
                if (_.isEmpty(event.pathParameters) && event.httpMethod === 'GET') {
                    _operation = 'list users';
                    Logger.log(Logger.levels.INFO, ['Attempting to', _operation].join(' '));
                    _user.getUsers().then((data) => {
                        resolve(this._processResponse(200, data, _operation));
                    }).catch((err) => {
                        reject(this._processResponse(err.code, err, _operation));
                    });
                } else if (!(_.isEmpty(event.pathParameters)) && event.pathParameters.hasOwnProperty('user_id') && event.httpMethod === 'GET') {
                    _operation = ['retrieve user', event.pathParameters.user_id].join(' ');
                    Logger.log(Logger.levels.INFO, ['Attempting to', _operation].join(' '));
                    _user.getUser(event.pathParameters.user_id).then((data) => {
                        resolve(this._processResponse(200, data, _operation));
                    }).catch((err) => {
                        reject(this._processResponse(500, err, _operation));
                    });
                } else if (!(_.isEmpty(event.pathParameters)) && event.pathParameters.hasOwnProperty('user_id') && event.httpMethod === 'DELETE') {
                    _operation = ['delete user', event.pathParameters.user_id].join(' ');
                    Logger.log(Logger.levels.INFO, ['Attempting to', _operation].join(' '));
                    _user.deleteUser(event.pathParameters.user_id).then((data) => {
                        resolve(this._processResponse(200, data, _operation));
                    }).catch((err) => {
                        reject(this._processResponse(err.code, err, _operation));
                    });
                } else if (!(_.isEmpty(event.pathParameters)) && event.pathParameters.hasOwnProperty('user_id') && event.httpMethod === 'PUT') {
                    let _body = JSON.parse(event.body);
                    if (_body.operation === 'update') {
                        _operation = ['update user', event.pathParameters.user_id].join(' ');
                        Logger.log(Logger.levels.INFO, ['Attempting to', _operation].join(' '));
                        _user.updateUser(event.pathParameters.user_id, _body.user).then((data) => {
                            resolve(this._processResponse(200, data, _operation));
                        }).catch((err) => {
                            reject(this._processResponse(err.code, err, _operation));
                        });
                    } else if (_body.operation === 'disable') {
                        _operation = ['disable user', event.pathParameters.user_id].join(' ');
                        Logger.log(Logger.levels.INFO, ['Attempting to', _operation].join(' '));
                        _user.disableUser(event.pathParameters.user_id).then((data) => {
                            resolve(this._processResponse(200, data, _operation));
                        }).catch((err) => {
                            reject(this._processResponse(err.code, err, _operation));
                        });
                    } else if (_body.operation === 'enable') {
                        _operation = ['enable user', event.pathParameters.user_id].join(' ');
                        Logger.log(Logger.levels.INFO, ['Attempting to', _operation].join(' '));
                        _user.enableUser(event.pathParameters.user_id).then((data) => {
                            resolve(this._processResponse(200, data, _operation));
                        }).catch((err) => {
                            reject(this._processResponse(err.code, err, _operation));
                        });
                    } else {
                        _response = this._buildOutput(401, INVALID_OP_ERR);
                        resolve(_response);
                    }
                } else {
                    _response = this._buildOutput(401, INVALID_OP_ERR);
                    resolve(_response);
                }
            } else if (event.resource === '/admin/settings' && event.httpMethod === 'GET' && isAdmin) {
                _operation = `list ${event.queryStringParameters.id} settings`;
                Logger.log(Logger.levels.INFO, ['Attempting to', _operation].join(' '));
                _setting.getAppSettings(event.queryStringParameters.id).then((data) => {
                    resolve(this._processResponse(200, data, _operation));
                }).catch((err) => {
                    reject(this._processResponse(err.code, err, _operation));
                });
            } else if (event.resource === '/admin/settings' && event.httpMethod === 'PUT' && isAdmin) {
                _operation = 'update configuration settings';
                Logger.log(Logger.levels.INFO, ['Attempting to', _operation].join(' '));
                _setting.updateAppSettings(_body).then((data) => {
                    resolve(this._processResponse(200, data, _operation));
                }).catch((err) => {
                    reject(this._processResponse(err.code, err, _operation));
                });
            } else {
                _response = this._buildOutput(400, INVALID_PATH_ERR);
                resolve(_response);
            }

        });

    };

    /**
     * Process operation response and log the access/result.
     * @param {JSON} code - Http code to return from operation.
     * @param {JSON} response - Data returned from operation.
     * @param {JSON} operation - Description of operation executed.
     */
    static _processResponse(code, response, operation) {
        let _response = {};

        Logger.log(Logger.levels.ROBUST, [operation, response].join(': '));
        _response = this._buildOutput(code, response);
        return _response;

    };

    /**
     * Constructs the appropriate HTTP response.
     * @param {integer} statusCode - HTTP status code for the response.
     * @param {JSON} data - Result body to return in the response.
     */
    static _buildOutput(statusCode, data) {

        let _response = {
            statusCode: statusCode,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data)
        };
        Logger.log(Logger.levels.ROBUST, `API response: ${JSON.stringify(_response)}`);
        return _response;
    };

}

module.exports = ResponseManager;