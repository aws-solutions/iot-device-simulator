// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const Engine = require('./lib/engine');
const AWS = require('aws-sdk');
const iot = new AWS.Iot({ region: process.env.AWS_REGION });

exports.handler = async (event, context) => {

    'use strict';
    context.callbackWaitsForEmptyEventLoop = false;
    let results = [];
    let options = event.options ? event.options : {};
    let simulation = event.simulation;
    let devices = event.devices ? event.devices : simulation.devices;
    delete simulation.devices;
    options.context = context;

    //Restart already started simulation
    if (options.restart === true) {
        options.restart = false;
        results = await Promise.all(devices.map(async (device) => {
            try {
                const engine = new Engine(options, simulation, device);
                return engine.start();
            } catch (err) {
                console.error(err);
                throw err;
            }
        }))
    }
    else {
        //start engine for each device type
        results = await Promise.all(
            devices.map(async device => {
                device.info = AWS.DynamoDB.Converter.unmarshall(device.info);
                try {
                    // create engine instance and start
                    const engine = new Engine(options, simulation, device);
                    return engine.start();
                } catch (err) {
                    throw err;
                }
            }));
    }
    //make sure every device for every device type is completed
    options.restart = !results.every((result) => result === 'complete');
    //delete unncessary information to reduce data passed through step fucntions
    delete options.context;
    delete options.currentState;
    delete options.staticValues;
    results = {
        options: options,
        simulation: simulation,
        devices: results
    }
    return results;
};


