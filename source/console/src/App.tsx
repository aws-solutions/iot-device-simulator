
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Amplify, { I18n } from '@aws-amplify/core';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { AuthState, onAuthUIStateChange } from '@aws-amplify/ui-react/node_modules/@aws-amplify/ui-components';
import { Geo } from '@aws-amplify/geo';
import { Auth } from '@aws-amplify/auth';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import Simulations from './views/Simulations';
import DeviceTypeCreate from './views/DeviceTypeCreate';
import DeviceTypes from './views/DeviceTypes';
import Header from './components/Shared/Header';
import PageNotFound from './views/PageNotFound';
import SimulationCreate from './views/SimulationCreate';
import SimulationDetails from './views/SimulationDetails';
import { AWSIoTProvider, PubSub } from '@aws-amplify/pubsub';
import AWS from 'aws-sdk';

// Amplify configuration
declare var config: any;
Amplify.addPluggable(new AWSIoTProvider({
  aws_pubsub_region: config.aws_project_region,
  aws_pubsub_endpoint: 'wss://' + config.aws_iot_endpoint + '/mqtt'
}));
PubSub.configure(config);
Amplify.configure(config);
Geo.configure(config);

/**
 * Need to attach IoT Policy to Identity in order to subscribe.
 */
onAuthUIStateChange(async (nextAuthState) => {
  if (nextAuthState === AuthState.SignedIn) {
    const credentials = await Auth.currentCredentials();
    const identityId = credentials.identityId;
    AWS.config.update({
      region: config.aws_project_region,
      credentials: Auth.essentialCredentials(credentials)
    });

    const params = {
      policyName: config.aws_iot_policy_name,
      principal: identityId
    }

    try {
      await new AWS.Iot().attachPrincipalPolicy(params).promise();
    } catch (error) {
      console.error('Error occurred while attaching principal policy', error);
    }
  }
});


/**
 * The default application
 * @returns Amplify Authenticator with Main and Footer
 */
function App(): JSX.Element {

  return (

    <div className="app-wrap">
      <Header />
      <BrowserRouter>
        <Switch>
          <Route
            exact
            path="/"
            render={() => {
              return (
                <Redirect to="/simulations"></Redirect>
              )
            }}
          />
          <Route exact path="/simulations" render={() => <Simulations region={config.region} title={I18n.get("simulations")} />} />
          <Route exact path="/simulations/create" render={() => <SimulationCreate region={config.region} title={I18n.get("simulation.creation")}></SimulationCreate>} />
          <Route exact path="/simulations/:simId" render={(props) => <SimulationDetails region={config.region} title={I18n.get("simulation.details")} />} />
          <Route exact path="/device-types" render={() => <DeviceTypes region={config.region} title={I18n.get("device.types")} />} />
          <Route exact path="/device-types/:typeId?" render={(props) => <DeviceTypeCreate {...props} region={config.region} title={I18n.get("device.type.creation")} />} />
          <Route render={() => <PageNotFound />} />
        </Switch>
      </BrowserRouter>
    </div>
  );
}

export default withAuthenticator(App);
