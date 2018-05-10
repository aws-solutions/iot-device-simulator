'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
var path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let MetricsManager = require('./metricsManager.metrics.js');

describe('MetricsManager', function() {

    const userMetrics = {
        userId: 'test_user',
        totalRuns: 180,
        totalDuration: 626,
        monthlyRuns: {
            jan: 10,
            dec: 50,
            nov: 73,
            oct: 28,
            sep: 53,
            aug: 120
        },
        createdAt: '2017-11-01T17:44:50Z',
        updatedAt: '2017-11-08T17:44:50Z'
    };

    describe('#getMetrics', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return user metrics when ddb get successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: userMetrics
                });
            });

            let _metricsManager = new MetricsManager();
            _metricsManager.getMetrics(ticket).then((data) => {
                assert.equal(data, userMetrics);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return baseline metric information when ddb get returns empty result', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {});
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, {});
            });

            let _metricsManager = new MetricsManager();
            _metricsManager.getMetrics(ticket).then((data) => {
                expect(data.userId).to.equal(ticket.userid);
                expect(data.monthlyRuns.length).to.equal(2);
                expect(data.totalDuration).to.equal(0);
                expect(data.totalRuns).to.equal(0);
                done();
            }).catch((err) => {
                done(err)
            });

        });

        it('should return error information when ddb get returns empty result, but ddb put baseline fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {});
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback('error', null);
            });

            let _metricsManager = new MetricsManager();
            _metricsManager.getMetrics(ticket).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'MetricsBaselineFailure',
                    message: `Error occurred while attempting to create baseline metrics for user ${ticket.userid}.`
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

            let _metricsManager = new MetricsManager();
            _metricsManager.getMetrics(ticket).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'MetricsRetrievalFailure',
                    message: `Error occurred while attempting to retrieve the metrics for user ${ticket.userid}.`
                });
                done();
            });

        });
    });

});