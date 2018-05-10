'use strict';

let expect = require('chai').expect;
let assert = require('chai').assert;
var sinon = require('sinon');

let Logger = require('./logger.js');
let logging_level = 1;
describe('logger', function() {
    describe('#log', function() {

        beforeEach(function() {
            this.cStub2 = sinon.spy(console, 'log');
        });

        afterEach(function() {
            this.cStub2.restore();
        });

        it('should log message if level <= configured logging', function(done) {

            let _logger = new Logger();
            _logger.log('test message', logging_level);
            expect(console.log.calledOnce).to.be.true;
            done();
        });

        it('should not log message if level > configured logging', function(done) {

            let _logger = new Logger();
            _logger.log('test message', logging_level + 1);
            expect(console.log.calledOnce).to.be.false;
            done();
        });

        it('should log warning if level <= configured logging', function(done) {

            let _logger = new Logger();
            _logger.warn('test message', logging_level);
            expect(console.log.calledOnce).to.be.true;
            done();
        });

        it('should not log warning if level > configured logging', function(done) {

            let _logger = new Logger();
            _logger.warn('test message', logging_level + 1);
            expect(console.log.calledOnce).to.be.false;
            done();
        });

        it('should log error if level <= configured logging', function(done) {

            let _logger = new Logger();
            _logger.error('test message', logging_level);
            expect(console.log.calledOnce).to.be.true;
            done();
        });

        it('should not log error if level > configured logging', function(done) {

            let _logger = new Logger();
            _logger.error('test message', logging_level + 1);
            expect(console.log.calledOnce).to.be.false;
            done();
        });

    });
});