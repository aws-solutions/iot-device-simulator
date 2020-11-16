import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';


import { Message } from '../model/message';
import { LoggerService } from './logger.service';
import { CognitoUtil } from './cognito.service';
import * as IotClient from 'aws-sdk/clients/iot';
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

        this.MQTTClient = {};

        this.subscriptions = [];

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
                let params = _self.cognito.buildCognitoCredParams(token);
                AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);
                _self.connect();
            }
        });
    }

    connect() {

        let self = this;
        console.log(AWS.config.credentials)
        AWS.config.credentials.get(function(err: any, cred: any) {
            if (!err) {
                console.log(cred)
                self.logger.info(AWS.config.credentials);
                self.logger.info('retrieved identity: ' + AWS.config.credentials.identityId);
                
                new IotClient({ region: appVariables.REGION }).attachPrincipalPolicy({ policyName: appVariables.PRINCIPAL_POLICY, principal: AWS.config.credentials.identityId }, function (err, data) {
                    if (err) {
                            console.error(err); // an error occurred
                        }

                        self.MQTTClient.updateWebSocketCredentials(AWS.config.credentials.accessKeyId,
                            AWS.config.credentials.secretAccessKey,
                            AWS.config.credentials.sessionToken);
                  });

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
