// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';
const mockAWS = require('aws-sdk');
const { nanoid } = require('nanoid');
const axios = require('axios');

// Mock AWS SDK
const mockDynamoDB = jest.fn();
const mockStepFunctions = jest.fn();

jest.mock('nanoid');
jest.mock('axios');
axios.post.mockResolvedValue('success');
nanoid.mockImplementation((x) => "123");
process.env.SIMULATIONS_TBL = "simTable";
process.env.DEVICE_TYPES_TBL = "dtypeTable";
process.env.AWS_REGION = 'us-east-1';
process.env.SOLUTION_ID = 'test';
process.env.VERSION = "3.0.0";
process.env.UUID = 'qwerty';
process.env.SEND_ANONYMOUS_METRIC = 'Yes';

mockAWS.StepFunctions = jest.fn(() => ({
    startExecution: mockStepFunctions
}));
mockAWS.DynamoDB.DocumentClient = jest.fn(() => ({
    scan: mockDynamoDB,
    delete: mockDynamoDB,
    update: mockDynamoDB,
    get: mockDynamoDB,
    put: mockDynamoDB,
    batchGet: mockDynamoDB
}));

const ResponseManager = require('./responseManager.js');

let event = {
    httpMethod: 'OPTIONS'
};

let validResponse = {
    statusCode: 200,
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'
    },
    body: JSON.stringify({})
};

const error = { code: 500, error: "error", message: "ERROR" };
const errorResponse = {
    statusCode: 500,
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'
    },
    body: JSON.stringify(error)
};

let deviceType = {
    typeId: "",
    name: "abc",
    topic: "topic/1",
    payload: [{ a: "1", type: "string" }, { b: "2", type: "string" }],
};

let simulation = {
    simId: "",
    name: "abc",
    devices: [{ typeId: "123", name: "abc", amount: 1 }, { typeId: "456", name: "xyz", amount: 3 }],
    interval: 2,
    duration: 60
};

const METRICS_ENDPOINT = 'https://metrics.awssolutionsbuilder.com/generic';
const config = {
    headers: { 'Content-Type': 'application/json' }
};
let metricData = {
    Solution: process.env.SOLUTION_ID,
    Version: process.env.VERSION,
    UUID: process.env.UUID,
    TimeStamp: new Date("2020-05-13T12:33:37Z").toISOString().replace('T', ' ').replace('Z', '')
};

