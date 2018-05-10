'use strict';

const assert = require('chai').assert;
const expect = require('chai').expect;
const path = require('path');
const sinon = require('sinon');
const AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let Widget = require('./widget.js');
let Device = require('../device.js');
let sandbox;

describe('Widget', function() {

    let Logger = {
        log: function propFn() {},
        error: function propFn() {},
        debug: function propFn() {},
        levels: {
            INFO: 1
        }
    };

    let _opts = {
        logger: Logger,
        iotEndpoint: 'endpt',
        targetIotRegion: 'region'
    };

    let _spec = {

    };

    let _params = {
        id: 'test',
        userId: 'test_user',
        duration: 60000
    };

    describe('#run', function() {

        beforeEach(function() {
            sandbox = sinon.createSandbox();
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should return start message when run successful', function(done) {

            sandbox.stub(Device.prototype, 'run').resolves({});

            let _w = new Widget(_opts, _params, _spec);
            _w.start().then((result) => {
                expect(result).to.equal(`Widget ${_params.id} started.`);
                done();
            }).catch((err) => {
                console.log(err);
                done('test failured with error');
            });

        });

        it('should return error information when run fails', function(done) {

            sandbox.stub(Device.prototype, 'run').rejects('error');

            let _w = new Widget(_opts, _params, _spec);
            _w.start().then((result) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.equal(`Widget ${_params.id} failed to start.`);
                done();
            });
        });
    });

    describe('#stop', function() {

        beforeEach(function() {
            sandbox = sinon.createSandbox();
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should return start message when stop successful', function(done) {

            sandbox.stub(Device.prototype, 'sleep').resolves({});

            let _w = new Widget(_opts, _params, _spec);
            _w.stop().then((result) => {
                expect(result).to.equal(`Widget ${_params.id} stopped.`);
                done();
            }).catch((err) => {
                console.log(err);
                done('test failured with error');
            });

        });

        it('should return error information when stop fails', function(done) {

            sandbox.stub(Device.prototype, 'sleep').rejects('error');

            let _w = new Widget(_opts, _params, _spec);
            _w.stop().then((result) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.equal(`Widget ${_params.id} failed to stop.`);
                done();
            });
        });
    });

});