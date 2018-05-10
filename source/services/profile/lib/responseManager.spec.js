'use strict';

const sinon = require('sinon');
const assert = require('chai').assert;
const expect = require('chai').expect;
const path = require('path');
const AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

const ResponseManager = require('./responseManager.profile.js');
const ProfileManager = require('./profileManager.profile.js');
const Auth = require('authorizer');

let sandbox;

describe('ResponseManager', function() {

    const _optionsEvent = {
        httpMethod: 'OPTIONS'
    };

    const _invalidAuth = {
        message: 'Error occurred while validating authorization token to generate claim ticket.'
    };

    const _ticket = {
        auth_status: 'authorized',
        userid: 'test_user'
    };

    describe('#respond', function() {

        beforeEach(function() {
            sandbox = sinon.createSandbox();
        });

        afterEach(function() {
            sandbox.restore();
        });

        it('should return pre-flight response with OPTIONS request', function(done) {

            ResponseManager.respond(_optionsEvent).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                        'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'
                    },
                    body: JSON.stringify({})
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information with invalid authorization', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz'
                }
            };

            sandbox.stub(Auth, 'getUserClaimTicket').rejects(_invalidAuth);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 401,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'AccessDeniedException',
                        message: _invalidAuth.message
                    })
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information with invalid api request path', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/invalidpath'
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        error: 'InvalidAction',
                        message: `Invalid path request ${_event.resource}, ${_event.httpMethod}`
                    })
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return 200 response with valid api request path and successful library response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/profile'
            };

            const _resp = {
                user_id: 'test_user_acme_sam',
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(ProfileManager.prototype, 'getProfile').resolves(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error response with valid api request path and library error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/profile'
            };

            const _resp = {
                code: 401,
                error: 'MissingSetting',
                message: `The configuration setting for 'app-config' does not exist.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(ProfileManager.prototype, 'getProfile').rejects(_resp);

            ResponseManager.respond(_event).then((data) => {
                expect(data).to.deep.equal({
                    statusCode: _resp.code,
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(_resp)
                });
                done();
            }).catch((err) => {
                done(err)
            });
        });

    });

});