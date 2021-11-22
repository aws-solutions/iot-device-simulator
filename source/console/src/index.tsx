// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import "@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css";
import './App.css';
import reportWebVitals from './reportWebVitals';

// For the internationalization
import { I18n } from '@aws-amplify/core';
import en from './util/lang/en.json'; // English

const dict = { en };
I18n.putVocabularies(dict);
I18n.setLanguage('en');

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
