const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');

before(function() {
    chai.use(sinonChai);
});

beforeEach(function() {
    this.sandbox = sinon.createSandbox();
});

afterEach(function() {
    this.sandbox.restore();
});