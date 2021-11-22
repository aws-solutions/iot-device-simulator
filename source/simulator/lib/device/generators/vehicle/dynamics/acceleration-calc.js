// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');
const moment = require('moment');

class AccelerationCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0;
        this.lastCalc = moment();
        this.startSpeed = 0.0;
        this.name = 'acceleration';
    }

    iterate(snapshot) {

        let accelPeriod = 1000; // one second
        let _curSpeed = snapshot.vehicleSpeed;

        let _currentTime = moment();
        let _timeDelta = _currentTime.diff(this.lastCalc);

        if (_timeDelta >= accelPeriod) {
            let _accel = (_curSpeed - this.startSpeed) / 1; // speed difference / 1 sec = km/h/s
            this.startSpeed = _curSpeed;
            this.data = _accel;
            this.lastCalc = moment();
        }

    }

}

module.exports = AccelerationCalc;
