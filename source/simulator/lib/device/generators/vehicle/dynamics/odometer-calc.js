// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');
const moment = require('moment');

class OdometerCalc extends DataCalc {
    // ..and an (optional) custom class constructor. If one is
    // not supplied, a default constructor is used instead:
    // constructor() { }
    constructor() {
        super();
        this.data = 0.0;
        this.lastCalc = moment();
        this.KPHToKPS = 60 * 60;
        this.name = 'odometer';
    }

    iterate(snapshot) {
        let vehicleSpeed = snapshot['vehicleSpeed'] // Any necessary data should be passed in

        let currentTime = moment();
        let timeDelta = moment.duration(currentTime.diff(this.lastCalc));
        let timeStep = timeDelta.get('seconds') + (timeDelta.get('milliseconds').toFixed(4) / 1000);
        this.lastCalc = moment();

        this.data = this.data + (vehicleSpeed * timeStep / this.KPHToKPS);
    }

}

module.exports = OdometerCalc;
