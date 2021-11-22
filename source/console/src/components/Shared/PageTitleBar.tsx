// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { I18n, Logger } from '@aws-amplify/core';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import { API } from '@aws-amplify/api';
import { API_NAME } from '../../util/Utils';

/**
 * Renders the header of the UI.
 * @returns page title bar
 */
export default function PageTitleBar(props: any): JSX.Element {
  const location = useLocation();
  const logger = new Logger('Page Title');
  const [running, setRunning] = useState({ devices: 0, sims: 0 });

  /**
   * Gets number of simulations and devices running from DynamoDb
   */
  const getSimulationStats = async () => {
    try {
      const results = await API.get(API_NAME, '/simulation', {
        queryStringParameters: { op: "getRunningStat" }
      });
      setRunning(results);
    } catch (err) {
      logger.error(I18n.get("simulations.get.error"), err);
      throw err;
    }
  }
  /**
   * react useEffect hook
   * updates title bar every 30 seconds
   */
  useEffect(() => {
    const interval = setInterval(() => {
      getSimulationStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  /**
   * adds a breadcrumb for each item in path
   * @returns Breadcrumb item
   */
  const getPaths = () => {
    const pages = location.pathname.split('/');
    let pageItems: Array<string> = [];
    pages.forEach((page, index) => {
      pageItems.push(page.replace("-", " "));
    })
    pageItems.splice(0, 1);

    return (pageItems.map((page, index) => (
      <Breadcrumb.Item
        className="capitalize"
        key={index}
        active={index === pageItems.length - 1 ? true : false}
        href={`/${[...pages].splice(1, index + 1).join('/')}`}
      >
        {page}
      </Breadcrumb.Item>
    ))
    )
  }

  return (
    <Row className='page-titles' >
      <Col>
        <h3 id="view-title">{props.title}</h3>
        <Breadcrumb>
          <Breadcrumb.Item href="/">{I18n.get("home")}</Breadcrumb.Item>
          {getPaths()}
        </Breadcrumb>
      </Col>
      <Col className="justify-content-end d-md-block d-sm-none">
        <Row className="justify-content-end align-items-center h-100">
          <Col md="auto" className="chart-text">
            <h6 className="chart-title">{I18n.get('devices')}</h6>
            <h3 className="chart-content text-success-alt">{`${running.devices} ${I18n.get("running")}`}</h3>
          </Col>
          <Col md="auto" className="chart-text">
            <h6 className="chart-title">{I18n.get('simulations')}</h6>
            <h3 className="chart-content text-success-alt">{`${running.sims} ${I18n.get("running")}`}</h3>
          </Col>
        </Row>
      </Col>
    </Row>
  );
}