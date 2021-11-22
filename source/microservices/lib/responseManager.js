// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */
'use strict';

/**
 * Lib
 */
const DeviceTypeManager = require('./deviceTypeManager.js');
const SimulationManager = require('./simulationManager.js');

// Routes message and handles response
class ResponseManager {
    static async respond(event) {
        if (event.httpMethod === 'OPTIONS') {
            return ({
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'
                },
                body: JSON.stringify({})
            });
        } else {
            return this._processRequest(event);
        }
    }

    /**
     * Routes the request to the appropriate logic based on the request resource and method.
     * @param {object} event - Request event.
     */
    static async _processRequest(event) {
        let INVALID_PATH_ERR = {
            error: 'InvalidAction',
            message: `Invalid path request ${event.resource}, ${event.httpMethod}`
        };
        let INVALID_OP_ERR;
        if (event.queryStringParameters && event.queryStringParameters.op) {
            INVALID_OP_ERR = {
                error: 'InvalidOperation',
                message: `Invalid operation ${event.queryStringParameters.op} made to path ${event.resource}`
            };
        }
        let INVALID_REQ_ERR = {
            error: 'InvalidRequest',
            message: `Invalid http method: ${event.httpMethod} made to ${event.resource}`
        };
        let _deviceTypeManager = new DeviceTypeManager();
        let _simulationManager = new SimulationManager();
        let _operation = '';
        let _body = {};
        if (event.body) {
            _body = JSON.parse(event.body);
        }
        let data;
        if (event.resource === '/devicetypes') {
            if (event.httpMethod === 'GET') {
                if (event.queryStringParameters.op === 'list') {
                    _operation = 'retrieve device types for user';
                    console.log(['Attempting to', _operation].join(' '));
                    try {
                        data = await _deviceTypeManager.getDeviceTypes();
                        return (this._processResponse(200, data, _operation));
                    } catch (err) {
                        return (this._processResponse(err.code, err, _operation));
                    }
                } else {
                    return this._buildOutput(400, INVALID_OP_ERR);
                }
            } else if (event.httpMethod === 'POST') {
                _operation = 'create device type for user';
                console.log(['Attempting to', _operation].join(' '));
                try {
                    data = await _deviceTypeManager.createDeviceType(_body);
                    return (this._processResponse(200, data, _operation));
                } catch (err) {
                    return (this._processResponse(err.code, err, _operation));
                }
            }
            else {
                return this._buildOutput(400, INVALID_REQ_ERR);
            }
        } else if (event.resource === '/devicetypes/{typeid}') {
            if (event.httpMethod === 'DELETE') {
                _operation = ['delete device type', event.pathParameters.typeid].join(' ');
                console.log(['Attempting to', _operation].join(' '));
                try {
                    data = await _deviceTypeManager.deleteDeviceType(event.pathParameters.typeid);
                    return (this._processResponse(200, data, _operation));
                } catch (err) {
                    return (this._processResponse(err.code, err, _operation));
                }
            } else {
                return this._buildOutput(400, INVALID_REQ_ERR);
            }
        } else if (event.resource === '/simulation') {
            if (event.httpMethod === 'GET') {
                if (event.queryStringParameters.op === 'list') {
                    _operation = 'retrieve simulations';
                    console.log(['Attempting to', _operation].join(' '));
                    try {
                        data = await _simulationManager.getSimulations();
                        return (this._processResponse(200, data, _operation));
                    } catch (err) {
                        return (this._processResponse(err.code, err, _operation));
                    }
                } else if (event.queryStringParameters.op === 'getRunningStat') {
                    _operation = 'retrieve running stats';
                    console.log(['Attempting to', _operation].join(' '));
                    try {
                        data = await _simulationManager.getSimulationStats();
                        return (this._processResponse(200, data, _operation));
                    } catch (err) {
                        return (this._processResponse(err.code, err, _operation));
                    }
                } else {
                    return this._buildOutput(400, INVALID_OP_ERR);
                }
            } else if (event.httpMethod === 'POST') {
                _operation = 'create simulation for user';
                console.log(['Attempting to', _operation].join(' '));
                try {
                    data = await _simulationManager.createSimulation(_body);
                    return (this._processResponse(200, data, _operation));
                } catch (err) {
                    return (this._processResponse(err.code, err, _operation));
                }
            } else if (event.httpMethod === 'PUT') {
                _operation = 'update simulations';
                console.log(['Attempting to', _operation].join(' '));
                try {
                    data = await _simulationManager.updateSimulation(_body.action, _body.simulations);
                    return (this._processResponse(200, data, _operation));
                } catch (err) {
                    return (this._processResponse(err.code, err, _operation));
                }
            } else {
                return this._buildOutput(400, INVALID_REQ_ERR);
            }
        } else if (event.resource === '/simulation/{simid}') {
            if (event.httpMethod === 'GET') {
                _operation = ['retrieve simulation', event.pathParameters.simid].join(' ');
                console.log(['Attempting to', _operation].join(' '));
                try {
                    if (event.queryStringParameters && event.queryStringParameters.op === "list dtype attributes") {
                        const filter = event.queryStringParameters.filter;
                        data = await _simulationManager.getDeviceType(event.pathParameters.simid, filter);
                        return (this._processResponse(200, data, _operation));
                    } else {
                        data = await _simulationManager.getSimulation(event.pathParameters.simid);
                        return (this._processResponse(200, data, _operation));
                    }
                } catch (err) {
                    return (this._processResponse(err.code, err, _operation));
                }
            } else if (event.httpMethod === 'DELETE') {
                _operation = ['delete simulation', event.pathParameters.simid].join(' ');
                console.log(['Attempting to', _operation].join(' '));
                try {
                    data = await _simulationManager.deleteSimulation(event.pathParameters.simid);
                    return (this._processResponse(200, data, _operation));
                } catch (err) {
                    return (this._processResponse(err.code, err, _operation));
                }
            } else if (event.httpMethod === 'PUT') {
                _operation = ['update simulation', event.pathParameters.simid].join(' ');
                console.log(['Attempting to', _operation].join(' '));
                try {
                    data = await _simulationManager.updateSimulation(_body.action, _body.simulations);
                    return (this._processResponse(200, data, _operation));
                } catch (err) {
                    return (this._processResponse(err.code, err, _operation));
                }
            } else {
                return this._buildOutput(400, INVALID_REQ_ERR);
            }
        } else {
            return this._buildOutput(400, INVALID_PATH_ERR);
        }
    }


    /**
     * Process operation response and log the access/result.
     * @param {number} code - Http code to return from operation.
     * @param {object | string} response - Data returned from operation.
     * @param {string} operation - Description of operation executed.
     */
    static _processResponse(code, response, operation) {
        console.log([operation, JSON.stringify(response)].join(': '));
        return this._buildOutput(code, response);
    }

    /**
     * Constructs the appropriate HTTP response.
     * @param {integer} statusCode - HTTP status code for the response.
     * @param {object} data - Result body to return in the response.
     */
    static _buildOutput(statusCode, data) {

        let _response = {
            statusCode: statusCode,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'
            },
            body: JSON.stringify(data)
        };
        console.log(`API response: ${JSON.stringify(_response)}`);
        return (_response);
    }

}

module.exports = ResponseManager;