describe('ResponseManager', function () {
    beforeEach(() => {
        mockDynamoDB.mockReset();
        mockStepFunctions.mockReset();
        axios.post.mockReset();
        jest.useFakeTimers().setSystemTime(new Date("2020-05-13T12:33:37Z"));
    });

    it('should return pre-flight response with OPTIONS request', async () => {
        const response = await ResponseManager.respond(event);
        expect(response).toEqual(validResponse);
    })
    it('should return 200 response on get request to/devicetypes with operation list', async () => {
        event.httpMethod = "GET";
        event.resource = "/devicetypes";
        event.queryStringParameters = {};
        event.queryStringParameters.op = "list";
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Items: ["1", "2", "3"] });
                }
            };
        });
        const response = await ResponseManager.respond(event);
        validResponse.body = JSON.stringify(["1", "2", "3"]);
        expect(response).toEqual(validResponse);
    })
    it('should return 200 response on get request to/devicetypes with operation list and DDB reutrns evalKey', async () => {
        event.httpMethod = "GET";
        event.resource = "/devicetypes";
        event.queryStringParameters = {};
        event.queryStringParameters.op = "list";
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({
                        Items: ["1", "2", "3"],
                        LastEvaluatedKey: { someKey: "someValue" }
                    });
                }
            };
        });
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({
                        Items: ["4", "5", "6"],
                        LastEvaluatedKey: {}
                    });
                }
            };
        });
        const response = await ResponseManager.respond(event);
        validResponse.body = JSON.stringify(["1", "2", "3", "4", "5", "6"]);
        expect(mockDynamoDB).toHaveBeenCalledTimes(2);
        expect(response).toEqual(validResponse);
    })
    it('should return error response on DDB error in get request to /devicetypes with operation list', async () => {
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });
        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it('should return deviceType on successful POST request to /devicetypes', async () => {
        const date = "2020-05-13T12:33:37.000Z";
        event.httpMethod = "POST";
        event.body = JSON.stringify(deviceType);
        metricData.Data = {
            eventType: 'create device type',
            uniquePayloadAttrs: ['string']
        };
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Items: ["1", "2", "3"] });
                }
            };
        });

        const response = await ResponseManager.respond(event);
        validResponse.body = JSON.stringify({ ...deviceType, typeId: "123", createdAt: date, updatedAt: date });
        expect(axios.post).toHaveBeenCalledWith(METRICS_ENDPOINT, JSON.stringify(metricData), config);
        expect(response).toEqual(validResponse);
    })
    it('should return error on POST request to /devicetypes with DDB failure ', async () => {
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it('should return success on DELETE request to /devicetypes/{typeid}', async () => {
        event.httpMethod = 'DELETE';
        event.resource = "/devicetypes/{typeid}";
        event.pathParameters = { typeid: "123" };
        //get
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: deviceType });
                }
            };
        });
        //delete
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve("123");
                }
            };
        });
        const response = await ResponseManager.respond(event);
        validResponse.body = JSON.stringify("123");
        expect(response).toEqual(validResponse);
    })
    it('should return error on DELETE method to devicetypes/{typid} when DDB returns error', async () => {
        //get
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: deviceType });
                }
            };
        });
        //delete
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });

        const response = await ResponseManager.respond(event);

        expect(response).toEqual(errorResponse);

    })
    it('should return error on DELETE method to devicetypes/{typid} when DDB get is empty', async () => {
        const emptyError = {
            code: 400,
            error: 'MissingDeviceType',
            message: "The requested device type 123 does not exist."
        }
        //get
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        const response = await ResponseManager.respond(event);

        expect(response).toEqual({ ...errorResponse, statusCode: emptyError.code, body: JSON.stringify(emptyError) });

    })
    it("should return success on GET call to /simulation and operation list", async () => {
        event.httpMethod = "GET";
        event.resource = "/simulation";
        event.queryStringParameters.op = "list";
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Items: [simulation] });
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...validResponse, body: JSON.stringify([simulation]) });
    })
    it("should return success on GET call to /simulation and operation list when DDB returns evalKey", async () => {
        event.httpMethod = "GET";
        event.resource = "/simulation";
        event.queryStringParameters.op = "list";
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({
                        Items: [simulation],
                        LastEvaluatedKey: { item: "simId" }
                    });
                }
            };
        });
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({
                        Items: [simulation],
                        LastEvaluatedKey: {}
                    });
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(mockDynamoDB).toHaveBeenCalledTimes(2);
        expect(response).toEqual({ ...validResponse, body: JSON.stringify([simulation, simulation]) });
    })
    it("should return error on DDB failure to GET call to /simulation with opeartion list ", async () => {
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it("should return running counts on GET call to /simulation with operation 'getRunningStat'", async () => {
        simulation.stage = "running";
        event.queryStringParameters.op = "getRunningStat";
        const runningStats = JSON.stringify({ sims: 1, devices: 4 });

        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Items: [{ devices: simulation.devices }] });
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...validResponse, body: runningStats });
    })
    it("should return ddb error on GET call to /simulation with operation 'getRunningStat' when ddb failure", async () => {
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });
        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it("should return successful response on POST call to /simulation", async () => {
        event.httpMethod = "POST";
        event.body = JSON.stringify(simulation);
        metricData.Data = {
            eventType: 'create simulation',
            duration: simulation.duration,
            numDevices: 4
        };
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve("ddb response");
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(axios.post).toHaveBeenCalledWith(METRICS_ENDPOINT, JSON.stringify(metricData), config);
        expect(response).toEqual({ ...validResponse, body: JSON.stringify("ddb response") });
    })
    it("should return error if more than 100 devices on POST call to /simulation", async () => {
        simulation.devices[0].amount = 101;
        event.body = JSON.stringify(simulation);
        const exceedError = {
            code: 400,
            error: 'DeviceCreateLimitExceeded',
            message: 'Exceeded limit of 100 concurrent device creations per request.'
        }

        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...errorResponse, statusCode: exceedError.code, body: JSON.stringify(exceedError) });
    })
    it('should return error on DDB error for POST request to /simulation', async () => {
        simulation.devices[0].amount = 1;
        event.body = JSON.stringify(simulation);

        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it('should return success on PUT request to /simulation when action is start', async () => {
        event.httpMethod = 'PUT';
        event.body = JSON.stringify({ action: "start", simulations: [simulation, simulation] });
        //GET
        mockDynamoDB
            .mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Item: { simulation } });
                    }
                };
            })
            .mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.resolve({ Item: { simulation } });
                    }
                };
            });
        //startExecution
        mockStepFunctions.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve("success");
                }
            };
        });
        //PUT
        mockDynamoDB.mockImplementation(() => {
            return {
                promise() {
                    return Promise.resolve("success");
                }
            };
        });
        metricData.Data = {
            eventType: 'start simulation',
            numSimulations: 2,
            simType: 'custom'
        };

        const response = await ResponseManager.respond(event);
        expect(axios.post).toHaveBeenCalledWith(METRICS_ENDPOINT, JSON.stringify(metricData), config);
        expect(response).toEqual({ ...validResponse, body: JSON.stringify(["success", "success"]) });
    })
    it('should return error when DDB get fails on PUT request to /simulation when action is start', async () => {
        //GET
        mockDynamoDB.mockImplementation(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it('should return success response on GET request to /simulation/{simid}', async () => {
        event.httpMethod = "GET";
        event.resource = "/simulation/{simid}";
        event.pathParameters.simid = "123";

        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: "DDB SUCCESS" });
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...validResponse, body: JSON.stringify("DDB SUCCESS") });
    })
    it('should return error when simulation not found on GET request to /simulation/{simid}', async () => {
        let customError = {
            code: 400,
            error: 'MissingSimulation',
            message: `The simulation 123 does not exist.`
        };

        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({});
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...errorResponse, statusCode: customError.code, body: JSON.stringify(customError) });
    })
    it('should return error when DDB failure on GET request to /simulation/{simid}', async () => {
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it('should return success on GET request to /simulation/{simid} with operation "list dtype attributes"', async () => {
        event.queryStringParameters.op = "list dtype attributes";
        event.queryStringParameters.filter = "name";
        event.body = JSON.stringify(simulation);

        //get
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: simulation });
                }
            };
        });

        let ddbResponse = { Responses: { [process.env.DEVICE_TYPES_TBL]: ["data"] } };
        //deviceType batchGet
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve(ddbResponse);
                }
            };
        });
        let expectedData = ddbResponse.Responses[process.env.DEVICE_TYPES_TBL];
        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...validResponse, body: JSON.stringify(expectedData) });
    })
    it('should return success on GET request to /simulation/{simid} with op "list dtype attributes" when DDB returns Unprocessed Keys', async () => {
        event.queryStringParameters.op = "list dtype attributes";
        event.queryStringParameters.filter = "name";
        event.body = JSON.stringify(simulation);

        //get
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: simulation });
                }
            };
        });

        let ddbResponse = { Responses: { [process.env.DEVICE_TYPES_TBL]: ["data"] } };
        //deviceType batchGet
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({
                        ...ddbResponse,
                        UnprocessedKeys: { item: "value" }
                    });
                }
            };
        });
        //deviceType batchGet
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({
                        ...ddbResponse,
                        UnprocessedKeys: {}
                    });
                }
            };
        });
        let expectedData = ["data", "data"];
        jest.useRealTimers();
        const response = await ResponseManager.respond(event);
        //1 get and 2 batchGets
        expect(mockDynamoDB).toHaveBeenCalledTimes(3);
        expect(response).toEqual({ ...validResponse, body: JSON.stringify(expectedData) });
    })
    it('should return error if no device type on GET request to /simulation/{simid} wtih operation "list dtype attribtues"', async () => {
        //get
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: simulation });
                }
            };
        });
        let ddbResponse = { Responses: { [process.env.DEVICE_TYPES_TBL]: [] } };
        //deviceType batchGet
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve(ddbResponse);
                }
            };
        });
        const emptyError = {};
        emptyError.code = 400;
        emptyError.error = 'MissingDeviceType';
        emptyError.message = `The device types do not exist.`;
        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...errorResponse, statusCode: emptyError.code, body: JSON.stringify(emptyError) });
    })
    it('should return error when ddb error for GET request to /simulation/{simid} with op "list dtype attribtues', async () => {
        //get
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it('should return success on DELETE call to /simulation/{simid}', async () => {
        event.httpMethod = "DELETE";
        //delete
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ data: "data" });
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...validResponse, body: JSON.stringify({ data: "data" }) });
    })
    it('should return error if DDB error on DELETE request to /simulation/{simid}', async () => {
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it('should return success on PUT request to /simulation/{simid} when action is start', async () => {
        event.httpMethod = 'PUT';
        event.body = JSON.stringify({ action: "start", simulations: [simulation] });
        //GET
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: simulation });
                }
            };
        });
        //startExecution
        mockStepFunctions.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve("success");
                }
            };
        })
        //PUT
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve("success");
                }
            };
        });
        metricData.Data = {
            eventType: 'start simulation',
            numSimulations: 1,
            simType: 'custom'
        };

        const response = await ResponseManager.respond(event);

        expect(axios.post).toHaveBeenCalledWith(METRICS_ENDPOINT, JSON.stringify(metricData), config);
        expect(response).toEqual({ ...validResponse, body: JSON.stringify(["success"]) });
    })
    it('should return error when DDB get fails on PUT request to /simulation/{simid} when action is start', async () => {
        //GET
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it('should return error when startExecution fails on PUT request to /simulation/{simid} when action is start', async () => {
        //GET
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: simulation });
                }
            };
        });
        //startExecution
        mockStepFunctions.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        })

        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it('should return error when DDB put fails on PUT request to /simulation/{simid} when action is start', async () => {
        //GET
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: simulation });
                }
            };
        });
        //startExecution
        mockStepFunctions.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve("success");
                }
            };
        })
        //PUT
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.reject(error);
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it('should return success on PUT request to /simulation/{simid} when action is stop', async () => {
        event.body = JSON.stringify({ action: "stop", simulations: [simulation] });
        //GET
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: simulation });
                }
            };
        });
        //PUT
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve("success");
                }
            };
        });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...validResponse, body: JSON.stringify(["success"]) });
    })
    it('should return error if DDB put fails on PUT request to /simulation/{simid} when action is stop', async () => {
        event.body = JSON.stringify({ action: "stop", simulations: [simulation] });
        //GET
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: simulation });
                }
            };
        })
            .mockImplementationOnce(() => {
                return {
                    promise() {
                        return Promise.reject(error);
                    }
                };
            });

        const response = await ResponseManager.respond(event);
        expect(response).toEqual(errorResponse);
    })
    it('should return error on PUT request to /simulation/{simid} when action is not valid', async () => {
        event.body = JSON.stringify({ action: "invalid", simulations: [simulation] });
        let actionError = {
            code: 400,
            error: 'InvalidAction',
            message: `Invalid action invalid`
        }
        //GET
        mockDynamoDB.mockImplementationOnce(() => {
            return {
                promise() {
                    return Promise.resolve({ Item: simulation });
                }
            };
        })
        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...errorResponse, statusCode: actionError.code, body: JSON.stringify(actionError) });
    })
    it('should return error when invalid path is provided', async () => {
        event.resource = '/invalid';
        let INVALID_PATH_ERR = {
            error: 'InvalidAction',
            message: `Invalid path request ${event.resource}, ${event.httpMethod}`
        };
        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...errorResponse, statusCode: 400, body: JSON.stringify(INVALID_PATH_ERR) });
    })
    it('should return error when invalid op provided to /devicetypes GET request', async () => {

        event.resource = '/devicetypes';
        event.httpMethod = "GET";
        event.queryStringParameters.op = "invalid"
        let INVALID_OP_ERR = {
            error: 'InvalidOperation',
            message: `Invalid operation ${event.queryStringParameters.op} made to path ${event.resource}`
        }
        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...errorResponse, statusCode: 400, body: JSON.stringify(INVALID_OP_ERR) });
    })
    it('should return error when http method for /devicetypes', async () => {
        event.httpMethod = "INVALID";
        let INVALID_REQ_ERR = {
            error: 'InvalidRequest',
            message: `Invalid http method: ${event.httpMethod} made to ${event.resource}`
        }
        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...errorResponse, statusCode: 400, body: JSON.stringify(INVALID_REQ_ERR) });
    })
    it('should return error when http mehod not supported for /devicetypes/{typid}', async () => {
        event.resource = '/devicetypes/{typeid}';
        event.httpMethod = "POST";
        let INVALID_REQ_ERR = {
            error: 'InvalidRequest',
            message: `Invalid http method: ${event.httpMethod} made to ${event.resource}`
        }
        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...errorResponse, statusCode: 400, body: JSON.stringify(INVALID_REQ_ERR) });
    })
    it('should return error when http mehod not supported for /simulation', async () => {
        event.resource = '/simulation';
        event.httpMethod = "FAKE";
        let INVALID_REQ_ERR = {
            error: 'InvalidRequest',
            message: `Invalid http method: ${event.httpMethod} made to ${event.resource}`
        }
        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...errorResponse, statusCode: 400, body: JSON.stringify(INVALID_REQ_ERR) });
    })
    it('should return error when http mehod not supported for /simulation/{simid}', async () => {
        event.resource = '/simulation/{simid}';
        event.httpMethod = "POST"
        let INVALID_REQ_ERR = {
            error: 'InvalidRequest',
            message: `Invalid http method: ${event.httpMethod} made to ${event.resource}`
        }
        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...errorResponse, statusCode: 400, body: JSON.stringify(INVALID_REQ_ERR) });
    })
    it('should return error when invalid op provided to /simulation GET request', async () => {

        event.resource = '/simulation';
        event.httpMethod = "GET";
        event.queryStringParameters.op = "invalid"
        let INVALID_OP_ERR = {
            error: 'InvalidOperation',
            message: `Invalid operation ${event.queryStringParameters.op} made to path ${event.resource}`
        }
        const response = await ResponseManager.respond(event);
        expect(response).toEqual({ ...errorResponse, statusCode: 400, body: JSON.stringify(INVALID_OP_ERR) });
    })
});