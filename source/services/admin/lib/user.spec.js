'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
var path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let User = require('./user.admin.js');

describe('User', function() {

    const _userItem = {
        user_id: 'test_user',
        name: 'Test User',
        email: 'test.user@acme.com',
        enabled: true,
        status: 'ENABLED'
    };

    const _users = {
        Users: [{
            Username: _userItem.user_id,
            Enabled: true,
            UserStatus: _userItem.status,
            Attributes: [{
                Name: 'nickname',
                Value: _userItem.name
            }, {
                Name: 'email',
                Value: _userItem.email
            }]
        }]
    };

    const _setting = {
        setting: {
            idp: 'xyz'
        }
    };

    describe('#getUsers', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
            AWS.restore('CognitoIdentityServiceProvider');
        });

        it('should return users when ddb get and cognito listUsers successful', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: _setting
                });
            });

            AWS.mock('CognitoIdentityServiceProvider', 'listUsers', function(params, callback) {
                callback(null, _users);
            });

            let _user = new User();
            _user.getUsers().then((data) => {
                expect(data).to.deep.equal([_userItem]);
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

            let _user = new User();
            _user.getUsers().then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 401,
                    error: 'MissingIdpSetting',
                    message: 'No valid IDP app configuration data available.'
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

            let _user = new User();
            _user.getUsers().then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'SettingRetrievalFailure',
                    message: `Error occurred while attempting to retrieve the user pool info from 'app-config' setting.`
                });
                done();
            });

        });

        it('should return error information when ddb get successful but listUsers fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {
                    Item: _setting
                });
            });

            AWS.mock('CognitoIdentityServiceProvider', 'listUsers', function(params, callback) {
                callback('error', null);
            });

            let _user = new User();
            _user.getUsers().then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'ListUsersFailure',
                    message: `Error occurred while attempting to list users int the user pool.`
                });
                done();
            });

        });
    });



});