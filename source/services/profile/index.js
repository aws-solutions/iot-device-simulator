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

console.log('Loading function');
const Logger = require('logger');
let lib = require('./lib/responseManager.profile.js');

exports.handler = function(event, context, callback) {
    Logger.log(Logger.levels.INFO, 'Profile service recieved event:');
    Logger.log(Logger.levels.INFO, event);

    lib.respond(event).then((data) => {
        return callback(null, data);
    }).catch(err => {
        return callback(err, null);
    });

};