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

let moment = require('moment');
let AWS = require('aws-sdk');

/**
 * Helper function to interact with AWS IoT for cfn custom resource.
 *
 * @class iotHelper
 */
class iotHelper {

    /**
     * @class iotHelper
     * @constructor
     */
    constructor() {
        this.creds = new AWS.EnvironmentCredentials('AWS'); // Lambda provided credentials
    }

    getIotEndpoint() {
        return new Promise((resolve, reject) => {

            let iot = new AWS.Iot({
                region: process.env.AWS_REGION
            });
            let params = {
                endpointType: 'iot:Data-ATS'
            };
            iot.describeEndpoint(params, function(err, endpt) {
                if (err) {
                    console.log(`Error occurred while attempting to retrieve the AWS IoT endpoint for region ${process.env.AWS_REGION}.`);
                    reject(err)
                } else {
                    resolve(endpt.endpointAddress);
                }
            });

        });
    };


}

module.exports = iotHelper;