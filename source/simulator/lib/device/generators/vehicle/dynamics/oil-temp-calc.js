// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');
const moment = require('moment');

class OilTempCalc extends DataCalc {

    constructor() {
        super();
        this.data = 0;
        this.lastCalc = moment();
        this.totalTime = 0;
        this.operatingZone = 0.0;
        this.triggerTripped = false;
        this.name = 'oilTemp';
    }

    iterate(snapshot) {

        let TEMP_COEFFICIENT = 2.0417;
        let snapshotTriggers = snapshot.triggers;

        let currentTime = moment();
        let timeDelta = moment.duration(currentTime.diff(this.lastCalc));
        let timeStep = timeDelta.get('seconds') + (timeDelta.get('milliseconds').toFixed(4) / 1000);
        this.lastCalc = moment();
        this.totalTime = this.totalTime + timeStep;

        if (this.totalTime <= 120 && !snapshotTriggers.highOilTemp) {
            let _oiltemp = timeStep * TEMP_COEFFICIENT; // Time * degree/sec.
            this.data = this.data + _oiltemp;
            this.operatingZone = this.data;
        } else {
            // normal oil temp jitter
            let _upper = this.operatingZone + 5;
            let _lower = this.operatingZone - 5;
            this.data = (Math.random() * (_upper - _lower) + _lower);
        }

        if (snapshotTriggers) {
            if (snapshotTriggers.highOilTemp && !this.triggerTripped) {
                this.operatingZone = this._getHighTemp();
                this.triggerTripped = true;
            }
        }
    }

    _getHighTemp() {
        return Math.floor(Math.random() * (320 - 275)) + 275;
    }

}

module.exports = OilTempCalc;
