// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';
let Generator = require('./generator.js');
let DynamicsModel = require('./dynamics/dynamics-model.js');
let { nanoid, customAlphabet } = require('nanoid');
let options = {};

jest.mock('nanoid');
jest.mock('./dynamics/dynamics-model.js');
describe('Generator', function() {
    describe('constructor()', function() {
        it('should use default values when none are provided via options', async() => {
            DynamicsModel.mockImplementationOnce(() => ({}));
            nanoid.mockImplementationOnce(() => "xyz");
            jest.spyOn(Generator.prototype, "_createVIN").mockImplementationOnce(() => "abc");
            const generator = new Generator(options);

            expect(generator.options).toEqual(options);
            expect(generator.currentState).toEqual({});
            expect(generator.staticValues).toEqual({
                VIN: "abc",
                tripId: "xyz"
            });
            expect(generator.isRunning).toEqual(true);
            expect(generator.messages).toEqual([]);
        })
        it('should use provided values when provided via options', async() => {
            options.currentState = {state: "current"};
            options.staticValues = {static: "values"};
            options.staticValues.VIN = "a1b2";
            options.staticValues.tripId = "tripA";
            const generator = new Generator(options);
            expect(generator.options).toEqual(options);
            expect(generator.VIN).toEqual("a1b2");
            expect(generator.tripId).toEqual("tripA")
            expect(generator.currentState).toEqual(options.currentState);
            expect(generator.staticValues).toEqual(options.staticValues);
            expect(generator.isRunning).toEqual(true);
            expect(generator.messages).toEqual([]);
            expect(DynamicsModel).toHaveBeenCalledWith(expect.objectContaining({
                snapshot: options.currentState,
            }))
        })
    })
    describe("stop()", function() {
        it('should stop dynamics model and generator', async() => {
            DynamicsModel.mockImplementationOnce(() => ({
                stopPhysicsLoop: jest.fn(),
                snapshot: {}
            }))
            const generator = new Generator(options);
            generator.stop();
            expect(generator.isRunning).toBe(false);
            expect(generator.dynamicsModel.engineRunning).toBe(false);
            expect(generator.dynamicsModel.ignitionData).toBe('off');
            expect(generator.dynamicsModel.stopPhysicsLoop).toHaveBeenCalledTimes(1);
            expect(generator.currentState).toEqual({});
        })
    })
    describe("clearMessages()", function() {
        it('should clear generator messages', async() => {
            DynamicsModel.mockImplementationOnce(() => ({
                stopPhysicsLoop: jest.fn(),
                snapshot: {}
            }))
            const generator = new Generator(options);
            generator.messages = [1,2,3]
            generator.clearMessages();
            expect(generator.messages).toHaveLength(0);
        })
    })
    describe("_createVin()", function() {
        it('should return result of customAlphabet function', async() => {
            customAlphabet.mockImplementationOnce(() => () => 'ABC123')
            const generator = new Generator(options);
            const result = generator._createVIN();
            expect(result).toEqual('ABC123');
        })
    })
    describe("generatePayload()", function() {
        it('should add dynamicsModel snapshot to current state', async() => {
            const generator = new Generator(options);
            generator.dynamicsModel.snapshot = {test: "snapshot"};
            generator.dynamicsModel.ignitionData = "run";
            generator.generateMessagePayload([], 'topic', 'id');
            expect(generator.currentState).toEqual({test: "snapshot"});
            expect(generator.messages).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        topic: "topic",
                        payload: expect.objectContaining({
                            _id_: 'id',
                            VIN: generator.VIN,
                            trip_id: generator.tripId
                        })
            })]))
        })
        it('should add correspondingdynamicsModel snapshot attributes to current state and message payload', async() => {
            const generator = new Generator(options);
            const payload = [
                {
                    name: 'test'
                },
                {
                    name: 'location'
                },
                {
                    name: 'roundedNumber',
                    precision: .01
                }
            ]
            generator.dynamicsModel.snapshot = {
                test: "snapshot",
                latitude: 85,
                longitude: 85,
                roundedNumber: 1.23456
            };

            generator.dynamicsModel.ignitionData = "run";
            generator.generateMessagePayload(payload, 'topic', 'id');
            expect(generator.currentState).toEqual(generator.dynamicsModel.snapshot);
            expect(generator.messages).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        topic: "topic",
                        payload: expect.objectContaining({
                            _id_: 'id',
                            VIN: generator.VIN,
                            trip_id: generator.tripId,
                            location: {
                                latitude: 85,
                                longitude: 85
                            },
                            test: "snapshot",
                            roundedNumber: 1.23
                        })
            })]))
        })
        it('should not add anything to messages if dynamics model is not running', async () => {
            const generator = new Generator(options);
            generator.generateMessagePayload();
            expect(generator.messages).toHaveLength(0);
            expect(generator.currentState).toEqual(options.currentState);
        })
    })
});