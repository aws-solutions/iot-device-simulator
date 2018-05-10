'use strict';

let assert = require('chai').assert;
let expect = require('chai').expect;
var path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let DynamoDBHelper = require('./dynamodb-helper.js');

describe('dynamoDBHelper', function() {

    const _item = {
        'id': 'abcxyz',
        'val': {
            'N': '12'
        },
        'setting': {
            'limit': {
                'N': '45'
            },
            'test': 'good',
            'isABool': {
                'B': 'true'
            }
        }
    };

    describe('#saveItem', function() {

        beforeEach(function() {});

        afterEach(function() {
            AWS.restore('DynamoDB.DocumentClient');
        });

        it('should return item when ddb put successful', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback(null, {});
            });

            let _helper = new DynamoDBHelper();
            _helper.saveItem(_item, 'testtbl').then((data) => {
                expect(data).to.have.property('id');
                expect(data).to.have.property('created_at');
                expect(data).to.have.property('updated_at');
                done();
            }).catch((err) => {
                done(err)
            });
        });

        it('should return error information when ddb put fails', function(done) {

            AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
                callback({
                    error: 'failed'
                }, {});
            });

            let _helper = new DynamoDBHelper();
            _helper.saveItem(_item, 'testtbl').then((data) => {
                done('invalid failure for negative test');
            }).catch((err) => {
                expect(err).to.deep.equal({
                    error: 'failed'
                });
                done();
            });

        });

    });

    describe('#_checkAssignedDataType', function() {

        beforeEach(function() {});

        afterEach(function() {});

        it('should return number when numeric value specifically assigned', function(done) {

            let _attr = {
                'N': '12'
            };

            let _helper = new DynamoDBHelper();
            let val = _helper._checkAssignedDataType(_attr);
            expect(val).to.equal(12);
            done();
        });

        it('should return true/false when bool value specifically assigned', function(done) {

            let _attr = {
                'B': 'false'
            };

            let _helper = new DynamoDBHelper();
            let val = _helper._checkAssignedDataType(_attr);
            expect(val).to.equal(false);
            done();
        });

        it('should return NaN when numeric value specifically assigned but not a number', function(done) {

            let _attr = {
                'N': 'test'
            };

            let _helper = new DynamoDBHelper();
            let val = _helper._checkAssignedDataType(_attr);
            expect(val).to.be.NaN;
            done();
        });

        it('should return valid number when numeric value specifically assigned in nested object', function(done) {

            let _attr = {
                'test': 'tesval',
                'isNumber': {
                    'N': '88'
                }
            };

            let _helper = new DynamoDBHelper();
            let val = _helper._checkAssignedDataType(_attr);
            expect(val).to.deep.equal({
                test: 'tesval',
                isNumber: 88
            });
            done();
        });

    });


});