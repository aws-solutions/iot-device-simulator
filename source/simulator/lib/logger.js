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
 * @author Solution Builders
 */

'use strict';

const moment = require('moment');
const colors = require('colors');
let loggingLevel = 1;

// Logging class for sending messages to console log
class Logger {

    constructor(loggingLevel) {
        loggingLevel = loggingLevel;
    }

    log(message, level) {
        if (level <= loggingLevel) {
            console.log(moment.utc().format('YYYY-MM-DD HH:mm:ss'), ' : ', '[info] ', message);
        }
    }

    warn(message, level) {
        if (level <= loggingLevel) {
            console.log(moment.utc().format('YYYY-MM-DD HH:mm:ss'), ' : ', '[warn] ', colors.yellow(message));
        }
    }

    error(message, level) {
        if (level <= loggingLevel) {
            console.log(moment.utc().format('YYYY-MM-DD HH:mm:ss'), ' : ', '[error] ', colors.red(message));
        }
    }

    debug(message, level) {
        if (level <= loggingLevel) {
            console.log(moment.utc().format('YYYY-MM-DD HH:mm:ss'), ' : ', '[debug] ', colors.grey(message));
        }
    }

    get levels() {
        return {
            INFO: 1,
            ROBUST: 2,
            DEBUG: 3
        }
    }

    setLoggingLevel(value) {
        this.log(`Setting logging level to ${value}`, this.levels.INFO);
        loggingLevel = value;
    }

};

module.exports = Object.freeze(Logger);