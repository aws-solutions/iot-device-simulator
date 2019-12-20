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

/**
 * Lib
 */
const _ = require('underscore');
const Logger = require('logger');
const Auth = require('authorizer');
const ProfileManager = require('./profileManager.profile.js');

// Logging class for orchestrating microservice responses
class ResponseManager {

    constructor() { }

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

        let _profileManager = new ProfileManager();
        let _response = {};
        let _operation = '';

        return new Promise((resolve, reject) => {
            if (event.resource === '/profile' && event.httpMethod === 'GET') {
                _operation = 'retrieve user profile information';
                Logger.log(Logger.levels.INFO, ['Attempting to', _operation].join(' '));
                _profileManager.getProfile(ticket).then((data) => {
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