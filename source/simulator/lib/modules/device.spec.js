'use strict';

const assert = require('chai').assert;
const expect = require('chai').expect;
const path = require('path');
const sinon = require('sinon');
const AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let Device = require('./device.js');
let UsageMetrics = require('usage-metrics');
let sandbox;

describe('Device', function() {

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


    let Logger = {
        log: function propFn1(msg, lvl) {
            console.log(msg);
        },
        debug: function propFn2(msg, lvl) {
            console.log(msg);
        },
        error: function propFn2(msg, lvl) {
            //console.log(msg);
        },
        levels: {
            INFO: 1,
            ROBUST: 2
        }
    };

    let _opts = {
        deviceTable: 'devicesTbl',
        metricsTable: 'metricsTbl',
        logger: Logger,
        iotEndpoint: 'testendpoint',
        targetIotRegion: 'us-east-1',
        anonymousData: 'No'
    };

    describe('#_sendUsageMetrics', function() {

        beforeEach(function() {
            sandbox = sinon.createSandbox();
        });

        afterEach(function() {
            sandbox.restore();
            _opts.anonymousData = 'No';
        });

        it('should return error information when anonymousData is No', function(done) {

            let _payload = {};

            sandbox.stub(UsageMetrics.prototype, 'sendAnonymousMetric').rejects('error');

            let _d = new Device(_opts);
            _d._sendUsageMetrics(_payload).then((res) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.equal('Annonymous metrics configuration is disabled.');
                done();
            });
        });

        it('should return error information when anonymousData is null', function(done) {

            let _payload = {};
            _opts.anonymousData = null;

            sandbox.stub(UsageMetrics.prototype, 'sendAnonymousMetric').rejects('error');

            let _d = new Device(_opts);
            _d._sendUsageMetrics(_payload).then((res) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.equal('Annonymous metrics configuration is invalid.');
                done();
            });
        });

        it('should return error information when anonymousData is undefined', function(done) {

            let _payload = {};
            _opts.anonymousData = undefined;

            sandbox.stub(UsageMetrics.prototype, 'sendAnonymousMetric').rejects('error');

            let _d = new Device(_opts);
            _d._sendUsageMetrics(_payload).then((res) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.equal('Annonymous metrics configuration is invalid.');
                done();
            });
        });

        it('should return error information when anonymousData is an object', function(done) {

            let _payload = {};
            _opts.anonymousData = {};

            sandbox.stub(UsageMetrics.prototype, 'sendAnonymousMetric').rejects('error');

            let _d = new Device(_opts);
            _d._sendUsageMetrics(_payload).then((res) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.equal('Annonymous metrics configuration is invalid.');
                done();
            });
        });

        it('should return error information when anonymousData is Yes and sendAnonymousMetric fails', function(done) {

            let _payload = {};
            _opts.anonymousData = 'Yes';

            sandbox.stub(UsageMetrics.prototype, 'sendAnonymousMetric').rejects('error');

            let _d = new Device(_opts);
            _d._sendUsageMetrics(_payload).then((res) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.equal('Annonymous metrics transmission failed.');
                done();
            });
        });

        it('should return success message when anonymousData is Yes and sendAnonymousMetric succeeds', function(done) {

            let _payload = {};
            _opts.anonymousData = 'Yes';

            sandbox.stub(UsageMetrics.prototype, 'sendAnonymousMetric').resolves('done');
            let _d = new Device(_opts);
            _d._sendUsageMetrics(_payload).then((res) => {
                expect(res).to.equal('Annonymous metrics successfully sent.');
                done();
            }).catch((err) => {
                done('test failured with error');
            });
        });
    });
});