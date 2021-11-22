// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');

class GearIntCalc extends DataCalc {

    constructor() {
        super();
        this.speeds = [
            [0, 0],
            [0, 25],
            [20, 50],
            [45, 75],
            [70, 100],
            [95, 125],
            [120, 500]
        ];
        this.data = 1;
        this.name = 'transmissionGearInt';
    }

    shiftUp() {
        this.data = this.data + 1;
        if (this.data > 6) {
            this.data = 6;
        }
    }

    shiftDown() {
        this.data = this.data - 1;
        if (this.data < 1) {
            this.data = 1;
        }
    }

    iterate(snapshot) {
        let manual = snapshot['manualTrans'];
        let vehicleSpeed = snapshot['vehicleSpeed'];

        if (!manual) {
            if (vehicleSpeed < this.speeds[this.data][0]) {
                this.data = this.data - 1;
            } else if (vehicleSpeed > this.speeds[this.data][1]) {
                this.data = this.data + 1;
            }
        }
    }

}

module.exports = GearIntCalc;
