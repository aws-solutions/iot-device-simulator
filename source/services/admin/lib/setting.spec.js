'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
var path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let Setting = require('./setting.admin.js');

describe('Setting', function() {

    const _settingItem = {
        createdAt: "2017-11-27T17:01:21Z",
        setting: {
            region: "us-east-1"
        },
        settingId: "simulator",
        type: "config",
        updatedAt: "2017-12-01T16:28:15Z"
    };

    describe('#getAppSettings', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return app setting when ddb get successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: _settingItem
                });
            });

            let _setting = new Setting();
            _setting.getAppSettings(_settingItem.settingId).then((data) => {
                assert.equal(data, _settingItem);
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

            let _setting = new Setting();
            _setting.getAppSettings(_settingItem.settingId).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 401,
                    error: 'MissingSetting',
                    message: `The setting ${_settingItem.settingId} does not exist.`
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

            let _setting = new Setting();
            _setting.getAppSettings(_settingItem.settingId).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'SettingRetrievalFailure',
                    message: `Error occurred while attempting to retrieve the setting ${_settingItem.settingId}.`
                });
                done();
            });

        });
    });


    describe('#updateAppSettings', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return setting when ddb put successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: _settingItem
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, _settingItem);
            });

            let _setting = new Setting();
            _setting.updateAppSettings(_settingItem).then((data) => {
                expect(data.settingId).to.equal(_settingItem.settingId);
                expect(data.setting).to.equal(_settingItem.setting);
                expect(data.createdAt).to.equal(_settingItem.createdAt);
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
                    Item: _settingItem
                });
            });

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback('error', null);
            });

            let _setting = new Setting();
            _setting.updateAppSettings(_settingItem).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'SettingUpdateFailure',
                    message: `Error occurred while attempting to update setting ${_settingItem.settingId}.`
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

            let _setting = new Setting();
            _setting.updateAppSettings(_settingItem).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'SettingRetrieveFailure',
                    message: `Error occurred while attempting to retrieve setting ${_settingItem.settingId} to update.`
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

            let _setting = new Setting();
            _setting.updateAppSettings(_settingItem).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 400,
                    error: 'MissingSetting',
                    message: `The requested setting ${_settingItem.settingId} does not exist.`
                });
                done();
            });

        });

    });


});