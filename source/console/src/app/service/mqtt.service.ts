import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

import 'rxjs/add/operator/map';
import { Message } from '../model/message';
import { LoggerService } from './logger.service';
import { CognitoUtil } from './cognito.service';
import * as CognitoIdentity from 'aws-sdk/clients/cognitoidentity';
import * as moment from 'moment';
declare var AWS: any;
declare var AWSIoT: any;
declare var appVariables: any;


@Injectable()
export class MQTTService {
    private currentlylSubscribedTopic: String = 'subscribe-topic';
    private messageHistory: String = '';
    private clientId: String = 'mqtt-iotsimclnt-' + (Math.floor((Math.random() * 100000) + 1));
    private subscriptions: any[];
    private MQTTClient: any;

    private messageSubject = new Subject<any>();
    messageObservable$ = this.messageSubject.asObservable();

    constructor(
        private logger: LoggerService,
        private cognito: CognitoUtil
    ) {

        AWS.config.region = appVariables.REGION;

        this.MQTTClient = AWSIoT.device({
            region: AWS.config.region,
            host: appVariables.IOT_ENDPOINT,
            clientId: this.clientId,
            protocol: 'wss',
            maximumReconnectTimeMs: 8000,
            debug: true,
            accessKeyId: '',
            secretKey: '',
            sessionToken: ''
        });

        this.subscriptions = [];

        this.MQTTClient.on('message', (topic: string, payload: any) => {
            const content = JSON.parse(String.fromCharCode.apply(null, payload));

            const message: Message = {
                topic: topic,
                content: content,
                timestamp: moment().format('MMM Do YYYY HH:mm:ss')
            };

            this.logger.info('mqtt service message:', message);

            this.messageSubject.next(message);
        });

        const _self = this;
        this.cognito.getIdToken({
            callback() {
            },
            callbackWithParam(token: any) {
                // const url = 'cognito-idp.' + appVariables.REGION.toLowerCase() + '.amazonaws.com/' + appVariables.USER_POOL_ID;
                // const logins: CognitoIdentity.LoginsMap = {};
                // logins[url] = token;
                const params = {
                    IdentityPoolId: CognitoUtil._IDENTITY_POOL_ID,
                    // Logins: logins
                };

                AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);
                _self.connect();
            }
        });
    }

    connect() {

        let self = this;
        AWS.config.credentials.get(function(err: any, cred: any) {
            if (!err) {
                self.logger.info(AWS.config.credentials);
                self.logger.info('retrieved identity: ' + AWS.config.credentials.identityId);
                self.MQTTClient.updateWebSocketCredentials(AWS.config.credentials.accessKeyId,
                    AWS.config.credentials.secretAccessKey,
                    AWS.config.credentials.sessionToken);
            } else {
                self.logger.error('error retrieving identity:' + err);
                alert('error retrieving identity: ' + err);
            }
        });
    }

    getClient() {
        return this.MQTTClient;
    }

    subscribe(topic: string) {
        this.logger.info('subscribing to topic', topic);
        let _found = false;
        for (let i = 0; i < this.subscriptions.length; i++) {
            if (this.subscriptions[i] === topic) {
                _found = true;
                break;
            }
        }

        if (!_found) {
            this.subscriptions.push(topic);
            this.MQTTClient.subscribe(topic);
        }
    }

    unsubscribe(topic: string) {
        this.logger.info('unsubscribing to topic', topic);
        for (let i = 0; i < this.subscriptions.length; i++) {
            if (this.subscriptions[i] === topic) {
                this.subscriptions.splice(i, 1);
                break;
            }
        }

        this.MQTTClient.unsubscribe(topic);
    }

    unsubscribeAll() {
        for (let i = 0; i < this.subscriptions.length; i++) {
            this.MQTTClient.unsubscribe(this.subscriptions[i]);
        }
    }
}
