'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
var path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let ProfileManager = require('./profileManager.profile.js');

describe('ProfileManager', function() {

    const _profile = {
        user_id: 'test_user_acme_sam',
        email: 'test.user@acme.sam',
        name: 'Test User',
        enabled: true,
        mapboxToken: '',
        groups: [
            'member'
        ]
    };

    const _profileWithToken = {
        user_id: 'test_user_acme_sam',
        email: 'test.user@acme.sam',
        name: 'Test User',
        enabled: true,
        mapboxToken: 'test-token',
        groups: [
            'member'
        ]
    };

    const _userinfo = {
        Username: 'test_user_acme_sam',
        UserAttributes: [{
            Name: 'nickname',
            Value: 'Test User'
        }, {
            Name: 'email',
            Value: 'test.user@acme.sam'
        }],
        Enabled: true
    };

    const _groupinfo = {
        Groups: [{
            GroupName: 'member'
        }]
    };

    const _setting = {
        Item: {
            setting: {
                idp: 'test_idp'
            }
        }
    };

    const _settingWithMapbox = {
        Item: {
            setting: {
                idp: 'test_idp',
                mapboxToken: 'test-token'
            }
        }
    };

    describe('#getProfile', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
            AWS.restore('CognitoIdentityServiceProvider');
        });

        it('should return user profile when ddb get successful and able to retrieve user info', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, _setting);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminGetUser', function(params, callback) {
                callback(null, _userinfo);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminListGroupsForUser', function(params, callback) {
                callback(null, _groupinfo);
            });

            let _profileManager = new ProfileManager();
            _profileManager.getProfile(ticket).then((data) => {
                expect(data).to.deep.equal(_profile);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return user profile with mapboxToken when ddb get successful and able to retrieve user info', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, _settingWithMapbox);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminGetUser', function(params, callback) {
                callback(null, _userinfo);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminListGroupsForUser', function(params, callback) {
                callback(null, _groupinfo);
            });

            let _profileManager = new ProfileManager();
            _profileManager.getProfile(ticket).then((data) => {
                expect(data).to.deep.equal(_profileWithToken);
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when settings ddb get returns empty result', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, {});
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminGetUser', function(params, callback) {
                callback(null, _userinfo);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminListGroupsForUser', function(params, callback) {
                callback(null, _groupinfo);
            });

            let _profileManager = new ProfileManager();
            _profileManager.getProfile(ticket).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 401,
                    error: 'MissingSetting',
                    message: `The configuration setting for 'app-config' does not exist.`
                });
                done();
            });

        });

        it('should return error information  when settings ddb get fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback('error', null);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminGetUser', function(params, callback) {
                callback(null, _userinfo);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminListGroupsForUser', function(params, callback) {
                callback(null, _groupinfo);
            });

            let _profileManager = new ProfileManager();
            _profileManager.getProfile(ticket).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'SettingRetrieveFailure',
                    message: 'Error occurred while attempting to retrieve application settings.'
                });
                done();
            });

        });

        it('should return error information when get user fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, _setting);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminGetUser', function(params, callback) {
                callback('error', null);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminListGroupsForUser', function(params, callback) {
                callback(null, _groupinfo);
            });

            let _profileManager = new ProfileManager();
            _profileManager.getProfile(ticket).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'UserRetrievalFailure',
                    message: `Error occurred while attempting to retrieve user ${ticket.userid} from pool.`
                });
                done();
            });

        });

        it('should return error information when get user fails', function(done) {

            let ticket = {
                auth_status: 'authorized',
                userid: 'test_user'
            };

            AWS.mock('DynamoDB.DocumentClient', 'get', function(params, callback) {
                callback(null, _setting);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminGetUser', function(params, callback) {
                callback(null, _userinfo);
            });

            AWS.mock('CognitoIdentityServiceProvider', 'adminListGroupsForUser', function(params, callback) {
                callback('error', null);
            });

            let _profileManager = new ProfileManager();
            _profileManager.getProfile(ticket).then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    code: 500,
                    error: 'UserGroupsRetrievalFailure',
                    message: `Error occurred while attempting to retrieve user ${ticket.userid} groups from pool.`
                });
                done();
            });

        });

    });

});