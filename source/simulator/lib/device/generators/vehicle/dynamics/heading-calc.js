// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');
const moment = require('moment');

class HeadingCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0.0;
        this.lastCalc = moment();
        this.name = 'heading';
    }

    iterate(snapshot) {
        let vehicleSpeed = snapshot.vehicleSpeed;
        let steeringWheelAngle = snapshot.steeringWheelAngle;

        // 600 degree steering == 45 degree wheels.
        let wheelAngle = steeringWheelAngle / 13.33;
        let wheelAngleRad = wheelAngle * Math.PI / 180;
        let calcAngle = -wheelAngleRad;
        if (wheelAngle < 0) {
            calcAngle = calcAngle - (Math.PI / 2);
        } else {
            calcAngle = calcAngle + (Math.PI / 2);
        }

        // should return number between 28 m and infinity
        let turningCircumferenceKm = 0.028 * Math.tan(calcAngle);

        let currentTime = moment();
        let timeDelta = moment.duration(currentTime.diff(this.lastCalc));
        let timeStep = timeDelta.get('seconds') + (timeDelta.get('milliseconds').toFixed(4) / 1000);
        this.lastCalc = moment();

        let distance = timeStep * (vehicleSpeed / 3600); // Time * km / s.

        let deltaHeading = (distance / turningCircumferenceKm) * 2 * Math.PI;
        let tempHeading = this.data + deltaHeading;
        while (tempHeading >= (2 * Math.PI)) {
            tempHeading = tempHeading - (2 * Math.PI);
        }

        while (tempHeading < 0) {
            tempHeading = tempHeading + (2 * Math.PI);
        }

        this.data = tempHeading;
    }

}

module.exports = HeadingCalc;
