/*********************************************************************************************************************
 *  Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
 *                                                                                                                    *
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

/**
 * Viperlight is a customized derivative of the open source project Hawkeye [https://github.com/Stono/hawkeye].
 */

/**
 * @author Solution Builders
 */

'use strict';
const random = require('generate-random-data');
const moment = require('moment');
const shortid = require('shortid');
const uuidV4 = require('uuid/v4');
const validate = require('validate.js');
const grp = require('generate-random-points');

// Generator class for generating random data values based on type
class Generator {
    constructor(options) {
        this.options = options;
    };

    str(min, max) {

        min = this._isValidInteger('min', min, 3);
        max = this._isValidInteger('max', max, 7);

        min = this._checkGreaterThanZero('min', min, 3);
        max = this._checkGreaterThanZero('max', max, 7);

        min = this._checkLessThanValue('min', 'max', min, max);

        return random.str('lower', min, max);
    }

    int(min, max) {
        min = this._isValidInteger('min', min, 0);
        max = this._isValidInteger('max', max, 5);

        min = this._checkLessThanValue('min', 'max', min, max);

        return random.int(min, max);
    }

    ts(format) {
        let _ts = null;
        switch (format) {
            case 'unix':
                _ts = moment().format('x');
                break;
            default:
                _ts = moment().format('YYYY-MM-DDTHH:mm:ss');
                break;
        }
        return _ts;
    }

    bool(min, max, seed) {

        min = this._isValidInteger('min', min, 0);
        max = this._isValidInteger('max', max, 5);
        seed = this._isValidInteger('seed', seed, 2);

        min = this._checkLessThanValue('min', 'max', min, max);

        return random.boolean(min, max, seed);
    }

    range(start, stop, step) {
        start = this._isValidInteger('start', start, 0);
        stop = this._isValidInteger('stop', stop, 10);
        step = this._isValidInteger('step', step, 2);

        start = this._checkLessThanValue('start', 'stop', start, stop);

        return random.range(start, stop, step);
    }

    float(iMin, iMax, dMin, dMax, precision) {
        iMin = this._isValidInteger('iMin', iMin, 0);
        iMax = this._isValidInteger('iMax', iMax, 0);
        dMin = this._isValidInteger('dMin', dMin, 0);
        dMax = this._isValidInteger('dMax', dMax, 99);
        precision = this._isValidInteger('precision', precision, 1);

        iMin = this._checkLessThanValue('iMin', 'iMax', iMin, iMax);
        dMin = this._checkLessThanValue('dMin', 'dMax', dMin, dMax);

        precision = this._checkGreaterThanZero('precision', precision, 1);

        return random.float(iMin, iMax, dMin, dMax, precision);
    }

    pickSome(arr, count, shuffle) {
        arr = this._isValidArray('arr', arr, [1, 2, 3, 4, 5]);

        count = this._isValidInteger('count', count, 2);
        count = this._checkGreaterThanZero('count', count, 2);

        shuffle = this._isValidBool('shuffle', shuffle, true);

        return random.pickSome(arr, count, shuffle);
    }

    pickOne(arr) {
        arr = this._isValidArray('arr', arr, [1, 2, 3, 4, 5]);

        return random.pickOne(arr);
    }

    uuid() {
        return uuidV4();
    }

    shortid() {
        return shortid.generate();
    }

    location(centerPosition, radius) {

        centerPosition.latitude = this._isNumber('center position latitude', centerPosition.latitude, 38.9072);
        centerPosition.longitude = this._isNumber('center position longitude', centerPosition.longitude, 77.0369);
        radius = this._isNumber('radius', radius, 1609.3);

        centerPosition.latitude = this._isValidLatitude('center position latitude', centerPosition.latitude, 38.9072);
        centerPosition.longitude = this._isValidLongitude('center position longitude', centerPosition.longitude, 77.0369);
        radius = this._checkGreaterThanZero('radius', radius, 1609.3);

        return grp.generateRandomPoint(centerPosition, radius);
    }

    _isValidLatitude(nm, val, defaultVal) {
        let _constraints = {
            numericality: {
                greaterThanOrEqualTo: -90,
                lessThanOrEqualTo: 90
            }
        };
        if (validate.single(val, _constraints)) {
            this.options.logger.log(`${nm} value is < -90 or > 90, setting ${nm} equal ${defaultVal}`, this.options.logger.levels.ROBUST);
            val = defaultVal;
        }

        return val;
    }

    _isValidLongitude(nm, val, defaultVal) {
        let _constraints = {
            numericality: {
                greaterThanOrEqualTo: -180,
                lessThanOrEqualTo: 180
            }
        };
        if (validate.single(val, _constraints)) {
            this.options.logger.log(`${nm} value is < -180 or > 180, setting ${nm} equal ${defaultVal}`, this.options.logger.levels.ROBUST);
            val = defaultVal;
        }

        return val;
    }

    _isNumber(nm, val, defaultVal) {
        if (!validate.isNumber(val)) {
            this.options.logger.log(`invalid ${nm} number for generating random value, setting ${nm} to ${defaultVal}`, this.options.logger.levels.ROBUST);
            val = defaultVal;
        }

        return val;
    }

    _isValidInteger(nm, val, defaultVal) {
        if (!validate.isInteger(val)) {
            this.options.logger.log(`invalid ${nm} integer for generating random value, setting ${nm} to ${defaultVal}`, this.options.logger.levels.ROBUST);
            val = defaultVal;
        }

        return val;
    }

    _isValidBool(nm, val, defaultVal) {
        if (!validate.isBoolean(val)) {
            this.options.logger.log(`invalid ${nm} boolean for generating random value, setting ${nm} to ${defaultVal}`, this.options.logger.levels.ROBUST);
            val = defaultVal;
        }

        return val;
    }

    _isValidArray(nm, arr, defaultArr) {
        if (!validate.isArray(arr)) {
            this.options.logger.log(`invalid ${nm} value for picking random value from array, setting ${nm} to ${defaultArr}`, this.options.logger.levels.ROBUST);
            arr = defaultArr;
        }

        return arr;
    }

    _checkGreaterThanZero(nm, val, defaultVal) {
        let _constraints = {
            numericality: {
                greaterThan: 0
            }
        };
        if (validate.single(val, _constraints)) {
            this.options.logger.log(`${nm} value is less than zero, setting ${nm} equal ${defaultVal}`, this.options.logger.levels.ROBUST);
            val = defaultVal;
        }

        return val;
    }

    _checkLessThanValue(nm, chkNm, val, chkVal) {
        let _constraints = {
            numericality: {
                lessThan: chkVal
            }
        };
        if (validate.single(val, _constraints)) {
            this.options.logger.log(`${nm} value is greater than the ${chkNm} value, setting ${nm} equal to ${chkNm}`, this.options.logger.levels.ROBUST);
            val = chkVal;
        }

        return val;
    }

};

module.exports = Generator;