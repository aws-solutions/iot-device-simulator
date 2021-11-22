// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');
const moment = require('moment');

class LatCalc extends DataCalc {

    constructor() {
        super();
        this.data = 42.292834;
        this.lastCalc = moment();
        this.earthCircumferenceKm = 40075.0;
        this.kmPerDeg = this.earthCircumferenceKm / 360.0;
        this.name = 'latitude';
    }

    iterate(snapshot) {
        let vehicleSpeed = snapshot.vehicleSpeed;
        let heading = snapshot.heading;

        let currentTime = moment();
        let timeDelta = moment.duration(currentTime.diff(this.lastCalc));
        let timeStep = timeDelta.get('seconds') + (timeDelta.get('milliseconds').toFixed(4) / 1000);
        this.lastCalc = moment();

        let distance = timeStep * (vehicleSpeed / 3600); // Time * km / s.

        let NSDist = distance * Math.cos(heading);
        let deltaLat = NSDist / this.kmPerDeg;

        this.data = this.data + deltaLat;

    }

}

module.exports = LatCalc;
