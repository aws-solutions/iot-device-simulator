// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');
const moment = require('moment');

class SpeedCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0.0;
        this.lastCalc = moment();
        this.name = 'vehicleSpeed';
    }

    iterate(snapshot) {
        let acceleratorPercent = snapshot.acceleratorPedalPosition;
        let brake = snapshot.brake;
        let parkingBrakeStatus = snapshot.parkingBrakeStatus;
        let ignitionStatus = snapshot.engineRunning;
        let engineSpeed = snapshot.engineSpeed;
        let gear = snapshot.transmissionGearInt;

        // Any necessary data should be passed in
        let AIR_DRAG_COEFFICIENT = .000008;
        let ENGINE_DRAG_COEFFICIENT = 0.0004;
        let BRAKE_CONSTANT = 0.1;
        let ENGINE_V0_FORCE = 30; //units are cars * km / h / s
        let speed = this.data; //Just to avoid confution

        let airDrag = speed * speed * speed * AIR_DRAG_COEFFICIENT;

        let engineDrag = engineSpeed * ENGINE_DRAG_COEFFICIENT;

        let engineForce = 0.0;
        if (ignitionStatus) {
            //acceleratorPercent is 0.0 to 100.0, not 0
            engineForce = (ENGINE_V0_FORCE * acceleratorPercent / (50 * gear));
        }

        let acceleration = engineForce - airDrag - engineDrag - .1 - (brake * BRAKE_CONSTANT);

        if (parkingBrakeStatus) {
            acceleration = acceleration - (BRAKE_CONSTANT * 100);
        }

        let currentTime = moment();
        let timeDelta = moment.duration(currentTime.diff(this.lastCalc));
        let timeStep = timeDelta.get('seconds') + (timeDelta.get('milliseconds').toFixed(4) / 1000);
        this.lastCalc = moment();

        let impulse = acceleration * timeStep;
        if ((impulse + speed) < 0.0) {
            impulse = -speed;
        }

        this.data = speed + impulse;
    }
}

module.exports = SpeedCalc;
