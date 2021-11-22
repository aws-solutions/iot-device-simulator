// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');
const moment = require('moment');

class LonCalc extends DataCalc {

    constructor() {
        super();
        this.data = 42.292834;
        this.lastCalc = moment();
        this.earthCircumferenceEquatorKm = 40075.0;
        this.kmPerDegEquator = this.earthCircumferenceEquatorKm / 360.0;
        this.name = 'longitude';
    }

    iterate(snapshot) {
        let vehicleSpeed = snapshot.vehicleSpeed;
        let heading = snapshot.heading;
        let lat = snapshot.latitude;

        let currentTime = moment();
        let timeDelta = moment.duration(currentTime.diff(this.lastCalc));
        let timeStep = timeDelta.get('seconds') + (timeDelta.get('milliseconds').toFixed(4) / 1000);
        this.lastCalc = moment();

        let distance = timeStep * (vehicleSpeed / 3600); // Time * km / s.
        let EWDist = distance * Math.sin(heading);
        let latRad = lat * Math.PI / 180;
        let kmPerDeg = Math.abs(this.kmPerDegEquator * Math.sin(latRad));

        let deltaLon = EWDist / kmPerDeg;
        let newLon = this.data + deltaLon;
        while (newLon >= 180.0) {
            newLon = newLon - 360;
        }

        while (newLon < -180) {
            newLon = newLon + 360;
        }

        this.data = newLon;

    }

}

module.exports = LonCalc;
