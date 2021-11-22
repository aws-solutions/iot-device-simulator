// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const axios = require('axios');

const METRICS_ENDPOINT = 'https://metrics.awssolutionsbuilder.com/generic';

/**
 * Sends anonymous usage metrics.
 * @param data Data to send a anonymous metric
 */
async function sendAnonymousMetric(data) {
  try {
    const body = {
      Solution: process.env.SOLUTION_ID,
      Version: process.env.VERSION,
      UUID: process.env.UUID,
      TimeStamp: new Date().toISOString().replace('T', ' ').replace('Z', ''),
      Data: data
    };

    const config = {
      headers: { 'Content-Type': 'application/json' }
    };

    await axios.post(METRICS_ENDPOINT, JSON.stringify(body), config);
  } catch (error) {
    console.error('Error sending an anonymous metric: ', error);
  }
}

module.exports = { sendAnonymousMetric }