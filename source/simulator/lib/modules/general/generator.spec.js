'use strict';

const assert = require('chai').assert;
const expect = require('chai').expect;
const path = require('path');
const sinon = require('sinon');
const AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

let Generator = require('./generator.js');

describe('Generator', function() {

    let Logger = {
        log: function propFn(msg, lvl) {
            console.log(msg);
        },
        levels: {
            INFO: 1
        }
    };
    // sinon.stub(Logger, 'log').callsFake(function fakeFn(msg, lvl) {
    //     console.log(msg);
    // });

    let _opts = {
        logger: Logger
    };

    describe('#str', function() {

        beforeEach(function() {});

        afterEach(function() {

        });

        it('should return a random string greater than 10 and less than 20 when successful', function(done) {

            let _g = new Generator(_opts);
            let data = _g.str(10, 20);

            expect(data).to.have.lengthOf.at.least(10);
            expect(data).to.have.lengthOf.at.most(20);
            done();

        });

        it('should return a random string greater than 3 and less than 20 when min is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.str('abc', 20);

            expect(data).to.have.lengthOf.at.least(3);
            expect(data).to.have.lengthOf.at.most(20);
            done();

        });

        it('should return a random string greater than 3 and less than 20 when min is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.str(null, 20);

            expect(data).to.have.lengthOf.at.least(3);
            expect(data).to.have.lengthOf.at.most(20);
            done();

        });

        it('should return a random string greater than 3 and less than 20 when min is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.str(undefined, 20);

            expect(data).to.have.lengthOf.at.least(3);
            expect(data).to.have.lengthOf.at.most(20);
            done();

        });

        it('should return a random string greater than 1 and less than 7 when max is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.str(1, 'abc');

            expect(data).to.have.lengthOf.at.least(1);
            expect(data).to.have.lengthOf.at.most(7);
            done();

        });

        it('should return a random string greater than 1 and less than 7 when max is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.str(1, null);

            expect(data).to.have.lengthOf.at.least(1);
            expect(data).to.have.lengthOf.at.most(7);
            done();

        });

        it('should return a random string greater than 1 and less than 7 when max is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.str(1, undefined);

            expect(data).to.have.lengthOf.at.least(1);
            expect(data).to.have.lengthOf.at.most(7);
            done();

        });

        it('should return a random string greater than 3 and less than 7 when min and max are undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.str(undefined, undefined);

            expect(data).to.have.lengthOf.at.least(3);
            expect(data).to.have.lengthOf.at.most(7);
            done();

        });

        it('should return a random string equal 20 when min is greater than max', function(done) {

            let _g = new Generator(_opts);
            let data = _g.str(25, 20);

            expect(data).to.have.lengthOf.at.least(20);
            expect(data).to.have.lengthOf.at.most(20);
            done();

        });

        it('should return a random string greater than 3 and less than 20 when min is less than zero', function(done) {

            let _g = new Generator(_opts);
            let data = _g.str(-4, 20);

            expect(data).to.have.lengthOf.at.least(3);
            expect(data).to.have.lengthOf.at.most(20);
            done();

        });

        it('should return a random string greater than 2 and less than 7 when max is less than zero', function(done) {

            let _g = new Generator(_opts);
            let data = _g.str(2, -10);

            expect(data).to.have.lengthOf.at.least(2);
            expect(data).to.have.lengthOf.at.most(7);
            done();

        });

    });

    describe('#int', function() {

        beforeEach(function() {});

        afterEach(function() {

        });

        it('should return a random integer greater than -10 and less than 20 when successful', function(done) {

            let _g = new Generator(_opts);
            let data = _g.int(-10, 20);

            expect(data).to.be.at.least(-10);
            expect(data).to.be.at.most(20);
            done();

        });

        it('should return a random integer greater than 0 and less than 20 when min is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.int('abc', 20);

            expect(data).to.be.at.least(0);
            expect(data).to.be.at.most(20);
            done();

        });

        it('should return a random integer greater than 0 and less than 20 when min is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.int(null, 20);

            expect(data).to.be.at.least(0);
            expect(data).to.be.at.most(20);
            done();

        });

        it('should return a random integer greater than 0 and less than 20 when min is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.int(undefined, 20);

            expect(data).to.be.at.least(0);
            expect(data).to.be.at.most(20);
            done();

        });

        it('should return a random integer greater than 5 and less than 10 when max is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.int(10, 'abc');

            expect(data).to.be.at.least(5);
            expect(data).to.be.at.most(10);
            done();

        });

        it('should return a random integer greater than 5 and less than 10 when max is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.int(10, null);

            expect(data).to.be.at.least(5);
            expect(data).to.be.at.most(10);
            done();

        });

        it('should return a random integer greater than 5 and less than 10 when max is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.int(10, undefined);

            expect(data).to.be.at.least(5);
            expect(data).to.be.at.most(10);
            done();

        });

        it('should return 20 when min is greater than max', function(done) {

            let _g = new Generator(_opts);
            let data = _g.int(25, 20);

            expect(data).to.equal(20);
            done();

        });
    });

    describe('#bool', function() {

        beforeEach(function() {});

        afterEach(function() {

        });

        it('should return a boolean value when successful', function(done) {

            let _g = new Generator(_opts);
            let data = _g.bool(10, 20, 3);

            expect(data).to.be.oneOf([true, false]);
            done();

        });

        it('should return a boolean value when min is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.bool('abc', 20, 10);

            expect(data).to.be.oneOf([true, false]);
            done();

        });

        it('should return a boolean value when min is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.bool(null, 20, 10);

            expect(data).to.be.oneOf([true, false]);
            done();

        });

        it('should return a boolean value when min is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.bool(undefined, 20, 10);

            expect(data).to.be.oneOf([true, false]);
            done();

        });

        it('should return a boolean value when max is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.bool(10, 'abc', 10);

            expect(data).to.be.oneOf([true, false]);
            done();

        });

        it('should return a boolean value when max is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.bool(10, null, 10);

            expect(data).to.be.oneOf([true, false]);
            done();

        });

        it('should return a boolean value when max is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.bool(10, undefined, 10);

            expect(data).to.be.oneOf([true, false]);
            done();

        });

        it('should return a boolean value when seed is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.bool(10, 20, 'abc');

            expect(data).to.be.oneOf([true, false]);
            done();

        });

        it('should return a boolean value when seed is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.bool(10, 20, null);

            expect(data).to.be.oneOf([true, false]);
            done();

        });

        it('should return a boolean value when seed is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.bool(10, 20, undefined);

            expect(data).to.be.oneOf([true, false]);
            done();

        });

        it('should return 20 when min is greater than max', function(done) {

            let _g = new Generator(_opts);
            let data = _g.bool(22, 20, 10);

            expect(data).to.be.oneOf([true, false]);
            done();

        });
    });

    describe('#range', function() {

        beforeEach(function() {});

        afterEach(function() {

        });

        it('should return a range [10, 12, 14, 16, 18, 20] when successful', function(done) {

            let _g = new Generator(_opts);
            let data = _g.range(10, 20, 2);

            expect(data).to.deep.equal([10, 12, 14, 16, 18, 20]);
            done();

        });

        it('should return a range [0, 5, 10, 15, 20] when start is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.range('abc', 20, 5);

            expect(data).to.deep.equal([0, 5, 10, 15, 20]);
            done();

        });

        it('should return a range [0, 5, 10, 15, 20] when start is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.range(null, 20, 5);

            expect(data).to.deep.equal([0, 5, 10, 15, 20]);
            done();

        });

        it('should return a range [0, 5, 10, 15, 20] when start is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.range(undefined, 20, 5);

            expect(data).to.deep.equal([0, 5, 10, 15, 20]);
            done();

        });

        it('should return a range [0, 5, 10] when stop is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.range(0, 'abc', 5);

            expect(data).to.deep.equal([0, 5, 10]);
            done();

        });

        it('should return a range [0, 5, 10] when stop is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.range(0, null, 5);

            expect(data).to.deep.equal([0, 5, 10]);
            done();

        });

        it('should return a range [0, 5, 10] when stop is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.range(0, undefined, 5);

            expect(data).to.deep.equal([0, 5, 10]);
            done();

        });

        it('should return a range [0, 2, 4, 6, 8, 10, 12] when step is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.range(0, 12, 'abc');

            expect(data).to.deep.equal([0, 2, 4, 6, 8, 10, 12]);
            done();

        });

        it('should return a range [0, 2, 4, 6, 8, 10, 12] when step is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.range(0, 12, null);

            expect(data).to.deep.equal([0, 2, 4, 6, 8, 10, 12]);
            done();

        });

        it('should return a range [0, 2, 4, 6, 8, 10, 12] when step is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.range(0, 12, undefined);

            expect(data).to.deep.equal([0, 2, 4, 6, 8, 10, 12]);
            done();

        });

        it('should return [20] when start is greater than stop', function(done) {

            let _g = new Generator(_opts);
            let data = _g.range(22, 20, 10);

            expect(data).to.deep.equal([20]);
            done();

        });
    });

    describe('#float', function() {

        beforeEach(function() {});

        afterEach(function() {

        });

        it('should return a random float greater than -10.99 and less than 20.99 with precision of 2 when successful', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-10, 20, 0, 99, 2);

            expect(data).to.be.at.least(-10.99);
            expect(data).to.be.at.most(20.99);
            done();

        });

        it('should return a random float greater than 0.00 and less than 20.99 with precision of 2 when imin is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float('abc', 20, 0, 99, 2);

            expect(data).to.be.at.least(0.00);
            expect(data).to.be.at.most(20.99);
            done();

        });

        it('should return a random float greater than 0.00 and less than 20.99 with precision of 2 when imin is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(null, 20, 0, 99, 2);

            expect(data).to.be.at.least(0.00);
            expect(data).to.be.at.most(20.99);
            done();

        });

        it('should return a random float greater than 0.00 and less than 20.99 with precision of 2 when imin is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(undefined, 20, 0, 99, 2);

            expect(data).to.be.at.least(0.00);
            expect(data).to.be.at.most(20.99);
            done();

        });

        it('should return a random float greater than -10.99 and less than 0.99 with precision of 2 when imax is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-10, 'abc', 0, 99, 2);

            expect(data).to.be.at.least(-10.99);
            expect(data).to.be.at.most(0.99);
            done();

        });

        it('should return a random float greater than -10.99 and less than 0.99 with precision of 2 when imax is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-10, null, 0, 99, 2);

            expect(data).to.be.at.least(-10.99);
            expect(data).to.be.at.most(0.99);
            done();

        });

        it('should return a random float greater than -10.99 and less than 0.99 with precision of 2 when imax is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-10, undefined, 0, 99, 2);

            expect(data).to.be.at.least(-10.99);
            expect(data).to.be.at.most(0.99);
            done();

        });

        it('should return a random float greater than 5.00 and less than 5.99 with precision of 2 when imin is greater than imax', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(10, 5, 0, 99, 2);

            expect(data).to.be.at.least(5.00);
            expect(data).to.be.at.most(5.99);
            done();

        });

        it('should return a random float greater than -5.55 and less than 20.55 with precision of 2 when dmin is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-5.99, 20, 'abc', 55, 2);

            expect(data).to.be.at.least(-5.55);
            expect(data).to.be.at.most(20.55);
            done();

        });

        it('should return a random float greater than -5.55 and less than 20.55 with precision of 2 when dmin is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-5, 20, null, 55, 2);

            expect(data).to.be.at.least(-5.55);
            expect(data).to.be.at.most(20.55);
            done();

        });

        it('should return a random float greater than -5.55 and less than 20.55 with precision of 2 when dmin is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-5, 20, undefined, 55, 2);

            expect(data).to.be.at.least(-5.55);
            expect(data).to.be.at.most(20.55);
            done();

        });

        it('should return a random float greater than -5.99 and less than 20.99 with precision of 2 when dmax is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-5, 20, 0, 'abc', 2);

            expect(data).to.be.at.least(-5.99);
            expect(data).to.be.at.most(20.99);
            done();

        });

        it('should return a random float greater than -5.99 and less than 20.99 with precision of 2 when dmax is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-5, 20, 0, null, 2);

            expect(data).to.be.at.least(-5.99);
            expect(data).to.be.at.most(20.99);
            done();

        });

        it('should return a random float greater than -5.99 and less than 20.99 with precision of 2 when dmax is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-5, 20, 0, undefined, 2);

            expect(data).to.be.at.least(-5.99);
            expect(data).to.be.at.most(20.99);
            done();

        });

        it('should return a random float greater than -5.9 and less than 20.9 with precision of 1 when precision is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-5, 20, 0, 999, 'abc');

            expect(data).to.be.at.least(-5.9);
            expect(data).to.be.at.most(20.9);
            done();

        });

        it('should return a random float greater than -5.9 and less than 20.9 with precision of 1 when precision is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-5, 20, 0, 999, null);

            expect(data).to.be.at.least(-5.9);
            expect(data).to.be.at.most(20.9);
            done();

        });

        it('should return a random float greater than -5.9 and less than 20.9 with precision of 1 when precision is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-5, 20, 0, 999, undefined);

            expect(data).to.be.at.least(-5.9);
            expect(data).to.be.at.most(20.9);
            done();

        });

        it('should return a random float greater than -5.9 and less than 20.9 with precision of 1 when precision is negative', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-5, 20, 0, 999, -4);

            expect(data).to.be.at.least(-5.9);
            expect(data).to.be.at.most(20.9);
            done();

        });

        it('should return a random float greater than 5.00 and less than 5.99 with precision of 2 when imin is greater than imax', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(10, 5, 0, 99, 2);

            expect(data).to.be.at.least(5.00);
            expect(data).to.be.at.most(5.99);
            done();

        });

        it('should return a random float greater than -5.20 and less than 10.20 with precision of 2 when dmin is greater than dmax', function(done) {

            let _g = new Generator(_opts);
            let data = _g.float(-5, 10, 99, 20, 2);

            expect(data).to.be.at.least(-5.20);
            expect(data).to.be.at.most(10.20);
            done();

        });
    });


    describe('#pickOne', function() {

        beforeEach(function() {});

        afterEach(function() {

        });

        it('should return a value from [10, 15, 20] when successful', function(done) {

            let _g = new Generator(_opts);
            let data = _g.pickOne([10, 15, 20]);

            expect(data).to.be.oneOf([10, 15, 20]);
            done();

        });

        it('should return a value from [1, 2, 3, 4, 5] when arr is string', function(done) {

            let _g = new Generator(_opts);
            let data = _g.pickOne('abc');

            expect(data).to.be.oneOf([1, 2, 3, 4, 5]);
            done();

        });

        it('should return a value from [1, 2, 3, 4, 5] when arr is null', function(done) {

            let _g = new Generator(_opts);
            let data = _g.pickOne(null);

            expect(data).to.be.oneOf([1, 2, 3, 4, 5]);
            done();

        });

        it('should return a value from [1, 2, 3, 4, 5] when arr is undefined', function(done) {

            let _g = new Generator(_opts);
            let data = _g.pickOne(undefined);

            expect(data).to.be.oneOf([1, 2, 3, 4, 5]);
            done();

        });

    });

    describe('#pickSome', function() {

        beforeEach(function() {});

        afterEach(function() {

        });

        it('should return an array with 2 values from [10, 15, 20] when successful', function(done) {

            let _g = new Generator(_opts);
            let data = _g.pickSome([10, 15, 20], 2, true);

            expect(data).to.have.lengthOf(2);

            for (let i = 0; i < data.length; i++) {
                expect(data[i]).to.be.oneOf([10, 15, 20]);
            }
            done();

        });

        it('should return an array with 2 values from [1,2,3,4,5] when arr is string', function(done) {

            let _arr = [1, 2, 3, 4, 5];
            let _g = new Generator(_opts);
            let data = _g.pickSome('abc', 2, true);

            expect(data).to.have.lengthOf(2);

            for (let i = 0; i < data.length; i++) {
                expect(data[i]).to.be.oneOf(_arr);
            }
            done();

        });

        it('should return an array with 2 values from [1,2,3,4,5] when arr is null', function(done) {

            let _arr = [1, 2, 3, 4, 5];
            let _g = new Generator(_opts);
            let data = _g.pickSome(null, 2, true);

            expect(data).to.have.lengthOf(2);

            for (let i = 0; i < data.length; i++) {
                expect(data[i]).to.be.oneOf(_arr);
            }
            done();

        });

        it('should return an array with 2 values from [1,2,3,4,5] when arr is undefined', function(done) {

            let _arr = [1, 2, 3, 4, 5];
            let _g = new Generator(_opts);
            let data = _g.pickSome(undefined, 2, true);

            expect(data).to.have.lengthOf(2);

            for (let i = 0; i < data.length; i++) {
                expect(data[i]).to.be.oneOf(_arr);
            }
            done();

        });

        it('should return an array with 2 values from [10, 15, 20] when count is string', function(done) {

            let _arr = [10, 15, 20];
            let _g = new Generator(_opts);
            let data = _g.pickSome(_arr, 'abc', true);

            expect(data).to.have.lengthOf(2);

            for (let i = 0; i < data.length; i++) {
                expect(data[i]).to.be.oneOf(_arr);
            }
            done();

        });

        it('should return an array with 2 values from [10, 15, 20] when count is null', function(done) {

            let _arr = [10, 15, 20];
            let _g = new Generator(_opts);
            let data = _g.pickSome(_arr, null, true);

            expect(data).to.have.lengthOf(2);

            for (let i = 0; i < data.length; i++) {
                expect(data[i]).to.be.oneOf(_arr);
            }
            done();

        });

        it('should return an array with 2 values from [10, 15, 20] when count is undefined', function(done) {

            let _arr = [10, 15, 20];
            let _g = new Generator(_opts);
            let data = _g.pickSome(_arr, undefined, true);

            expect(data).to.have.lengthOf(2);

            for (let i = 0; i < data.length; i++) {
                expect(data[i]).to.be.oneOf(_arr);
            }
            done();

        });

        it('should return an array with 2 values from [10, 15, 20] when count is negative', function(done) {

            let _arr = [10, 15, 20];
            let _g = new Generator(_opts);
            let data = _g.pickSome(_arr, -4, true);

            expect(data).to.have.lengthOf(2);

            for (let i = 0; i < data.length; i++) {
                expect(data[i]).to.be.oneOf(_arr);
            }
            done();

        });

        it('should return an array with 2 values from [10, 15, 20] when shuffle is string', function(done) {

            let _arr = [10, 15, 20];
            let _g = new Generator(_opts);
            let data = _g.pickSome(_arr, 2, 'abc');

            expect(data).to.have.lengthOf(2);

            for (let i = 0; i < data.length; i++) {
                expect(data[i]).to.be.oneOf(_arr);
            }
            done();

        });

        it('should return an array with 2 values from [10, 15, 20] when shuffle is null', function(done) {

            let _arr = [10, 15, 20];
            let _g = new Generator(_opts);
            let data = _g.pickSome(_arr, 2, null);

            expect(data).to.have.lengthOf(2);

            for (let i = 0; i < data.length; i++) {
                expect(data[i]).to.be.oneOf(_arr);
            }
            done();

        });

        it('should return an array with 2 values from [10, 15, 20] when shuffle is undefined', function(done) {

            let _arr = [10, 15, 20];
            let _g = new Generator(_opts);
            let data = _g.pickSome(_arr, 2, undefined);

            expect(data).to.have.lengthOf(2);

            for (let i = 0; i < data.length; i++) {
                expect(data[i]).to.be.oneOf(_arr);
            }
            done();

        });

    });

    describe('#location', function() {

        beforeEach(function() {});

        afterEach(function() {

        });

        it('should return an object with lat long coordinates when successful', function(done) {

            const _center = {
                latitude: 38.969555,
                longitude: -77.386098
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when latitude is a string', function(done) {

            const _center = {
                latitude: 'abc',
                longitude: -77.386098
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when latitude is null', function(done) {

            const _center = {
                latitude: null,
                longitude: -77.386098
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when latitude is undefined', function(done) {

            const _center = {
                latitude: undefined,
                longitude: -77.386098
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when latitude < -90', function(done) {

            const _center = {
                latitude: -91,
                longitude: -77.386098
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when latitude > 90', function(done) {

            const _center = {
                latitude: 91,
                longitude: -77.386098
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when longitude is a string', function(done) {

            const _center = {
                latitude: 38.969555,
                longitude: 'abc'
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when longitude is null', function(done) {

            const _center = {
                latitude: 38.969555,
                longitude: null
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when longitude is undefined', function(done) {

            const _center = {
                latitude: 38.969555,
                longitude: undefined
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when longitude < -180', function(done) {

            const _center = {
                latitude: 38.969555,
                longitude: -181
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when longitude > 180', function(done) {

            const _center = {
                latitude: 38.969555,
                longitude: 181
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when radius is a string', function(done) {

            const _center = {
                latitude: 38.969555,
                longitude: -77.386098
            };
            const _radius = 'abc';

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when radius is null', function(done) {

            const _center = {
                latitude: 38.969555,
                longitude: null
            };
            const _radius = 1609.34;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when radius is undefined', function(done) {

            const _center = {
                latitude: 38.969555,
                longitude: -77.386098
            };
            const _radius = undefined;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });

        it('should return an object with lat long coordinates when radius is negative', function(done) {

            const _center = {
                latitude: 38.969555,
                longitude: -77.386098
            };
            const _radius = -1600;

            let _g = new Generator(_opts);
            let data = _g.location(_center, _radius);

            expect(data).to.have.property('latitude');
            expect(data).to.have.property('longitude');
            expect(data.latitude).to.be.above(-90)
            expect(data.longitude).to.be.above(-180)
            expect(data.latitude).to.be.below(90)
            expect(data.longitude).to.be.below(180)
            done();

        });
    });


});