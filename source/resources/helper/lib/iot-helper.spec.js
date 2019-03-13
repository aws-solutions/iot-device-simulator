'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
var path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let IotHelper = require('./iot-helper.js');

describe('iotHelper', function() {

    describe('#getIotEndpoint', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('Iot');
        });

        it('should return endpoint address when describeEndpoint successful', function(done) {

            AWS.mock('Iot', 'describeEndpoint', function(params, callback) {
                callback(null, {
                    endpointAddress: 'abcxyz'
                });
            });

            let _helper = new IotHelper();
            _helper.getIotEndpoint().then((data) => {
                expect(data).to.equal('abcxyz');
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when ddb put fails', function(done) {

            AWS.mock('Iot', 'describeEndpoint', function(params, callback) {
                callback({
                    error: 'failed'
                }, null);
            });

            let _helper = new IotHelper();
            _helper.getIotEndpoint().then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    error: 'failed'
                });
                done();
            });

        });

    });

});