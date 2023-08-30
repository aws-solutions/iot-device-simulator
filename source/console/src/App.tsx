// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Auth } from "@aws-amplify/auth";
import { Amplify, I18n } from "@aws-amplify/core";
import { Geo } from "@aws-amplify/geo";
import { AWSIoTProvider, PubSub } from "@aws-amplify/pubsub";
import { useAuthenticator, withAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { AttachPolicyCommand, IoTClient as Iot } from "@aws-sdk/client-iot";
import { useEffect } from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import Header from "./components/Shared/Header";
import DeviceTypeCreate from "./views/DeviceTypeCreate";
import DeviceTypes from "./views/DeviceTypes";
import PageNotFound from "./views/PageNotFound";
import SimulationCreate from "./views/SimulationCreate";
import SimulationDetails from "./views/SimulationDetails";
import Simulations from "./views/Simulations";

// Amplify configuration
declare let config: any;
Amplify.addPluggable(
	new AWSIoTProvider({
		aws_pubsub_region: config.aws_project_region,
		aws_pubsub_endpoint: "wss://" + config.aws_iot_endpoint + "/mqtt",
	})
);
PubSub.configure(config);
Amplify.configure(config);
Geo.configure(config);

/**
 * The default application
 * @returns Amplify Authenticator with Main and Footer
 */
function App(): JSX.Element {
	const { authStatus } = useAuthenticator((context) => [context.authStatus]);

	useEffect(() => {
		if (authStatus == "authenticated") {
			Auth.currentCredentials().then(async (credentials) => {
				const identityId = credentials.identityId;
				const awsConfig = {
					region: config.aws_project_region,
					credentials: Auth.essentialCredentials(credentials),
				};
				const iot = new Iot(awsConfig);
				const params = {
					policyName: config.aws_iot_policy_name,
					target: identityId,
				};
				try {
					await iot.send(new AttachPolicyCommand(params));
				} catch (error) {
					console.error("Error occurred while attaching principal policy", error);
				}
			});
		}
	}, [authStatus]);
	return (
		<div className='app-wrap'>
			<Header />
			<BrowserRouter>
				<Switch>
					<Route
						exact
						path='/'
						render={() => {
							return <Redirect to='/simulations'></Redirect>;
						}}
					/>
					<Route
						exact
						path='/simulations'
						render={() => <Simulations region={config.region} title={I18n.get("simulations")} />}
					/>
					<Route
						exact
						path='/simulations/create'
						render={() => (
							<SimulationCreate region={config.region} title={I18n.get("simulation.creation")}></SimulationCreate>
						)}
					/>
					<Route
						exact
						path='/simulations/:simId'
						render={(props) => <SimulationDetails region={config.region} title={I18n.get("simulation.details")} />}
					/>
					<Route
						exact
						path='/device-types'
						render={() => <DeviceTypes region={config.region} title={I18n.get("device.types")} />}
					/>
					<Route
						exact
						path='/device-types/:typeId?'
						render={(props) => (
							<DeviceTypeCreate {...props} region={config.region} title={I18n.get("device.type.creation")} />
						)}
					/>
					<Route render={() => <PageNotFound />} />
				</Switch>
			</BrowserRouter>
		</div>
	);
}

export default withAuthenticator(App);
