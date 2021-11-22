// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { I18n } from '@aws-amplify/core';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import { signOut } from '../../util/Utils';

/**
 * Renders the header of the UI.
 * @returns The header
 */
export default function Header(): JSX.Element {
  return (
    <header className="topbar" key="header">
      <Navbar variant="dark" expand="sm">
        <Navbar.Brand href="/simulations">{I18n.get('application')}</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav" />
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link className="header-link" href="/simulations">{I18n.get("simulations")}</Nav.Link>
          </Nav>
          <Nav className="me-auto">
            <Nav.Link className="header-link" href="/device-types">{I18n.get("device.types")}</Nav.Link>
          </Nav>
          <Nav className="ml-auto">
            <Nav.Link className="header-link" onClick={signOut}><i className={"bi bi-box-arrow-right"} /> {I18n.get('sign.out')}</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </header>
  );
}