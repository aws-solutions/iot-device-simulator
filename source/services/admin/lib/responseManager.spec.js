'use strict';

const sinon = require('sinon');
const assert = require('chai').assert;
const expect = require('chai').expect;
const path = require('path');
const AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

const ResponseManager = require('./responseManager.admin.js');
const User = require('./user.admin.js');
const Setting = require('./setting.admin.js');
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
        userid: 'test_user',
        groups: [
            'Administrators'
        ]
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

        it('should return 200 response with valid api request path and successful User library listGroups response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/admin/groups'
            };

            const _resp = {
                Items: ['Members']
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'listGroups').resolves(_resp);

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

        it('should return error response with valid api request path and User library listGroups error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/admin/groups'
            };

            const _resp = {
                code: 500,
                error: 'GroupsRetrievalFailure',
                message: `Error occurred while attempting to retrieve groups.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'listGroups').rejects(_resp);

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

        it('should return 200 response with valid api request path and successful User library createInvitation response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'POST',
                resource: '/admin/invitations'
            };

            const _resp = {
                user_id: 'test_user'
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'createInvitation').resolves(_resp);

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

        it('should return error response with valid api request path and User library createInvitation error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'POST',
                resource: '/admin/invitations'
            };

            const _resp = {
                code: 500,
                error: 'InviationCreationFailure',
                message: `Error occurred while attempting to create invitation.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'createInvitation').rejects(_resp);

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

        it('should return 200 response with valid api request path and successful User library getUsers response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/admin/users'
            };

            const _resp = [{
                user_id: 'test_user'
            }];

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'getUsers').resolves(_resp);

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

        it('should return error response with valid api request path and User library getUsers error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/admin/users'
            };

            const _resp = {
                code: 500,
                error: 'UsersRetrievalFailure',
                message: `Error occurred while attempting to retrieve users.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'getUsers').rejects(_resp);

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

        it('should return 200 response with valid api request path and successful User library getUser response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/admin/users/123',
                pathParameters: {
                    user_id: 123
                }
            };

            const _resp = {
                user_id: 'test_user'
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'getUser').resolves(_resp);

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

        it('should return error response with valid api request path and User library getUser error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/admin/users/123',
                pathParameters: {
                    user_id: 123
                }
            };

            const _resp = {
                code: 500,
                error: 'UserRetrievalFailure',
                message: `Error occurred while attempting to retrieve user.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'getUser').rejects(_resp);

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

        it('should return 200 response with valid api request path and successful User library deleteUser response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'DELETE',
                resource: '/admin/users/123',
                pathParameters: {
                    user_id: 123
                }
            };

            const _resp = {};

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'deleteUser').resolves(_resp);

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

        it('should return error response with valid api request path and User library deleteUser error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'DELETE',
                resource: '/admin/users/123',
                pathParameters: {
                    user_id: 123
                }
            };

            const _resp = {
                code: 500,
                error: 'UserDeleteFailure',
                message: `Error occurred while attempting to delete user.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'deleteUser').rejects(_resp);

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

        it('should return 200 response with valid api request path and successful User library updateUser (update) response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/admin/users/123',
                pathParameters: {
                    user_id: 123
                },
                body: "{\"operation\":\"update\"}"
            };

            const _resp = {
                user_id: 'test_user'
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'updateUser').resolves(_resp);

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

        it('should return error response with valid api request path and User library updateUser (update) error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/admin/users/123',
                pathParameters: {
                    user_id: 123
                },
                body: "{\"operation\":\"update\"}"
            };

            const _resp = {
                code: 500,
                error: 'UserUpdateFailure',
                message: `Error occurred while attempting to update user.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'updateUser').rejects(_resp);

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

        it('should return 200 response with valid api request path and successful User library updateUser (disable) response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/admin/users/123',
                pathParameters: {
                    user_id: 123
                },
                body: "{\"operation\":\"disable\"}"
            };

            const _resp = {
                user_id: 'test_user'
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'disableUser').resolves(_resp);

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

        it('should return error response with valid api request path and User library updateUser (disable) error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/admin/users/123',
                pathParameters: {
                    user_id: 123
                },
                body: "{\"operation\":\"disable\"}"
            };

            const _resp = {
                code: 500,
                error: 'DisableUserFailure',
                message: `Error occurred while attempting to disable user.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'disableUser').rejects(_resp);

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

        it('should return 200 response with valid api request path and successful User library updateUser (enable) response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/admin/users/123',
                pathParameters: {
                    user_id: 123
                },
                body: "{\"operation\":\"enable\"}"
            };

            const _resp = {
                user_id: 'test_user'
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'enableUser').resolves(_resp);

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

        it('should return error response with valid api request path and User library updateUser (enable) error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/admin/users/123',
                pathParameters: {
                    user_id: 123
                },
                body: "{\"operation\":\"enable\"}"
            };

            const _resp = {
                code: 500,
                error: 'EnableUserFailure',
                message: `Error occurred while attempting to enable user.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(User.prototype, 'enableUser').rejects(_resp);

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

        it('should return 200 response with valid api request path and successful Setting library getAppSettings response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/admin/settings',
                queryStringParameters: {
                    id: 'test'
                }
            };

            const _resp = {
                settingId: '123'
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(Setting.prototype, 'getAppSettings').resolves(_resp);

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

        it('should return error response with valid api request path and Setting library getAppSettings error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'GET',
                resource: '/admin/settings',
                queryStringParameters: {
                    id: 'test'
                }
            };

            const _resp = {
                code: 500,
                error: 'SettingRetrievalFailure',
                message: `Error occurred while attempting to retrieve setting.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(Setting.prototype, 'getAppSettings').rejects(_resp);

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

        it('should return 200 response with valid api request path and successful Setting library updateAppSettings response', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/admin/settings',
                body: "{\"setting_id\":\"123\"}"
            };

            const _resp = {
                setting_id: '123'
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(Setting.prototype, 'updateAppSettings').resolves(_resp);

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

        it('should return error response with valid api request path and Setting library updateAppSettings error', function(done) {
            const _event = {
                headers: {
                    Authorization: 'xyz',
                },
                httpMethod: 'PUT',
                resource: '/admin/settings',
                body: "{\"setting_id\":\"123\"}"
            };

            const _resp = {
                code: 500,
                error: 'SettingUpdateFailure',
                message: `Error occurred while attempting to update setting.`
            };

            sandbox.stub(Auth, 'getUserClaimTicket').resolves(_ticket);
            sandbox.stub(Setting.prototype, 'updateAppSettings').rejects(_resp);

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