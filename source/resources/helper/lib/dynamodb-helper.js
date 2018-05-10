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
let AWS = require('aws-sdk');
const _ = require('underscore');

/**
 * Helper function to interact with dynamodb for cfn custom resource.
 *
 * @class dynamoDBHelper
 */
class dynamoDBHelper {

    /**
     * @class dynamoDBHelper
     * @constructor
     */
    constructor() {
        this.creds = new AWS.EnvironmentCredentials('AWS'); // Lambda provided credentials
        this.dynamoConfig = {
            credentials: this.creds,
            region: process.env.AWS_REGION
        };
    }

    saveItem(item, ddbTable) {
        return new Promise((resolve, reject) => {

            for (var i = 0; i < _.keys(item).length; i++) {
                item[_.keys(item)[i]] = this._checkAssignedDataType(item[_.keys(item)[i]]);
            }

            item.created_at = moment.utc().format();
            item.updated_at = moment.utc().format();

            let params = {
                TableName: ddbTable,
                Item: item
            };

            const docClient = new AWS.DynamoDB.DocumentClient(this.dynamoConfig);
            docClient.put(params, function(err, resp) {
                if (err) {
                    console.log(`Error occurred while attempting to save item ${JSON.stringify(params)}.`);
                    reject(err)
                } else {
                    console.log(`${JSON.stringify(item)} saved.`);
                    resolve(item);
                }
            });

        });
    };

    _checkAssignedDataType(attr) {
        if (_.isObject(attr)) {
            if (_.has(attr, 'N')) {
                return parseInt(attr['N']);
            } else if (_.has(attr, 'B')) {
                return (attr['B'] === 'true');
            } else {
                for (var i = 0; i < _.keys(attr).length; i++) {
                    attr[_.keys(attr)[i]] = this._checkAssignedDataType(attr[_.keys(attr)[i]]);
                }
                return attr;
            }
        } else {
            return attr;
        }

    }

}

module.exports = dynamoDBHelper;