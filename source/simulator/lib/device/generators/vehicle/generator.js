// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

const DynamicsModel = require('./dynamics/dynamics-model.js');
const moment = require('moment');
const { nanoid, customAlphabet } = require('nanoid');

/**
 * @class Generator - Generates messages for devices
 */
class Generator {

    constructor(options) {
        this.options = options;
        this.VIN = options.staticValues?.VIN || this._createVIN();
        this.tripId = options.staticValues?.tripId || nanoid();
        let dynamicsModelParams = {}
        dynamicsModelParams.snapshot = options.currentState || {};
        this.dynamicsModel = new DynamicsModel(dynamicsModelParams);
        this.isRunning = true;
        this.messages = [];
        this.lastCalc = moment();
        this.currentState = options.currentState || {};
        this.staticValues = options.staticValues || { VIN: this.VIN, tripId: this.tripId };
    }

    /**
     * Stop the generator and the vehicle dynamics model
     */
    stop() {
        let _self = this;
        _self.dynamicsModel.stopPhysicsLoop();
        _self.currentState = _self.dynamicsModel.snapshot;
        _self.dynamicsModel.engineRunning = false;
        _self.dynamicsModel.ignitionData = 'off';
        _self.isRunning = false;
    }

    /**
     * Generates the message to be sent
     * @param {object} payload 
     * @param {string} topic 
     * @param {string} id 
     */
    generateMessagePayload(payload, topic, id) {

        if (this.dynamicsModel.ignitionData === 'run') {
            let snapshot = this.dynamicsModel.snapshot;

            let _message = {
                topic: topic,
                payload: {
                    timestamp: moment.utc().format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS'),
                    trip_id: this.tripId,
                    VIN: this.VIN
                }
            }

            for (let attribute of payload) {
                if (snapshot.hasOwnProperty(attribute.name) || attribute.name === 'location') {

                    let value;
                    if (attribute.name === "location") {
                        value = {
                            latitude: snapshot.latitude,
                            longitude: snapshot.longitude
                        }
                    } else {
                        value = snapshot[attribute.name];
                    }
                    if (attribute.precision) {
                        let rounding = Math.round(Math.log10(1 / attribute.precision));
                        value = Number(Number(value).toFixed(rounding));
                    }

                    _message.payload[attribute.name] = value;
                }
            }

            // save last processed snapshot
            this.currentState = snapshot;
            //add device id for filtering in UI
            _message.payload._id_ = id;

            this.messages.push(_message);
        }
    }

    /**
     * clears all the messages waiting to be sent
     */
    clearMessages() {
        this.messages = [];
    }

    /**
     * Creates a random VIN number
     * @returns a random VIN number
     */
    _createVIN() {
        return (customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 17)());
    }


}

module.exports = Generator;