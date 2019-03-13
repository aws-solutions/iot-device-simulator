'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
var path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let DeviceTypeManager = require('./deviceTypeManager.device.js');

describe('DeviceTypeManager', function() {

    const deviceType = {
        userId: 'test_user',
        typeId: 'dt-1234',
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

    const newDeviceType = {
        custom: true,
        name: 'test sensor',
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
        }
    };

    const copyDeviceType = {
        custom: true,
        name: 'test sensor',
        typeId: 'automotive',
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
        }
    };

    describe('#getDeviceTypes', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return device types when ddb scan successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'scan', function(params, callback) {
                callback(null, {
                    Items: [deviceType]
                });
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.getDeviceTypes(ticket, 0).then((data) => {
                assert.equal(data.length, 1);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when ddb scan fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'scan', function(params, callback) {
                callback('error', null);
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.getDeviceTypes(ticket, 0).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceTypeRetrievalFailure',
                    message: `Error occurred while attempting to retrieve page 0 from device types.`
                });
                done();
            });

        });
    });


    describe('#getDeviceType', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return device type when ddb get successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: deviceType
                });
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.getDeviceType(ticket, 'dt-1234').then((data) => {
                assert.equal(data, deviceType);
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

            AWS.mock('DynamoDB.DocumentClient', 'scan', function(params, callback) {
                callback(null, {
                    Items: []
                });
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.getDeviceType(ticket, 'dt-1234').then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 400,
                    error: 'MissingDeviceType',
                    message: `The device type ${deviceType.typeId} for user ${ticket.userid}, default or shared does not exist.`
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

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.getDeviceType(ticket, 'dt-1234').then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceTypeRetrieveFailure',
                    message: `Error occurred while attempting to retrieve device type ${deviceType.typeId} for user ${ticket.userid}.`
                });
                done();
            });

        });
    });

    describe('#getDeviceTypeStats', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return device type stats when ddb query successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
                callback(null, {
                    Items: [deviceType]
                });
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.getDeviceTypeStats(ticket, null).then((data) => {
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

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.getDeviceTypeStats(ticket, null).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceTypeStatsRetrievalFailure',
                    message: `Error occurred while attempting to retrieve stats for ${process.env.DEVICE_TYPES_TBL}.`
                });
                done();
            });

        });
    });


    describe('#createDeviceType', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return device type with new typeid when ddb put successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, {
                    Item: newDeviceType
                });
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.createDeviceType(ticket, newDeviceType).then((data) => {
                assert.exists(data.typeId);
                assert.exists(data.userId);
                assert.equal(data.name, newDeviceType.name);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return device type new typeid with visibility private when ddb put successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, {
                    Item: newDeviceType
                });
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.createDeviceType(ticket, newDeviceType).then((data) => {
                assert.exists(data.typeId);
                assert.exists(data.userId);
                assert.equal(data.name, newDeviceType.name);
                assert.equal(data.visibility, 'private');
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return device type with duplicate typeid with passed typeid when ddb put successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, {
                    Item: newDeviceType
                });
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.createDeviceType(ticket, copyDeviceType).then((data) => {
                assert.equal(data.typeId, copyDeviceType.typeId);
                assert.exists(data.userId);
                assert.equal(data.name, newDeviceType.name);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when ddb put fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback('error', null);
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.createDeviceType(ticket, newDeviceType).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceTypeCreateFailure',
                    message: `Error occurred while attempting to create device type for user ${ticket.userid}.`
                });
                done();
            });

        });
    });

    describe('#deleteDeviceType', function() {

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
                    Item: deviceType
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'delete', function(params, callback) {
                callback(null, {});
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.deleteDeviceType(ticket, 'dt-1234').then((data) => {
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
                    Item: deviceType
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'delete', function(params, callback) {
                callback('error', null);
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.deleteDeviceType(ticket, 'dt-1234').then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceTypeDeleteFailure',
                    message: `Error occurred while attempting to delete device type ${deviceType.typeId} for user ${ticket.userid}.`
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

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.deleteDeviceType(ticket, 'dt-1234').then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceTypeRetrieveFailure',
                    message: `Error occurred while attempting to retrieve device type ${deviceType.typeId} for user ${ticket.userid} to delete.`
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

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.deleteDeviceType(ticket, 'dt-1234').then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 400,
                    error: 'MissingDeviceType',
                    message: `The requested device type ${deviceType.typeId} for user ${ticket.userid} does not exist.`
                });
                done();
            });

        });

    });


    describe('#updateDeviceType', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return device type when ddb put successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            let _tmp = {
                ...deviceType,
                visibility: 'private'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: deviceType
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, _tmp);
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.updateDeviceType(ticket, 'dt-1234', deviceType).then((data) => {
                expect(data).to.equal(_tmp);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when ddb put fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: deviceType
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback('error', null);
            });

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.updateDeviceType(ticket, 'dt-1234', deviceType).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceTypeUpdateFailure',
                    message: `Error occurred while attempting to update device type ${deviceType.typeId} for user ${ticket.userid}.`
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

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.updateDeviceType(ticket, 'dt-1234', deviceType).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'DeviceTypeRetrieveFailure',
                    message: `Error occurred while attempting to retrieve device type ${deviceType.typeId} for user ${ticket.userid} to update.`
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

            let _deviceTypeManager = new DeviceTypeManager();
            _deviceTypeManager.updateDeviceType(ticket, 'dt-1234', deviceType).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 400,
                    error: 'MissingDeviceType',
                    message: `The requested device type ${deviceType.typeId} for user ${ticket.userid} does not exist.`
                });
                done();
            });

        });

    });

});