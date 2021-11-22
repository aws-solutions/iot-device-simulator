// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

'use strict';
const { sendAnonymousMetric } = require('../metrics/index');
const AWS = require('aws-sdk');
const { nanoid } = require('nanoid');
const { SOLUTION_ID, VERSION } = process.env;
let options = {};
if (SOLUTION_ID && VERSION && SOLUTION_ID.trim() && VERSION.trim()) {
    options.customUserAgent = `AwsSolution/${SOLUTION_ID}/${VERSION}`;
}
let docClient = new AWS.DynamoDB.DocumentClient(options);
const wait = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Performs crud actions for a simulation, such as, creating, retrieving, updating and deleting simulations.
 *
 * @class SimulationManager
 */
class SimulationManager {
    /**
     * Get simulations
     */
    async getSimulations() {
        let params = {
            TableName: process.env.SIMULATIONS_TBL,
        };
        try {
            console.log(`Attempting to list simulations`);
            let result = await docClient.scan(params).promise();
            let lastEvalKey = result.LastEvaluatedKey;
            while (lastEvalKey && Object.keys(lastEvalKey).length > 0) {
                params.ExclusiveStartKey = lastEvalKey;
                let newResult = await docClient.scan(params).promise();
                result.Items.push(...newResult.Items);
                lastEvalKey = newResult.LastEvaluatedKey;
            }
            return (result.Items);
        } catch (err) {
            console.error(err);
            console.error(`Error occurred while attempting to retrieve simulations.`);
            throw (err);
        }
    }

    /**
     * Retrieves a simulation.
     * @param {string} simId - id of simulation to retrieve
     */
    async getSimulation(simId) {
        try {
            const params = {
                TableName: process.env.SIMULATIONS_TBL,
                Key: {
                    simId: simId
                }
            };

            let data = await docClient.get(params).promise();

            if (data.Item) {
                return (data.Item);
            } else {
                let error = new Error();
                error.code = 400;
                error.error = 'MissingSimulation';
                error.message = `The simulation ${simId} does not exist.`;
                throw (error);
            }
        } catch (err) {
            console.error(err);
            console.error(`Error occurred while attempting to get simulations ${simId}.`);
            throw (err);
        }
    }

    /**
     * Creates a simulation for user.
     * @param {object} sim- simulation to create
     */
    async createSimulation(sim) {
        try {
            const count = sim.devices.reduce((acc, curr) => acc + curr.amount, 0);
            if (count > 100) {
                const error = new Error();
                error.code = 400;
                error.error = 'DeviceCreateLimitExceeded';
                error.message = 'Exceeded limit of 100 concurrent device creations per request.';
                throw (error);
            }
            let _id;
            if (sim.simId && sim.simId !== 'idsAutoDemo') {
                _id = sim.simId;
            } else {
                const suffix = sim.simId || "";
                _id = nanoid(9) + suffix;
            }
            const date = new Date().toISOString();
            let _simulation = {
                simId: _id,
                name: sim.name,
                stage: 'sleeping',
                devices: sim.devices,
                interval: sim.interval,
                duration: sim.duration,
                runs: 0,
                lastRun: '',
                createdAt: date,
                updatedAt: date,
            };
            let params = {
                TableName: process.env.SIMULATIONS_TBL,
                Item: _simulation
            };
            let data = await docClient.put(params).promise();
            if (process.env.SEND_ANONYMOUS_METRIC === 'Yes') {
                let metricData = {
                    eventType: 'create simulation',
                    duration: sim.duration,
                    numDevices: count
                }
                await sendAnonymousMetric(metricData);
            }
            return (data);
        } catch (err) {
            console.error(err);
            console.error(`Error occurred while attempting to create simulation.`);
            throw (err);
        }
    }

    /**
     * Deletes a simulation for user.
     * @param {string} simId - id of simulation to delete
     */
    async deleteSimulation(simId) {
        try {
            let params = {
                TableName: process.env.SIMULATIONS_TBL,
                Key: {
                    simId: simId
                }
            };

            return docClient.delete(params).promise();
        } catch (err) {
            console.error(err);
            console.error(`Error occurred while attempting to delete simulation ${simId}.`);
            throw (err);
        }
    }

