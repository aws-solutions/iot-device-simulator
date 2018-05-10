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

// Logging class for sending messages to console log
class Logger {

    constructor() {}

    static log(level, ...message) {
        if (level <= process.env.LOGGING_LEVEL) {
            console.log('[info] ', message);
        }
    }

    static warn(level, ...message) {
        if (level <= process.env.LOGGING_LEVEL) {
            console.log('[warn] ', message);
        }
    }

    static error(level, ...message) {
        if (level <= process.env.LOGGING_LEVEL) {
            console.log('[error] ', message);
        }
    }

    static get levels() {
        return {
            INFO: 1,
            ROBUST: 2
        }
    }

};

module.exports = Object.freeze(Logger);