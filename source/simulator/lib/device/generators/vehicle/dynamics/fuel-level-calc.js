// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');

class FuelLevelCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0.0;
        this.tankSize = 40.0; //liters
        this.name = 'fuelLevel';
    }

    iterate(snapshot) {
        let fuelConsumed = snapshot['fuelConsumedSinceRestart']

        this.data = 100.0 * (this.tankSize - fuelConsumed) / this.tankSize;
    }

}

module.exports = FuelLevelCalc;
