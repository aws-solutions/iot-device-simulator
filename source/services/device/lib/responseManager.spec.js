'use strict';

const sinon = require('sinon');
const assert = require('chai').assert;
const expect = require('chai').expect;
const path = require('path');
const AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

const ResponseManager = require('./responseManager.device.js');
const DeviceTypeManager = require('./deviceTypeManager.device.js');
const DeviceManager = require('./deviceManager.device.js');
const Auth = require('authorizer');

let sandbox;

describe('ResponseManager', function() {

    const _optionsEvent = {
        httpMethod: 'OPTIONS'
    };

    const _invalidAuth = {
        message: 'Error occurred while validating authorization token to generate claim ticket.'
    };

    const _ticket = {
        auth_status: 'authorized',
        userid: 'test_user'
    };

    describe('#respond', function() {

        beforeEach(function() {
            sandbox = sinon.createSandbox();
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should return pre-flight response with OPTIONS request', function(done) {

            ResponseManager.respond(_optionsEvent).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                        'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'
                    },
                    body: JSON.stringify({})
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information with invalid authorization', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz'
                }
            };

            sandbox.stub(Auth, 'getUserClaimTicket').rejects(_invalidAuth);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 401,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'AccessDeniedException',
                        message: _invalidAuth.message
                    })
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information with invalid api request path', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/invalidpath'
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'InvalidAction',
                        message: `Invalid path request ${_event.resource}, ${_event.httpMethod}`
                    })
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device type getDeviceTypes response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/types',
                queryStringParameters: {
                    op: 'list'
                }
            };

            const _resp = {
                Items: ['types']
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'getDeviceTypes').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device type getDeviceTypes error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/types',
                queryStringParameters: {
                    op: 'list'
                }
            };

            const _resp = {
                code: 500,
                error: 'DeviceTypeRetrievalFailure',
                message: `Error occurred while attempting to retrieve device types page 0 for user ${_ticket.userid}.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'getDeviceTypes').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device type getDeviceTypeStats response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/types',
                queryStringParameters: {
                    op: 'stats'
                }
            };

            const _resp = {
                total: 1
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'getDeviceTypeStats').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device type getDeviceTypeStats error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/types',
                queryStringParameters: {
                    op: 'stats'
                }
            };

            const _resp = {
                code: 500,
                error: 'DeviceTypeStatsRetrievalFailure',
                message: `Error occurred while attempting to retrieve device type stats for user ${_ticket.userid}.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'getDeviceTypeStats').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device type createDeviceType response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'POST',
                resource: '/devices/types'
            };

            const _resp = {};

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'createDeviceType').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device type createDeviceType error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'POST',
                resource: '/devices/types'
            };

            const _resp = {
                code: 500,
                error: 'DeviceTypeCreateFailure',
                message: `Error occurred while attempting to create device type for user ${_ticket.userid}.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'createDeviceType').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device type getDeviceType response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/types/123',
                pathParameters: {
                    typeid: '123'
                }
            };

            const _resp = {
                id: '123'
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'getDeviceType').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device type getDeviceType error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/types/123',
                pathParameters: {
                    typeid: '123'
                }
            };

            const _resp = {
                code: 400,
                error: 'MissingDeviceType',
                message: `The device type 123 for user ${_ticket.userid} does not exist.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'getDeviceType').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device type deleteDeviceType response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'DELETE',
                resource: '/devices/types/123',
                pathParameters: {
                    typeid: '123'
                }
            };

            const _resp = {};

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'deleteDeviceType').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device type deleteDeviceType error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'DELETE',
                resource: '/devices/types/123',
                pathParameters: {
                    typeid: '123'
                }
            };

            const _resp = {
                code: 500,
                error: 'DeviceTypeDeleteFailure',
                message: `Error occurred while attempting to delete device type 123 for user ${_ticket.userid}.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'deleteDeviceType').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device type updateDeviceType response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/devices/types/123',
                pathParameters: {
                    typeid: '123'
                }
            };

            const _resp = {
                custom: true
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'updateDeviceType').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device type updateDeviceType error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/devices/types/123',
                pathParameters: {
                    typeid: '123'
                }
            };

            const _resp = {
                code: 500,
                error: 'DeviceTypeUpdateFailure',
                message: `Error occurred while attempting to update device type 123 for user ${_ticket.userid}.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceTypeManager.prototype, 'updateDeviceType').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device getDevices response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/widgets',
                queryStringParameters: {
                    op: 'list'
                }
            };

            const _resp = {
                Items: []
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'getDevices').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device getDevices error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/widgets',
                queryStringParameters: {
                    op: 'list'
                }
            };

            const _resp = {
                code: 500,
                error: 'DevicRetrievalFailure',
                message: `Error occurred while attempting to retrieve page 0 from devices.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'getDevices').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device getDeviceStats response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/widgets',
                queryStringParameters: {
                    op: 'stats'
                }
            };

            const _resp = {
                total: 1
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'getDeviceStats').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device getDeviceStats error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/widgets',
                queryStringParameters: {
                    op: 'stats'
                }
            };

            const _resp = {
                code: 500,
                error: 'DeviceStatsRetrievalFailure',
                message: `Error occurred while attempting to retrieve stats for ${process.env.DEVICES_TBL}.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'getDeviceStats').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device getDeviceStatsBySubCategory response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/widgets',
                queryStringParameters: {
                    op: 'catstats'
                }
            };

            const _resp = {
                total: 1
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'getDeviceStatsBySubCategory').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device getDeviceStatsBySubCategory error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/widgets',
                queryStringParameters: {
                    op: 'catstats'
                }
            };

            const _resp = {
                code: 500,
                error: 'DeviceStatsSubCatRetrievalFailure',
                message: `Error occurred while attempting to retrieve stats by subCategory for ${process.env.DEVICES_TBL}.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'getDeviceStatsBySubCategory').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });


        it('should return 200 response with valid api request path and successful library device createDevice response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'POST',
                resource: '/devices/widgets'
            };

            const _resp = {};

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'createDevice').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device createDevice error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'POST',
                resource: '/devices/widgets'
            };

            const _resp = {
                code: 500,
                error: 'DeviceBatchCreateFailure',
                message: `Error occurred while attempting to batch create devices for user ${_ticket.userid}.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'createDevice').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device getDevice response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/widgets/123',
                pathParameters: {
                    deviceid: '123'
                }
            };

            const _resp = {
                id: '123'
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'getDevice').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device getDevice error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/devices/widgets/123',
                pathParameters: {
                    deviceid: '123'
                }
            };

            const _resp = {
                code: 400,
                error: 'MissingDevice',
                message: `The device 123 for user ${_ticket.userid} does not exist.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'getDevice').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device deleteDevice response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'DELETE',
                resource: '/devices/widgets/123',
                pathParameters: {
                    deviceid: '123'
                }
            };

            const _resp = {};

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'deleteDevice').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device deleteDevice error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'DELETE',
                resource: '/devices/widgets/123',
                pathParameters: {
                    deviceid: '123'
                }
            };

            const _resp = {
                code: 500,
                error: 'DeviceDeleteFailure',
                message: `Error occurred while attempting to delete device 123 for user ${_ticket.userid}.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'deleteDevice').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library device type updateDevice response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/devices/types/123',
                pathParameters: {
                    deviceid: '123'
                }
            };

            const _resp = {
                custom: true
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'updateDevice').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library device type updateDevice error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/devices/types/123',
                pathParameters: {
                    deviceid: '123'
                }
            };

            const _resp = {
                code: 500,
                error: 'DeviceUpdateFailure',
                message: `Error occurred while attempting to update device type 123 for user ${_ticket.userid}.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(DeviceManager.prototype, 'updateDevice').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });


    });

});