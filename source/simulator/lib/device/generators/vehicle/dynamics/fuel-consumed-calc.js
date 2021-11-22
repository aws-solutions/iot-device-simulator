// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');
const moment = require('moment');

class FuelConsumedCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0.0;
        this.lastCalc = moment();
        this.maxFuel = 0.0015; // #In liters per second at full throttle.
        this.idleFuel = 0.000015;
        this.name = 'fuelConsumedSinceRestart';
    }

    iterate(snapshot) {
        let acceleratorPercent = snapshot['acceleratorPedalPosition'];
        let ignitionStatus = snapshot['engineRunning'];

        let currentTime = moment();
        let timeDelta = moment.duration(currentTime.diff(this.lastCalc));
        let timeStep = timeDelta.get('seconds') + (timeDelta.get('milliseconds').toFixed(4) / 1000);
        this.lastCalc = moment();

        if (ignitionStatus) {
            this.data = this.data + this.idleFuel + (this.maxFuel * (acceleratorPercent / 100) * timeStep);
        }
    }

}

module.exports = FuelConsumedCalc;
