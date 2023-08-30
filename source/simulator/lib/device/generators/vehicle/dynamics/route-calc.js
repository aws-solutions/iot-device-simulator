// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';

const DataCalc = require('./data-calc.js');
const moment = require('moment');

class RouteCalc extends DataCalc {

    constructor(params) {
        super();
        this.data = {
            routeName: params.routeName,
            routeStage: params.routeStage,
            burndown: params.burndown,
            burndownCalc: params.burndownCalc,
            routeEnded: params.routeEnded,
            randomTriggers: params.randomTriggers
        };
        this.name = 'routeInfo';
        this._initializeData(params);
    }

    _initializeData(params) {
        this.lastCalc = moment();
        this.lastJitterCalc = moment();
        this._lastThrottleCalc = moment();
        this._lastBrakeCalc = moment();
        this._lastBurndownCalc = moment(this.data.burndownCalc);
        this._throttleAdjDuration = this._getRandomThrottleAdjPeriod();
        this._randomTriggers = params.randomTriggers || this._getRandomTriggers(params.route);
        this.currentStage = this.data.routeStage;
        this._curThrottlePosition = this._getRandomStartSpeed(params.route.profile);
        this._throttlePosition = this._curThrottlePosition;
        this._brakePosition = 0.0;
        this._routeDuration = moment.duration(0);
        this._routeEnded = this.data.routeEnded;
        this._burndown = this.data.burndown;
        this._updateTriggers = false;
        this._triggers = {};
        this.route = params.route;
        let stageIndex = this.currentStage < this.route.stages.length ? this.currentStage : this.route.stages.length - 1;
        this.route.stages[stageIndex].odometerStart = params.odometer;
        this.route.stages[stageIndex].routeStart = moment();
        this.latitude = this.route.stages[stageIndex].start[1];
        this.longitude = this.route.stages[stageIndex].start[0];

        // static jitter values
        this.jitterPeriod = 7000;
        this.throttleJitter = 4;

    }

    get throttlePosition() {
        return this._throttlePosition;
    }

    get brakePosition() {
        return this._brakePosition;
    }

    get routeDuration() {
        return this._routeDuration;
    }

    get routeEnded() {
        return this._routeEnded;
    }

    get updateTriggers() {
        return this._updateTriggers;
    }

    get triggers() {
        return this._triggers;
    }

    iterate(snapshot) {
        let _odometer = snapshot.odometer;
        let _moveStage = false;
        let _currentTime = moment();
        this._updateTriggers = false;

        if (!this._routeEnded) {

            _moveStage = this._iterateMoveStage(_odometer, _moveStage, _currentTime);

            if (this._routeEnded) {
                let _routeDelta = moment.duration(_currentTime.diff(this.route.stages[0].routeStart));
                this._routeDuration = _routeDelta;
                this._curThrottlePosition = 0.0
                this._throttlePosition = 0.0;
                this._brakePosition = 0.0;
            } else {
                let _jitterTimeDelta = _currentTime.diff(this.lastJitterCalc);
                if (this.jitterPeriod <= _jitterTimeDelta) {
                    // met or surpassed duration for jitter, set random throttle position
                    if (this._throttlePosition !== 0 && this._throttlePosition !== 100 &&
                        this._brakePosition === 0) {
                        this._throttlePosition = this._getJitterPosition(
                            this._curThrottlePosition,
                            this.throttleJitter
                        );
                    }

                    this.lastJitterCalc = moment();
                }

                this.data.routeStage = this.currentStage;
            }
        }

    }

    _iterateMoveStage(_odometer, _moveStage, _currentTime) {
        if (!this._burndown) {
            let _milage = this.route.stages[this.currentStage].odometerStart +
                this.route.stages[this.currentStage].km;

            if ((_milage) <= _odometer) {
                // met or suprassed milage for stage, move to next stage
                _moveStage = true;
            }

            // check for throttle adjustment
            this._checkForThrottleAdjustment(_currentTime);

            this._updateRandomTriger(_odometer);

            if (_moveStage) {
                //transition to next stage in route
                this.currentStage++;
                this._transitionNextStage(_odometer);
            }
        } else {
            //set end of route flag
            this._throttlePosition = 0.0;
            this._brakePosition = 100.0;
            let endTimeDelta = _currentTime.diff(this._lastBurndownCalc);
            if (endTimeDelta >= 20000) {
                this._routeEnded = true;
                this.data.routeEnded = this._routeEnded;
                this._burndown = false;
                this.data.burndown = this._burndown;
                this.latitude = this.route.stages[this.currentStage - 1].end[1];
                this.longitude = this.route.stages[this.currentStage - 1].end[0];
            }
        }
        return _moveStage;
    }

