'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
var path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let DeviceManager = require('./deviceManager.device.js');

describe('DeviceManager', function() {

    const device = {
        endedAt: '2018-01-23T01:49:52Z',
        id: 'F5W2Aoz',
        metadata: {},
        userId: 'test_user_net',
        stage: 'sleeping',
        startedAt: '2018-01-23T01:48:50Z',
        subCategory: 'temperature sensor',
        category: 'custom widget',
        typeId: '8S2DzAk',
        updatedAt: '2018-01-23T01:49:52Z'
    };

    const deviceWithOp = {
        endedAt: '2018-01-23T01:49:52Z',
        id: 'F5W2Aoz',
        metadata: {},
        userId: 'test_user_net',
        stage: 'sleeping',
        startedAt: '2018-01-23T01:48:50Z',
        subCategory: 'temperature sensor',
        category: 'custom widget',
        typeId: '8S2DzAk',
        updatedAt: '2018-01-23T01:49:52Z',
        operation: 'hydrate'
    };

    const newDevice = {
        metadata: {},
        typeId: '8S2DzAk',
        count: 5
    };

    const newAutoDevice = {
        metadata: {},
        typeId: 'automotive',
        count: 50
    };

    const newDeviceExceed = {
        metadata: {},
        typeId: '8S2DzAk',
        count: 101
    };

    const deviceType = {
        userId: 'test_user',
        typeId: '8S2DzAk',
        custom: true,
        name: 'pressure sensor',
        spec: {
            interval: 2000,
            payload: [{
                name: 'device',
                type: 'id'
            }, {
                default: 'pressure_pct',
                name: 'name',
                type: 'string'
            }, {
                max: 20,
                min: 10,
                name: 'station',
                static: true,
                type: 'string'
            }, {
                dmax: 99,
                dmin: 0,
                imax: 100,
                imin: 0,
                name: 'value',
                precision: 2,
                type: 'float'
            }, {
                format: 'unix',
                name: 'timestamp',
                type: 'timestamp'
            }],
            topic: '/sensor/data'
        },
        createdAt: '2017-11-01T17:44:50Z',
        updatedAt: '2017-11-08T17:44:50Z'
    };

    const deviceTypeAuto = {
        userId: 'test_user',
        typeId: 'automotive',
        custom: true,
        name: 'pressure sensor',
        spec: {
            interval: 2000,
            payload: [{
                name: 'device',
                type: 'id'
            }, {
                default: 'pressure_pct',
                name: 'name',
                type: 'string'
            }, {
                max: 20,
                min: 10,
                name: 'station',
                static: true,
                type: 'string'
            }, {
                dmax: 99,
                dmin: 0,
                imax: 100,
                imin: 0,
                name: 'value',
                precision: 2,
                type: 'float'
            }, {
                format: 'unix',
                name: 'timestamp',
                type: 'timestamp'
            }],
            topic: '/sensor/data'
        },
        createdAt: '2017-11-01T17:44:50Z',
        updatedAt: '2017-11-08T17:44:50Z'
    };

    describe('#getDevices', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return devices when ddb query successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [device]
                });
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.getDevices(ticket, null, 0).then((data) => {
                assert.equal(data.length, 1);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when ddb query fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback('error', null);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.getDevices(ticket, null, 0).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceRetrievalFailure',
                    message: 'Error occurred while attempting to retrieve page 0 from devices.'
                });
                done();
            });

        });
    });


    describe('#getDeviceStats', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return device stats when ddb query successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [device]
                });
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.getDeviceStats(ticket, null).then((data) => {
                assert.equal(data.provisioning, 0);
                assert.equal(data.hydrated, 0);
                assert.equal(data.sleeping, 1);
                assert.equal(data.total, 1);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when ddb query fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback('error', null);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.getDeviceStats(ticket, null).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceStatsRetrievalFailure',
                    message: `Error occurred while attempting to retrieve stats for ${process.env.DEVICES_TBL}.`
                });
                done();
            });

        });
    });


    describe('#getDeviceStatsBySubCategory', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return device stats by subCategory when ddb query successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [device]
                });
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.getDeviceStatsBySubCategory(ticket, {}).then((data) => {
                console.log(data)
                assert.equal(data['temperature sensor'], 1);
                assert.equal(data.total, 1);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when ddb query fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback('error', null);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.getDeviceStatsBySubCategory(ticket, {}).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceStatsSubCatRetrievalFailure',
                    message: `Error occurred while attempting to retrieve stats by subCategory for ${process.env.DEVICES_TBL}.`
                });
                done();
            });

        });
    });



    describe('#getDevice', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return device when ddb get successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: device
                });
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.getDevice(ticket, 'F5W2Aoz').then((data) => {
                assert.equal(data, device);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when ddb get returns empty result', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {});
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.getDevice(ticket, 'F5W2Aoz').then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 400,
                    error: 'MissingDevice',
                    message: `The device ${device.id} for user ${ticket.userid} does not exist.`
                });
                done();
            });

        });

        it('should return error information when ddb get fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback('error', null);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.getDevice(ticket, 'F5W2Aoz').then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceRetrieveFailure',
                    message: `Error occurred while attempting to retrieve device ${device.id} for user ${ticket.userid}.`
                });
                done();
            });

        });
    });

    describe('#createDevice', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
            AWS.restore('SQS');
        });

        it('should return creation stats when ddb batchWrite successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            let message = {
                MessageId: 'testmessage-id'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: deviceTypeAuto
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'batchWrite', function(params, callback) {
                callback(null, {
                    UnprocessedItems: {},
                    ConsumedCapacity: {
                        CapacityUnits: 10
                    }
                });
            });

            AWS.mock('SQS', 'sendMessage', function(params, callback) {
                callback(null, message);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.createDevice(ticket, newAutoDevice).then((data) => {
                console.log(data)
                expect(data).to.deep.equal({
                    processedItems: 50
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return creation stats when ddb get fails for user type, but success for default type and batchWrite successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            let message = {
                MessageId: 'testmessage-id'
            };

            let _count = 0;
            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                if (_count === 0) {
                    _count++;
                    callback(null, {});
                } else {
                    callback(null, {
                        Item: deviceType
                    });
                }
            });

            AWS.mock('DynamoDB.DocumentClient', 'batchWrite', function(params, callback) {
                callback(null, {
                    UnprocessedItems: {},
                    ConsumedCapacity: {
                        CapacityUnits: 10
                    }
                });
            });

            AWS.mock('SQS', 'sendMessage', function(params, callback) {
                callback(null, message);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.createDevice(ticket, newDevice).then((data) => {
                expect(data).to.deep.equal({
                    processedItems: 5
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return creation stats when ddb batchWrite successful, but SQS fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: deviceType
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'batchWrite', function(params, callback) {
                callback(null, {
                    UnprocessedItems: {},
                    ConsumedCapacity: {
                        CapacityUnits: 10
                    }
                });
            });

            AWS.mock('SQS', 'sendMessage', function(params, callback) {
                callback('error', null);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.createDevice(ticket, newDevice).then((data) => {
                expect(data).to.deep.equal({
                    processedItems: 5
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when device count exceeds 25 limit', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback('error', null);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.createDevice(ticket, newDeviceExceed).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 400,
                    error: 'DeviceCreateLimitExceeded',
                    message: 'Exceeded limit of 100 concurrent device creations per request.'
                });
                done();
            });

        });

        it('should return error information when ddb get device type fails for user', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback('error', null);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.createDevice(ticket, newDevice).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceTypeRetrieveFailure',
                    message: `Error occurred while attempting to retrieve device type ${newDevice.typeId} for user ${ticket.userid}.`
                });
                done();
            });

        });

        it('should return error when ddb get device type for user returns empty and default errors', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            let _count = 0;
            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                if (_count === 0) {
                    _count++;
                    callback(null, {});
                } else {
                    callback('error', null);
                }
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.createDevice(ticket, newDevice).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DefaultDeviceTypeRetrieveFailure',
                    message: `Error occurred while attempting to retrieve _default_ device type ${newDevice.typeId}.`
                });
                done();
            });

        });

        it('should return error when ddb get device type for user and default returns empty', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            let _count = 0;
            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                if (_count === 0) {
                    _count++;
                    callback(null, {});
                } else {
                    callback(null, {});
                }
            });

            AWS.mock('DynamoDB.DocumentClient', 'scan', function(params, callback) {
                callback(null, {
                    Items: []
                });
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.createDevice(ticket, newDevice).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 400,
                    error: 'MissingDeviceType',
                    message: `The device type ${newDevice.typeId} for user ${ticket.userid}, default or shared does not exist.`
                });
                done();
            });

        });

        it('should return error information when ddb batchWrite fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: deviceType
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'batchWrite', function(params, callback) {
                callback('error', null);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.createDevice(ticket, newDevice).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceBatchCreateFailure',
                    message: `Error occurred while attempting to batch create devices for user ${ticket.userid}.`
                });
                done();
            });

        });
    });

    describe('#deleteDevice', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return empty object when ddb delete successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: device
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'delete', function(params, callback) {
                callback(null, {});
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.deleteDevice(ticket, 'F5W2Aoz').then((data) => {
                expect(data).to.be.empty;
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when ddb delete fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: device
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'delete', function(params, callback) {
                callback('error', null);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.deleteDevice(ticket, 'F5W2Aoz').then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceDeleteFailure',
                    message: `Error occurred while attempting to delete device ${device.id} for user ${ticket.userid}.`
                });
                done();
            });

        });

        it('should return error information when ddb get fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback('error', null);

            });

            let _deviceManager = new DeviceManager();
            _deviceManager.deleteDevice(ticket, 'F5W2Aoz').then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.deep.equal({
                    code: 500,
                    error: 'DeviceRetrieveFailure',
                    message: `Error occurred while attempting to retrieve device ${device.id} for user ${ticket.userid} to delete.`
                });
                done();
            });

        });

        it('should return error information when ddb get return empty', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {});

            });

            let _deviceManager = new DeviceManager();
            _deviceManager.deleteDevice(ticket, 'F5W2Aoz').then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 400,
                    error: 'MissingDevice',
                    message: `The requested device ${device.id} for user ${ticket.userid} does not exist.`
                });
                done();
            });

        });

    });


    describe('#updateDevice', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
            AWS.restore('SQS');
        });

        it('should return device when ddb put successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: device
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, device);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.updateDevice(ticket, 'F5W2Aoz', device).then((data) => {
                expect(data).to.equal(device);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return device when operation exists, action queued and ddb put successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            let message = {
                MessageId: 'testmessage-id'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: device
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, device);
            });

            AWS.mock('SQS', 'sendMessage', function(params, callback) {
                callback(null, message);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.updateDevice(ticket, 'F5W2Aoz', deviceWithOp).then((data) => {
                expect(data).to.equal(device);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when ddb update fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: device
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback('error', null);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.updateDevice(ticket, 'F5W2Aoz', device).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceUpdateFailure',
                    message: `Error occurred while attempting to update device ${device.id} for user ${ticket.userid}.`
                });
                done();
            });

        });

        it('should return error information when ddb get fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback('error', null);

            });

            let _deviceManager = new DeviceManager();
            _deviceManager.updateDevice(ticket, 'F5W2Aoz', device).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceRetrieveFailure',
                    message: `Error occurred while attempting to retrieve device ${device.id} for user ${ticket.userid} to update.`
                });
                done();
            });

        });

        it('should return error information when ddb get return empty', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {});

            });

            let _deviceManager = new DeviceManager();
            _deviceManager.updateDevice(ticket, 'F5W2Aoz', device).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 400,
                    error: 'MissingDevice',
                    message: `The requested device ${device.id} for user ${ticket.userid} does not exist.`
                });
                done();
            });

        });


        it('should return error information when operation exists and queue fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            let message = {
                MessageId: 'testmessage-id'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: device
                });
            });

            AWS.mock('SQS', 'sendMessage', function(params, callback) {
                callback('error', null);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.updateDevice(ticket, 'F5W2Aoz', deviceWithOp).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.equal(`Error occurred while attempting to send action request to simulator queue.`);
                done();
            });
        });

        it('should return error information when operation exists, action queued and ddb put fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            let message = {
                MessageId: 'testmessage-id'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: device
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback('error', null);
            });

            AWS.mock('SQS', 'sendMessage', function(params, callback) {
                callback(null, message);
            });

            let _deviceManager = new DeviceManager();
            _deviceManager.updateDevice(ticket, 'F5W2Aoz', deviceWithOp).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                console.log(err)
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceUpdateFailure',
                    message: `Error occurred while attempting to update device ${device.id} for user ${ticket.userid}.`
                });
                done();
            });
        });

    });

});