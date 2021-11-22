// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');

class TorqueCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0.0;
        this.engineToTorque = 500.0 / 16382.0;
        this.name = 'torqueAtTransmission';
        this.gearNumbers = {
            'neutral': 0,
            'first': 1,
            'second': 2,
            'third': 3,
            'fourth': 4,
            'fifth': 5,
            'sixth': 6
        };
    }

    iterate(snapshot) {
        let accelerator = snapshot['acceleratorPedalPosition'];
        let engineSpeed = snapshot['engineSpeed'];
        let engineRunning = snapshot['engineRunning'];
        let gearNumber = this.gearNumbers[snapshot['transmissionGearPosition']];
        gearNumber = gearNumber - 1; //First gear is the basline.

        if (gearNumber < 1) {
            gearNumber = 1;
        }

        // Giving sixth gear half the torque of first.
        let gearRatio = 1 - (gearNumber * .1);

        let drag = engineSpeed * this.engineToTorque;
        let power = accelerator * 15 * gearRatio;

        if (engineRunning) {
            this.data = power - drag;
        } else {
            this.data = -drag;
        }
    }

}

module.exports = TorqueCalc;