    _updateRandomTriger(_odometer) {
        for (let randomTrigger of this._randomTriggers) {
            if (_odometer >= randomTrigger.km) {
                if (randomTrigger.type === 'brake' && !randomTrigger.triggered) {
                    this._throttlePosition = 0.0;
                    this._brakePosition = 100.0;
                    randomTrigger.triggered = true;
                }

                if (randomTrigger.type === 'oiltemp' && !randomTrigger.triggered) {
                    // update to inculde new triggers
                    this._triggers = {
                        highOilTemp: true
                    };
                    this._updateTriggers = true;
                    randomTrigger.triggered = true;
                }
            }
        }
    }

    _transitionNextStage(_odometer) {
        if (this.currentStage < this.route.stages.length) {
            //initialize the new stage
            this.route.stages[this.currentStage].odometerStart = _odometer;
            this.latitude = this.route.stages[this.currentStage].start[1];
            this.longitude = this.route.stages[this.currentStage].start[0];
            this.lastCalc = moment();

            if (this.route.stages[this.currentStage].triggers) {
                // update to inculde new triggers
                this._triggers = this.route.stages[this.currentStage].triggers;
                this._updateTriggers = true;
            }
        } else {
            this._burndown = true;
            this.data.burndown = this._burndown;
            this._lastBurndownCalc = moment();
            this.burndownCalc = this._lastBurndownCalc.toISOString();
        }
    }

    _checkForThrottleAdjustment(_currentTime) {
        let _throttleTimeDelta = _currentTime.diff(this._lastThrottleCalc);
        if (this._throttleAdjDuration <= _throttleTimeDelta) {
            this._curThrottlePosition = this._curThrottlePosition + this._getRandomThrottlePosition(this.route
                .profile);

            if (this._curThrottlePosition >= 100) {
                this._curThrottlePosition = 99;
            }

            if (this._curThrottlePosition < 0) {
                this._curThrottlePosition = 5;
            }

            this._brakePosition = 0.0;
            this._throttlePosition = this._curThrottlePosition;
            this._throttleAdjDuration = this._getRandomThrottleAdjPeriod();
            this._lastThrottleCalc = moment();
        }
    }

    _getRandomTriggers(route) {
        let _triggers = [];
        let _upper = route.km;
        let _lower = 0.2;

        if (route.triggers) {
            for (let triggers of route.triggers) {
                for (let j = 0; j < triggers.occurances; j++) {
                    let _rand = (Math.random() * (_upper - _lower) + _lower).toFixed(1);
                    _triggers.push({
                        type: triggers.type,
                        km: Math.round(_rand * 100) / 100,
                        triggered: false
                    });
                }
            }
        }
        this.data.randomTriggers = _triggers;
        return _triggers;
    }

    _getRandomStartSpeed(profile) {
        let _upper = 40.0;
        let _lower = 10.0;

        if (profile === 'aggressive') {
            _lower = 20;
            _upper = 50.0;
        }

        return Math.random() * (_upper - _lower) + _lower;
    }

    _getRandomThrottlePosition(profile) {
        let _normal = [2, 2, 2, 2, 2, 2, 2, 2, 2, 25, 5, 5, 5, 5, 5, 5, 5, 5, 5, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8,
            8, 8, 8, 8, 8, 8, 8, 8, 15,
            15, 15, 15, 20, 20
        ];
        let _aggressive = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 15, 15, 15,
            15,
            15, 15, 15, 15, 15, 15, 20, 20, 20, 20, 20, 20, 20, 20, 25, 25, 25, 25
        ];
        let _upper = _normal.length;
        let _lower = 0;

        if (profile === 'aggressive') {
            _upper = _aggressive.length;
        }

        let _randMultiplier = Math.floor(Math.random() * 2) + 1;
        let _multiplier = _randMultiplier === 2 ? -1 : 1;
        let _rand = Math.floor(Math.random() * (_upper - _lower)) + _lower;
        return _multiplier * (profile === 'aggressive' ? _aggressive[_rand] : _normal[_rand]);
    }

    _getRandomThrottleAdjPeriod() {
        let _upper = 60000;
        let _lower = 30000;

        return Math.floor(Math.random() * (_upper - _lower)) + _lower;
    }

    _getJitterPosition(stagePosition, jitter) {
        let _upper = stagePosition + jitter;
        if (_upper > 100.0) {
            _upper = 100.0;
        }

        let _lower = 0.0;
        if (stagePosition !== 0.0) {
            _lower = stagePosition - jitter;
            if (_lower < 0.0) {
                _lower = 0.0;
            }
        }

        return Math.floor(Math.random() * (_upper - _lower)) + _lower;
    }

}

module.exports = RouteCalc;