// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { API } from "@aws-amplify/api";
import { I18n, Logger } from "@aws-amplify/core";
import { PubSub } from "@aws-amplify/pubsub";
import "@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css";
import { Feature, FeatureCollection } from "geojson";
import { createMap, drawPoints } from "maplibre-gl-js-amplify";
import { Coordinates } from "maplibre-gl-js-amplify/lib/esm/types";
import moment from "moment";
import { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import Nav from "react-bootstrap/Nav";
import Row from "react-bootstrap/Row";
import Tab from "react-bootstrap/Tab";
import { useLocation } from "react-router";
import { Redirect } from "react-router-dom";
import Footer from "../components/Shared/Footer";
import { IPageProps, ISimulation, simTypes } from "../components/Shared/Interfaces";
import PageTitleBar from "../components/Shared/PageTitleBar";
import { API_NAME } from "../util/Utils";

export default function SimulationDetails(props: IPageProps): JSX.Element {
	const location = useLocation();
	const logger = new Logger("Simulation Details");
	const [sim, setSim] = useState<ISimulation>();
	const [topics, setTopics] = useState<{ [key: string]: Array<string> }>({});
	const [messages, setMessages] = useState<Array<any>>([]);
	const [activeTopic, setActiveTopic] = useState<string>();
	const [activeDevice, setActiveDevice] = useState<{ [key: string]: string }>({ id: "All", name: "All" });
	const [map, setMap] = useState<maplibregl.Map>();
	const [shouldRedirect, setShouldRedirect] = useState(false);
	/**
	 * Load simulation from ddb
	 */
	const loadSimulation = async () => {
		const simId = location.pathname.split("/").pop();
		try {
			const results = await API.get(API_NAME, `/simulation/${simId}`, {});
			setSim(results);
			if (results?.simId.includes(simTypes.autoDemo)) {
				initializeMap();
			}
		} catch (err: any) {
			logger.error(I18n.get("simulation.get.error"), err);
			if (err.response?.data?.error === "MissingSimulation") {
				setShouldRedirect(true);
			} else {
				throw err;
			}
		}
	};

	/**
	 * load devices belonging to a simulation
	 */
	const loadDevices = async () => {
		const simId = location.pathname.split("/").pop();
		try {
			const results = await API.get(API_NAME, `/simulation/${simId}`, {
				queryStringParameters: { op: "list dtype attributes", filter: "topic, typeId" },
			});
			let newTopics: { [key: string]: Array<string> } = {};
			results.forEach((result: any) => {
				if (!newTopics[result.topic]) {
					newTopics[result.topic] = [result.typeId];
				} else {
					newTopics[result.topic].push(result.typeId);
				}
			});
			setTopics({ ...newTopics });
			setActiveTopic(Object.keys(newTopics)[0]);
		} catch (err) {
			logger.error(I18n.get("device.types.get.error"), err);
			throw err;
		}
	};

	async function initializeMap() {
		const newMap = await createMap({
			container: "map", // An HTML Element or HTML element ID to render the map in https://maplibre.org/maplibre-gl-js-docs/api/map/
			center: [-123.1187, 49.2819],
			zoom: 3,
		});
		setMap(newMap);
	}

	/**
	 * parse and save incoming IoT message
	 * @param data
	 */
	const handleMessage = (data: any) => {
		let message = {
			title: data.value[Object.getOwnPropertySymbols(data.value)[0]],
			content: data.value,
			timestamp: moment().format("MMM Do YYYY HH:mm:ss"),
		};
		if (messages.length >= 100) {
			messages.pop();
		}
		messages.unshift(message);
		setMessages([...messages]);
	};

	/**
	 * react useEffect hook
	 * load simulation and needed device type info (topic, id) on load
	 * and initializes map if auto demo
	 */
	useEffect(() => {
		loadSimulation();
		loadDevices();
	}, []);

	/**
	 * updates the map coordinates with new messages if a map exists
	 */
	useEffect(() => {
		if (map && map.isStyleLoaded() && messages.length > 0) {
			let uniqueDeviceMessages = messages.filter(
				(message, index, self) =>
					self.findIndex((uniqueMsg) => uniqueMsg.content._id_ === message.content._id_) === index
			);
			if (uniqueDeviceMessages.length === 0) {
				return;
			}
			let centerLat = 0;
			let centerLng = 0;
			let coordinates: any[][] = [];
			uniqueDeviceMessages.forEach((message) => {
				const location = message.content.location;
				if (location && location.latitude !== undefined && location.longitude !== undefined) {
					centerLat += location.latitude;
					centerLng += location.longitude;
					coordinates.push([location.longitude, location.latitude]);
				}
			});

			centerLat = Number((centerLat / coordinates.length).toFixed(6));
			centerLng = Number((centerLng / coordinates.length).toFixed(6));
			let mapSource = map.getSource("IoTMessage");
			if (!mapSource) {
				drawPoints("IoTMessage", coordinates as Coordinates[], map, {
					clusterOptions: {
						showCount: true,
						smCircleSize: 20,
						mdCircleSize: 40,
					},
				});
				//jumpTo center point if possible
				if (!isNaN(centerLng) && !isNaN(centerLat)) {
					map.jumpTo({
						center: [centerLng, centerLat],
					});
				}
			} else {
				const source = mapSource as maplibregl.GeoJSONSource;
				let features = coordinates.map((coordinate) => {
					return {
						type: "Feature",
						geometry: {
							type: "Point",
							coordinates: coordinate,
						},
					} as Feature;
				});
				const data = {
					type: "FeatureCollection",
					features: features,
				} as FeatureCollection;
				source.setData(data);

				if (coordinates.length === 1) {
					map.panTo([centerLng, centerLat]);
					let zoom = map.getZoom();
					if (zoom < 14) {
						map.setZoom(14);
					}
				}
			}
		}
	}, [map, messages]);

	/**
	 * react useEffect hook
	 * on topics changes subscribe and unsubscribe.
	 */
	useEffect(() => {
		const iotSub = PubSub.subscribe(Object.keys(topics)).subscribe({
			next: (data: any) => {
				handleMessage(data);
			},
			error: (error: any) => logger.error(error),
		});
		return () => {
			iotSub.unsubscribe();
		};
	}, [topics]);

	/**
	 * start simulation
	 */
	const startSim = async () => {
		if (sim && sim.stage === "sleeping") {
			const body = {
				action: "start",
				simulations: [sim],
			};
			try {
				await API.put(API_NAME, `/simulation/${sim.simId}`, { body: body });
				sim.stage = "running";
				setSim({ ...sim });
			} catch (err) {
				logger.error(I18n.get("simulation.start.error"), err);
				throw err;
			}
		}
	};

	/**
	 * stop simulation
	 */
	const stopSim = async () => {
		if (sim && sim.stage === "running") {
			const body = {
				action: "stop",
				simulations: [sim],
			};
			try {
				await API.put(API_NAME, `/simulation/${sim.simId}`, { body: body });
				sim.stage = "stopping";
				setSim({ ...sim });
			} catch (err) {
				logger.error(I18n.get("simulation.stop.error"), err);
				throw err;
			}
		}
	};

	return shouldRedirect ? (
		<Redirect to='/404' />
	) : (
		<div className='page-content'>
			<PageTitleBar title={props.title} />
			<Card className='content-card'>
				<Card.Title className='content-card-title'>
					{sim?.name}
					<Button
						className='button-theme header-button'
						size='sm'
						onClick={() => {
							loadSimulation();
						}}
					>
						<i className='bi bi-arrow-repeat' /> {I18n.get("refresh")}
					</Button>
					<Button
						className='button-theme-alt header-button mr-3'
						size='sm'
						onClick={() => {
							stopSim();
						}}
					>
						<i className='bi bi-stop-fill' /> {I18n.get("stop")}
					</Button>
					<Button
						className='button-theme header-button'
						size='sm'
						onClick={() => {
							startSim();
						}}
					>
						<i className='bi bi-play-fill' /> {I18n.get("start")}
					</Button>
				</Card.Title>
				<Card.Body>
					<Row>
						<Col sm='6'>
							<Row className='detail'>
								<Col sm='3'>
									<b>{I18n.get("name")}:</b>
								</Col>
								<Col sm='9'>{sim?.name}</Col>
							</Row>
							<Row className='detail'>
								<Col sm='3'>
									<b>{I18n.get("stage")}:</b>
								</Col>
								<Col sm='9'>{sim?.stage}</Col>
							</Row>
							<Row className='detail mb-0'>
								<Col sm='3'>
									<b>{I18n.get("created")}:</b>
								</Col>
								<Col sm='9'>{sim?.createdAt}</Col>
							</Row>
						</Col>
						<Col sm='6'>
							<Row className='detail'>
								<Col sm='3'>
									<b>{I18n.get("runs")}:</b>
								</Col>
								<Col sm='9'>{sim?.runs}</Col>
							</Row>
							<Row className='detail'>
								<Col sm='3'>
									<b>{I18n.get("last.run")}:</b>
								</Col>
								<Col sm='9'>{sim?.lastRun}</Col>
							</Row>
							<Row className='detail mb-0'>
								<Col sm='3'>
									<b>{I18n.get("last.updated")}:</b>
								</Col>
								<Col sm='9'>{sim?.updatedAt}</Col>
							</Row>
						</Col>
					</Row>
				</Card.Body>
			</Card>
			{sim?.simId.includes(simTypes.autoDemo) ? <div className='map' id='map' /> : ""}
			<Card className='mt-3'>
				<Card.Header>
					<Card.Title>
						<Row>
							<Col sm={3}>{I18n.get("topic")}</Col>
							<Col sm={9}>
								<Row>
									<Col>{I18n.get("messages")}</Col>
									<Col>
										<DropdownButton
											className='float-right'
											variant='outline-secondary'
											title={`Device Filter: ${activeDevice.name} `}
											id='input-group-dropdown-2'
										>
											<Dropdown.Item key={-1} href='#' onClick={() => setActiveDevice({ id: "All", name: "All" })}>
												{I18n.get("all")}
											</Dropdown.Item>
											{sim?.devices.map((device, i) => {
												if (activeTopic && topics[activeTopic].includes(device.typeId)) {
													let items = [];
													for (let j = 0; j < device.amount; j++) {
														items.push(`${device.name}-${j + 1}`);
													}
													const prefix = `${sim.simId.slice(0, 3)}${device.typeId.slice(0, 3)}`;
													return items.map((item, k) => (
														<Dropdown.Item
															key={`${i}-${k}`}
															href='#'
															onClick={() => setActiveDevice({ id: `${prefix}${k}`, name: `${item}` })}
														>
															{item}
														</Dropdown.Item>
													));
												}
											})}
										</DropdownButton>
									</Col>
								</Row>
							</Col>
						</Row>
					</Card.Title>
				</Card.Header>
				<Card.Body>
					<Tab.Container id='left-tabs-example' defaultActiveKey={"0"}>
						<Row>
							<Col sm={3}>
								<Nav variant='pills' className='flex-column topic-content'>
									{Object.keys(topics).map((topic, i) => (
										<Nav.Item className='topic-item' key={i}>
											<Nav.Link
												eventKey={i}
												onClick={() => {
													setActiveTopic(topic);
													setActiveDevice({ id: "All", name: "All" });
												}}
											>
												{topic}
											</Nav.Link>
										</Nav.Item>
									))}
								</Nav>
							</Col>
							<Col sm={9} className='message-content'>
								<Tab.Content>
									{Object.entries(topics).map((aTopic, i) => (
										<Tab.Pane key={i} eventKey={i}>
											{messages
												.filter((message) =>
													activeDevice.id === "All"
														? message.title === aTopic[0]
														: message.title === aTopic[0] && message.content["_id_"] === activeDevice.id
												)
												.map((message, j) => (
													<Card key={`${i}-${j}`} className='mb-4'>
														<Card.Title className='content-card-title pl-2 pt-2'>{message.timestamp}</Card.Title>
														<Card.Body className='iot-message-card'>
															<pre>{JSON.stringify(message.content, null, 2)}</pre>
														</Card.Body>
													</Card>
												))}
										</Tab.Pane>
									))}
								</Tab.Content>
							</Col>
						</Row>
					</Tab.Container>
				</Card.Body>
			</Card>
			<Footer pageTitle={props.title} />
		</div>
	);
}
