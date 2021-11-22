// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';
let Generator = require('./generator.js');
let options = {}

describe('Generator', function() {
    describe('constructor()', function() {
        it('should use default values when none are provided via options', async() => {
            const generator = new Generator(options);
            expect(generator.options).toEqual(options);
            expect(generator.currentState).toEqual({});
            expect(generator.staticValues).toEqual({});
            expect(generator.isRunning).toEqual(true);
            expect(generator.messages).toEqual([]);
        })
        it('should use provided values when provided via options', async() => {
            options.currentState = {state: "current"};
            options.staticValues = {static: "values"};
            const generator = new Generator(options);
            expect(generator.options).toEqual(options);
            expect(generator.currentState).toEqual({state: "current"});
            expect(generator.staticValues).toEqual({static: "values"});
            expect(generator.isRunning).toEqual(true);
            expect(generator.messages).toEqual([]);
        })
    })
    describe("generateMessagePayload()", function() {
        it('should add generated message to messages', async() => {
            const generator = new Generator(options);
            jest.spyOn(generator, "generatePayload").mockImplementationOnce(() => ({payload: []}))
            generator.generateMessagePayload({}, "topic", "123");
            expect(generator.messages.length).toEqual(1);
            expect(generator.messages[0]).toEqual({
                topic: "topic",
                payload: {
                    payload: [],
                    _id_: "123"
                }
            })
        })
    })
    describe('generatePayload()', function() {
        it('should generate new values if attribute does not contain static', async() => {
            const generator = new Generator(options);
            jest.spyOn(generator, '_processSpecAttribute')
                .mockImplementationOnce(() => "asdf")
                .mockImplementationOnce(() => 1.2);
            const payload = [
                {name: 'static', type: "string"},
                {name: 'other', type: "float"}
            ]
            const result = generator.generatePayload(payload);
            expect(generator._processSpecAttribute).toHaveBeenCalledTimes(2);
            expect(result).toEqual({
                static: "asdf",
                other: 1.2
            })
        })
        it('should return static when static field is true and static value exists', async() => {
            const generator = new Generator(options);
            jest.spyOn(generator, '_processSpecAttribute')
            const payload = [
                {name: 'static', type: "string", static: true}
            ]
            const result = generator.generatePayload(payload);
            expect(generator._processSpecAttribute).toHaveBeenCalledTimes(0);
            expect(result).toEqual({
                static: "values",
            })
        })
        it('should return new value when static field is true but value does not exist', async() => {
            const generator = new Generator(options);
            jest.spyOn(generator, '_processSpecAttribute').mockImplementationOnce(() => "new")
            const payload = [
                {name: 'noStatic', type: "string", static: true}
            ]
            const result = generator.generatePayload(payload);
            expect(generator._processSpecAttribute).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                noStatic: "new",
            })
        })
    })
    describe('_processSpecAttribute()', function() {
        afterEach(() => {
            jest.clearAllMocks()
        })
        it('should return attribute default value when provided', async() => {
            const generator = new Generator(options);
            const attribute = {name: "default", type: "string", default: "abc"};
            const result = generator._processSpecAttribute(attribute);
            expect(result).toEqual(attribute.default);
        })
        it('should add value to currentState if does not already exist', async() => {
            const generator = new Generator(options);
            const attribute = {name: "default", type: "string", min: 1, max: 1};
            generator._processSpecAttribute(attribute);
            expect(generator.currentState['default'].cnt).toEqual(2);
        })
        describe('switch case: "id"', function() {
            it('should return a custom id of length when alphabet and length provided', async() => {
                const generator = new Generator(options);
                const attribute = {name: "id", type: "id", charSet: "xyz", length: 9};
                const result = generator._processSpecAttribute(attribute);
                expect(result).toEqual(
                    expect.stringMatching(/^[xyz]{9}/)
                )
            })
            it('should return a custom id of specified length if provided', async() => {
                const generator = new Generator(options);
                const attribute = {name: "id", type: "id",length: 9};
                const result = generator._processSpecAttribute(attribute);
                expect(result).toHaveLength(9);
                expect(typeof result).toBe("string");
            })
            it('should return an id of length 21 when no length provided', async() => {
                const generator = new Generator(options);
                const attribute = {name: "id", type: "id"};
                const result = generator._processSpecAttribute(attribute);
                expect(result).toHaveLength(21);
                expect(typeof result).toBe("string");
            })
            it('should add result to static values if contains static value true', async() => {
                const generator = new Generator(options);
                const attribute = {name: "id", type: "id", static: true};
                generator._processSpecAttribute(attribute);
                expect(generator.staticValues).toHaveProperty("id");
            })
            
        })
        describe('switch case: "string"', function() {
            it('should return a string with length between min and max', async() => {
                const generator = new Generator(options);
                const attribute = {
                    name: "string", 
                    type: "string", 
                    min: 1,
                    max: 4,
                    static: false
                };
                const result = generator._processSpecAttribute(attribute);
                expect(typeof result).toBe('string');
                expect(result.length).toBeGreaterThanOrEqual(attribute.min);
                expect(result.length).toBeLessThanOrEqual(attribute.max);
                expect(generator.staticValues).not.toHaveProperty("string");
            })
            it('should add result to static values if contains static value true', async() => {
                const generator = new Generator(options);
                const attribute = {
                    name: "string", 
                    type: "string", 
                    min: 1,
                    max: 4,
                    static: true
                };
                generator._processSpecAttribute(attribute);
                expect(generator.staticValues).toHaveProperty("string");
            })
        })
        describe('switch case: "int"', function() {
            it('should return an integer between min and max', async() => {
                const generator = new Generator(options);
                const attribute = {
                    name: "int", 
                    type: "int", 
                    min: 1,
                    max: 4,
                };
                const result = generator._processSpecAttribute(attribute);
                expect(typeof result).toBe('number');
                expect(result).toBeGreaterThanOrEqual(attribute.min);
                expect(result).toBeLessThanOrEqual(attribute.max)
            })
        })
        describe('switch case: "timestamp"', function() {
            it('should return unix timestamp if format is unix ', async() => {
                Date.now = jest.fn(() => '2020-05-13T12:33:37.000Z');
                const generator = new Generator(options);
                const attribute = {
                    name: "timestamp", 
                    type: "timestamp", 
                    tsformat: "unix",
                };
                const result = generator._processSpecAttribute(attribute);
                expect(result).toBe(new Date(Date.now()).getTime().toString());
            })
            it('should return default timestamp if format is default', async() => {
                Date.now = jest.fn(() => '2020-05-13T12:33:37.000Z');
                const generator = new Generator(options);
                const attribute = {
                    name: "timestamp", 
                    type: "timestamp", 
                    format: "default",
                };
                const result = generator._processSpecAttribute(attribute);
                expect(result).toBe("2020-05-13T12:33:37");
            })
        })
        describe('switch case: "bool"', function() {
            it('should return a boolean', async() => {
                Date.now = jest.fn(() => '2020-05-13T12:33:37.000Z');
                const generator = new Generator(options);
                const attribute = {
                    name: "boolean", 
                    type: "bool", 
                };
                const result = generator._processSpecAttribute(attribute);
                expect(typeof result).toBe('boolean');
            })
        })
        describe('switch case: "float"', function() {
            it('should return a number between min and max', async() => {
                Date.now = jest.fn(() => '2020-05-13T12:33:37.000Z');
                const generator = new Generator(options);
                const attribute = {
                    name: "float", 
                    type: "float", 
                    min: 1,
                    max: 2,
                    precision: .01
                };
                const result = generator._processSpecAttribute(attribute);
                expect(typeof result).toBe('number');
                expect(result).toBeGreaterThanOrEqual(attribute.min);
                expect(result).toBeLessThanOrEqual(attribute.max);
            })
        })
        describe('switch case: "pickOne"', function() {
            it('should return an item from provided array', async() => {
                const generator = new Generator(options);
                const attribute = {
                    name: "pickOne", 
                    type: "pickOne", 
                    arr: ["one", "two"],
                    static: false
                };
                const result = generator._processSpecAttribute(attribute);
                expect(attribute.arr).toEqual(
                    expect.arrayContaining([result])
                );
                })
            it('should add value to static values if static is true', async() => {
                const generator = new Generator(options);
                const attribute = {
                    name: "pickOne", 
                    type: "pickOne", 
                    arr: ["one", "two", "three", "four", "five"],
                    static: true
                };
                const result = generator._processSpecAttribute(attribute);
                expect(generator.staticValues).toHaveProperty('pickOne');
            })
        })
        describe('switch case: "location"', function() {
            it('should return a valid location', async() => {
                const generator = new Generator(options);
                const attribute = {
                    name: "location", 
                    type: "location", 
                    lat: 90,
                    long: -180,
                    radius: 60
                };
                const result = generator._processSpecAttribute(attribute);
                expect(result.latitude).toBeGreaterThanOrEqual(-90);
                expect(result.latitude).toBeLessThanOrEqual(90);
                expect(result.longitude).toBeGreaterThanOrEqual(-180);
                expect(result.longitude).toBeLessThanOrEqual(180);
            })
        })
        describe('switch case: "sinusoidal"', function() {
            it('should return the result of the sin() function', async() => {
                const generator = new Generator(options);
                jest.spyOn(generator, 'sin').mockImplementationOnce(() => 25);
                const attribute = {
                    name: "sinusoidal", 
                    type: "sinusoidal", 
                    min: 12,
                    max: 30
                };
                const result = generator._processSpecAttribute(attribute);
                expect(result).toBe(25);
            })
        })
        describe('switch case: "decay"', function() {
            it('should return the result of the decay() function', async() => {
                const generator = new Generator(options);
                jest.spyOn(generator, 'decay').mockImplementationOnce(() => 25);
                const attribute = {
                    name: "decay", 
                    type: "decay", 
                    min: 12,
                    max: 30
                };
                const result = generator._processSpecAttribute(attribute);
                expect(result).toBe(25);
            })
        })
        describe('switch case "object"', function() {
            it('should call call and return the result of the generatePayload() function', async() => {
                const generator = new Generator(options);
                jest.spyOn(generator, 'generatePayload').mockImplementationOnce(() => ({test: "payload"}));
                const attribute = {
                    name: "object", 
                    type: "object", 
                    payload: [{test: "payload"}]
                };
                const result = generator._processSpecAttribute(attribute);
                expect(generator.generatePayload).toHaveBeenCalledTimes(1);
                expect(result).toEqual({test: "payload"});
            })
        })
        describe('switch case "default"', function() {
            it('should return empty string', async() => {
                const generator = new Generator(options);
                jest.spyOn(generator, 'generatePayload').mockImplementationOnce(() => ({test: "payload"}));
                const attribute = {
                    name: "noMatch", 
                    type: "noMatch", 
                    matches: "none"
                };
                const result = generator._processSpecAttribute(attribute);
                expect(result).toBe("");
            })
        })
    })
    describe('clearMessages()', function() {
        it('should clear all messages in geneartor', async() => {
            const generator = new Generator(options);
            generator.messages = [1,2,3];
            generator.clearMessages();
            expect(generator.messages).toHaveLength(0);
        })
    })
    describe('stop()', function() {
        it('should set isRunning to false', async() => {
            const generator = new Generator(options);
            generator.stop();
            expect(generator.isRunning).toBe(false);
        })
    })
});