    /**
     * Updates a simulation for user.
     * @param {string} action - the action to perform
     * @param {array} simulations - the simulations to update
     */
    async updateSimulation(action, simulations) {
        try {
            const responses = await Promise.all(simulations.map(async (newSim) => {
                let _params = {
                    TableName: process.env.SIMULATIONS_TBL,
                    Key: {
                        simId: newSim.simId
                    }
                };
                const date = new Date().toISOString();
                let sim = await docClient.get(_params).promise();
                sim.Item.updatedAt = date;
                sim.Item.runs += 1;
                sim.Item.stage = newSim.stage;

                if (action === 'start') {
                    sim.Item.stage = 'running';
                    sim.Item.lastRun = date;
                    await this._queueSimulatorAction(sim.Item);
                    return this._saveSimulation(sim.Item);
                } else if (action === 'stop') {
                    sim.Item.stage = 'stopping';
                    return this._saveSimulation(sim.Item);
                } else {
                    let error = new Error();
                    error.code = 400;
                    error.error = "InvalidAction";
                    error.message = `Invalid action ${action}`;
                    throw (error);
                }
            }));
            if (process.env.SEND_ANONYMOUS_METRIC === 'Yes' && action === 'start') {
                let metricData = {
                    eventType: 'start simulation',
                    numSimulations: simulations.length
                };
                metricData.simType = simulations[0].simId.includes('idsAutoDemo') ? 'autoDemo' : 'custom';
                await sendAnonymousMetric(metricData);
            }
            return responses;
        } catch (err) {
            console.error(err);
            console.error(`Error occurred while attempting to start simulations.`);
            throw (err);
        }
    }

    /**
     * Saves the simulation to DynamoDB
     * @param {} simulation The simulation to save
     */
    async _saveSimulation(simulation) {
        let _params = {
            TableName: process.env.SIMULATIONS_TBL,
            Item: simulation
        };
        try {
            return docClient.put(_params).promise();
        } catch (err) {
            console.error(err);
            console.error(`Error occurred while attempting to save simulation ${simulation.simId}.`);
            throw (err);
        }
    }

    /**
     * Retrieves a device type for user.
     * @param {string} simId - the id of the simulation
     * @param {string} attribute - The attributes to retrieve
     */
    async getDeviceType(simId, attributes) {
        const BATCH_GET_MAX = 100;
        let sim = await this.getSimulation(simId);
        let keys = sim.devices.map((device) => ({ typeId: device.typeId }));
        let keySubset = keys.splice(0, BATCH_GET_MAX);
        let processedResults = [];
        let data;
        const retryMax = 5;
        try {
            while (keySubset.length > 0) {
                let retryCount = 0;
                let params = {
                    RequestItems: {
                        [process.env.DEVICE_TYPES_TBL]: {
                            Keys: keySubset,
                            ProjectionExpression: attributes
                        }
                    }
                };
                data = await docClient.batchGet(params).promise();
                processedResults.push(...data.Responses[process.env.DEVICE_TYPES_TBL]);
                let unprocessedKeys = data.UnprocessedKeys;
                while (unprocessedKeys && Object.keys(unprocessedKeys).length > 0 && retryCount <= retryMax) {
                    await wait(2 ** retryCount * 25);
                    params.RequestItems = unprocessedKeys;
                    data = await docClient.batchGet(params).promise();
                    processedResults.push(...data.Responses[process.env.DEVICE_TYPES_TBL]);
                    unprocessedKeys = data.UnprocessedKeys;
                    retryCount++;
                }
                keySubset = keys.splice(0, BATCH_GET_MAX);
            }
            if (processedResults.length > 0) {
                return (processedResults);
            } else {
                let error = new Error();
                error.code = 400;
                error.error = 'MissingDeviceType';
                error.message = `The device types do not exist.`;
                throw (error);
            }
        } catch (err) {
            console.error(err);
            console.error(`Error occurred while attempting to get Device Types for simulation ${simId}.`);
            throw (err);
        }
    }

    /**
     * Get number of running simulations and amount of running devices
     *
     */
    async getSimulationStats() {
        try {
            let params = {
                TableName: process.env.SIMULATIONS_TBL,
                FilterExpression: "stage = :stage",
                ExpressionAttributeValues: {
                    ":stage": 'running'
                },
                ProjectionExpression: "devices"
            };
            let response = await docClient.scan(params).promise();
            let simulations = response.Items;
            let simsRunning = simulations.length;
            let devicesRunning = 0;
            simulations.forEach((sim) => {
                sim.devices.forEach((device) => {
                    devicesRunning += device.amount;
                });
            });
            return ({ sims: simsRunning, devices: devicesRunning });
        } catch (err) {
            console.error(err);
            console.error(`Error occurred while attempting to get running simulation stats.`);
            throw (err);
        }
    }

    /**
     * Sends a simulator action request to queue.
     * @param {object} body - simulator action body.
     */
    async _queueSimulatorAction(body) {
        try {
            const input = {
                simulation: {
                    interval: body.interval,
                    duration: body.duration,
                    devices: body.devices,
                    simId: body.simId,
                    stage: body.stage
                }
            };
            let params = {
                stateMachineArn: process.env.SIM_STEP_FUNCTION,
                input: JSON.stringify(input)
            };
            let stepfunctions = new AWS.StepFunctions();
            return stepfunctions.startExecution(params).promise();
        } catch (err) {
            console.error(err);
            console.error(`Error occurred while attempting to start simulation.`);
            throw (err);
        }
    }



}

module.exports = SimulationManager;