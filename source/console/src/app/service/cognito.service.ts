import { Injectable } from '@angular/core';
import {
    AuthenticationDetails,
    CognitoIdentityServiceProvider,
    CognitoUser,
    CognitoUserAttribute,
    CognitoUserPool
} from 'amazon-cognito-identity-js';
import * as AWS from 'aws-sdk/global';
import * as awsservice from 'aws-sdk/lib/service';
import * as CognitoIdentity from 'aws-sdk/clients/cognitoidentity';
import { ProfileInfo } from '../model/profileInfo';
import { LoggerService } from './logger.service';
declare var appVariables: any;



/**
 * Created by Vladimir Budilov
 */

export interface CognitoCallback {
    cognitoCallback(message: string, result: any): void;
}

export interface LoggedInCallback {
    isLoggedIn(message: string, loggedIn: boolean, profile: ProfileInfo): void;
}

export interface Callback {
    callback(): void;
    callbackWithParam(result: any): void;
}
@Injectable()
export class CognitoUtil {

    public static _REGION: string = appVariables.REGION;

    public static _IDENTITY_POOL_ID: string = appVariables.IDENTITY_POOL_ID;
    public static _USER_POOL_ID: string = appVariables.USER_POOL_ID;
    public static _CLIENT_ID: string = appVariables.USER_POOL_CLIENT_ID;

    public static _POOL_DATA: any = {
        UserPoolId: CognitoUtil._USER_POOL_ID,
        ClientId: CognitoUtil._CLIENT_ID,
        Paranoia: 8
    };

    public cognitoCreds: AWS.CognitoIdentityCredentials;

    constructor(private logger: LoggerService) {
    }

    getUserPool() {
        if (appVariables.COGNITO_IDP_ENDPOINT) {
            CognitoUtil._POOL_DATA.endpoint = appVariables.COGNITO_IDP_ENDPOINT;
        }

        return new CognitoUserPool(CognitoUtil._POOL_DATA);
    }

    getCurrentUser() {
        return this.getUserPool().getCurrentUser();
    }

    getClientId() {
        return CognitoUtil._CLIENT_ID;
    }

    // AWS Stores Credentials in many ways, and with TypeScript this means that
    // getting the base credentials we authenticated with from the AWS globals gets really murky,
    // having to get around both class extension and unions. Therefore, we're going to give
    // developers direct access to the raw, unadulterated CognitoIdentityCredentials
    // object at all times.
    setCognitoCreds(creds: AWS.CognitoIdentityCredentials) {
        this.cognitoCreds = creds;
    }

    getCognitoCreds() {
        return this.cognitoCreds;
    }

    // This method takes in a raw jwtToken and uses the global AWS config options to build a
    // CognitoIdentityCredentials object and store it for us. It also returns the object to the caller
    // to avoid unnecessary calls to setCognitoCreds.

    buildCognitoCreds(idTokenJwt: string) {
        let url = 'cognito-idp.' + CognitoUtil._REGION.toLowerCase() + '.amazonaws.com/' + CognitoUtil._USER_POOL_ID;
        if (appVariables.COGNITO_IDP_ENDPOINT) {
            url = appVariables.COGNITO_IDP_ENDPOINT + '/' + CognitoUtil._USER_POOL_ID;
        }

        const logins: CognitoIdentity.LoginsMap = {};
        logins[url] = idTokenJwt;
        const params = {
            IdentityPoolId: CognitoUtil._IDENTITY_POOL_ID,
            Logins: logins
        };

        const serviceConfigs: awsservice.ServiceConfigurationOptions = {};
        if (appVariables.COGNITO_IDENTITY_ENDPOINT) {
            serviceConfigs.endpoint = appVariables.COGNITO_IDENTITY_ENDPOINT;
        }

        const creds = new AWS.CognitoIdentityCredentials(params, serviceConfigs);
        this.setCognitoCreds(creds);
        return creds;
    }

    buildCognitoCredParams(idTokenJwt: string) {
        let url = 'cognito-idp.' + CognitoUtil._REGION.toLowerCase() + '.amazonaws.com/' + CognitoUtil._USER_POOL_ID;
        if (appVariables.COGNITO_IDP_ENDPOINT) {
            url = appVariables.COGNITO_IDP_ENDPOINT + '/' + CognitoUtil._USER_POOL_ID;
        }

        const logins: CognitoIdentity.LoginsMap = {};
        logins[url] = idTokenJwt;
        const params = {
            IdentityPoolId: CognitoUtil._IDENTITY_POOL_ID,
            Logins: logins
        };
        return params;
    }

    getCognitoIdentity(): string {
        return this.cognitoCreds.identityId;
    }

    getAccessToken(callback: Callback): void {
        if (callback == null) {
            throw new Error('CognitoUtil: callback in getAccessToken is null...returning');
        }
        if (this.getCurrentUser() != null) {
            this.getCurrentUser().getSession(function(err: any, session: any) {
                if (err) {
                    this.logger.error('CognitoUtil: Can\'t set the credentials:' + err);
                    callback.callbackWithParam(null);
                } else {
                    if (session.isValid()) {
                        callback.callbackWithParam(session.getAccessToken().getJwtToken());
                    }
                }
            });
        } else {
            callback.callbackWithParam(null);
        }
    }

    getIdToken(callback: Callback): void {
        if (callback == null) {
            throw new Error('CognitoUtil: callback in getIdToken is null...returning');
        }
        if (this.getCurrentUser() != null) {
            this.getCurrentUser().getSession(function(err: any, session: any) {
                if (err) {
                    this.logger.error('CognitoUtil: Can\'t set the credentials:' + err);
                    callback.callbackWithParam(null);
                } else {
                    if (session.isValid()) {
                        callback.callbackWithParam(session.getIdToken().getJwtToken());
                    } else {
                        this.logger.error('CognitoUtil: Got the id token, but the session isn\'t valid');
                    }
                }
            });
        } else {
            callback.callbackWithParam(null);
        }
    }

    getRefreshToken(callback: Callback): void {
        if (callback == null) {
            throw new Error('CognitoUtil: callback in getRefreshToken is null...returning');
        }
        if (this.getCurrentUser() != null) {
            this.getCurrentUser().getSession(function(err: any, session: any) {
                if (err) {
                    this.logger.error('CognitoUtil: Can\'t set the credentials:' + err);
                    callback.callbackWithParam(null);
                } else {
                    if (session.isValid()) {
                        callback.callbackWithParam(session.getRefreshToken());
                    }
                }
            });
        } else {
            callback.callbackWithParam(null);
        }
    }

    refresh(): void {
        this.getCurrentUser().getSession(function(err: any, session: any) {
            if (err) {
                this.logger.error('CognitoUtil: Can\'t set the credentials:' + err);
            } else {
                if (session.isValid()) {
                    this.logger.info('CognitoUtil: refreshed successfully');
                } else {
                    this.logger.error('CognitoUtil: refreshed but session is still not valid');
                }
            }
        });
    }
}
