'use strict';

const assert = require('chai').assert;
const expect = require('chai').expect;
const path = require('path');
const sinon = require('sinon');
const AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let DeviceFactory = require('./device-factory.js');

describe('DeviceFactory', function() {

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

    const deviceTypeRecord = {
        name: "pressure sensor",
        spec: {
            interval: 2000,
            payload: [{
                name: "device",
                type: "id"
            }, {
                default: "pressure_pct",
                name: "name",
                type: "string"
            }, {
                max: 20,
                min: 10,
                name: "station",
                static: true,
                type: "string"
            }, {
                format: "unix",
                name: "timestamp",
                type: "timestamp"
            }],
            topic: "/sensor/data"
        },
        typeId: "72cKnCg",
        userId: "test_user"
    };

    let Logger = {
        log: function propFn() {},
        levels: {
            INFO: 1
        }
    };
    sinon.stub(Logger, 'log').returns('');

    let _opts = {
        deviceTypeTable: 'deviceTypes',
        logger: Logger
    };

    describe('#loadDeviceType', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return device type record when ddb get successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: deviceTypeRecord
                });
            });

            let _df = new DeviceFactory(_opts);
            _df.loadDeviceType('test_user', '72cKnCg').then((dtype) => {
                expect(dtype).to.equal(deviceTypeRecord);
                done();
            }).catch((err) => {
                done('test failured with error');
            });

        });

        it('should return error information when ddb get fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback('error', null);
            });

            let _df = new DeviceFactory(_opts);
            _df.loadDeviceType('test_user', '72cKnCg').then((dtype) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.equal('Unable to load user, default or shared device type for module.');
                done();
            });
        });
    });

    describe('#loadDevice', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return device record when ddb get successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: device
                });
            });

            let _df = new DeviceFactory(_opts);
            _df.loadDevice(device.userId, device.id).then((d) => {
                expect(d).to.equal(device);
                done();
            }).catch((err) => {
                console.log(err);
                done('test failured with error');
            });

        });

        it('should return error information when ddb get returns empty result', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {});
            });

            let _df = new DeviceFactory(_opts);
            _df.loadDevice(device.userId, device.id).then((d) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.equal(`Device id: ${device.id}, userId: ${device.userId} not found.`);
                done();
            });
        });

        it('should return error information when ddb get fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback('error', null);
            });

            let _df = new DeviceFactory(_opts);
            _df.loadDevice(device.userId, device.id).then((d) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.equal(`Error loading device from ddb, id: ${device.id}, userId: ${device.userId}`);
                done();
            });
        });
    });

});