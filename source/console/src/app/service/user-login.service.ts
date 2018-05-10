import { Injectable } from '@angular/core';
import { CognitoCallback, CognitoUtil, LoggedInCallback } from './cognito.service';
import { AuthenticationDetails, CognitoUser } from 'amazon-cognito-identity-js';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { ProfileInfo } from '../model/profileInfo';
import { AsyncLocalStorage } from 'angular-async-local-storage';
import { LoggerService } from './logger.service';
import * as AWS from 'aws-sdk/global';
import * as STS from 'aws-sdk/clients/sts';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/toPromise';
declare var appVariables: any;

@Injectable()
export class UserLoginService {

    constructor(
        public cognitoUtil: CognitoUtil,
        private http: HttpClient,
        protected localStorage: AsyncLocalStorage,
        private logger: LoggerService) {
    }

    authenticate(username: string, password: string, callback: CognitoCallback) {
        this.logger.info('UserLoginService: starting the authentication');

        const authenticationData = {
            Username: username,
            Password: password,
        };
        const authenticationDetails = new AuthenticationDetails(authenticationData);

        const userData = {
            Username: username,
            Pool: this.cognitoUtil.getUserPool()
        };

        this.logger.info('UserLoginService: Params set...Authenticating the user');
        const cognitoUser = new CognitoUser(userData);

        this.logger.info('UserLoginService: config is ' + JSON.stringify(AWS.config));
        const _self = this;
        cognitoUser.authenticateUser(authenticationDetails, {
            newPasswordRequired: function(userAttributes: any, requiredAttributes: any) {
                _self.logger.warn('User needs to set password.');
                callback.cognitoCallback(`User needs to set password.`, null);
            },
            onSuccess: function(result: any) {

                _self.logger.info('In authenticateUser onSuccess callback');
                // const creds = _self.cognitoUtil.buildCognitoCreds(result.getIdToken().getJwtToken());
                // AWS.config.credentials = creds;

                // So, when CognitoIdentity authenticates a user, it doesn't actually hand us the IdentityID,
                // used by many of our other handlers. This is handled by some sly underhanded calls to AWS Cognito
                // API's by the SDK itself, automatically when the first AWS SDK request is made that requires our
                // security credentials. The identity is then injected directly into the credentials object.
                // If the first SDK call we make wants to use our IdentityID, we have a
                // chicken and egg problem on our hands. We resolve this problem by "priming" the AWS SDK by calling a
                // very innocuous API call that forces this behavior.
                // const clientParams: any = {};
                // if (environment.sts_endpoint) {
                //     clientParams.endpoint = environment.sts_endpoint;
                // }
                // const sts = new STS(clientParams);
                // sts.getCallerIdentity(function(err: any, data: any) {
                //     console.log('UserLoginService: Successfully set the AWS credentials');
                //     callback.cognitoCallback(null, result);
                // });

                _self.getUserInfo().then((data: ProfileInfo) => {
                    _self.localStorage.setItem('profile', data).subscribe(() => { });
                    callback.cognitoCallback(null, result);
                }).catch((err2) => {
                    _self.logger.error('[Error] Error occurred retrieving user info to validate admin role.');
                    _self.logger.error(err2);
                    callback.cognitoCallback(null, result);
                });

            },
            onFailure: function(err: any) {
                callback.cognitoCallback(err.message, null);
            },
        });
    }

    forgotPassword(username: string, callback: CognitoCallback) {
        const userData = {
            Username: username,
            Pool: this.cognitoUtil.getUserPool()
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.forgotPassword({
            onSuccess: function() {

            },
            onFailure: function(err: any) {
                callback.cognitoCallback(err.message, null);
            },
            inputVerificationCode() {
                callback.cognitoCallback(null, null);
            }
        });
    }

    confirmNewPassword(email: string, verificationCode: string, password: string, callback: CognitoCallback) {
        const userData = {
            Username: email,
            Pool: this.cognitoUtil.getUserPool()
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.confirmPassword(verificationCode, password, {
            onSuccess: function() {
                callback.cognitoCallback(null, null);
            },
            onFailure: function(err: any) {
                callback.cognitoCallback(err.message, null);
            }
        });
    }

    changePassword(oldpassword: string, newpassword: string) {
        const _self = this;
        const cognitoUser = this.cognitoUtil.getCurrentUser();
        const promise = new Promise((resolve, reject) => {
            if (cognitoUser != null) {
                cognitoUser.getSession(function(err: any, session: any) {
                    if (err) {
                        _self.logger.error('UserLoginService: Couldn\'t get the session: ' + err, err.stack);
                        reject(err);
                    } else {
                        _self.logger.info('UserLoginService: Session is ' + session.isValid());
                        if (session.isValid()) {
                            cognitoUser.changePassword(oldpassword, newpassword, function(err2: any, result: any) {
                                if (err2) {
                                    _self.logger.error(err2);
                                    const _msg = err2.message;
                                    reject(_msg);
                                } else {
                                    resolve(result);
                                }
                            });
                        } else {
                            reject('The user\'s current session is invalid.');
                        }
                    }
                });
            } else {
                this.logger.warn('UserLoginService: can\'t retrieve the current user');
                reject('Can\'t retrieve the CurrentUser');
            }
        });

        return promise;

    }

    logout() {
        this.logger.info('UserLoginService: Logging out');
        this.cognitoUtil.getCurrentUser().signOut();
    }

    isAuthenticated(callback: LoggedInCallback, loadProfile: boolean) {
        if (callback == null) {
            throw new Error('UserLoginService: Callback in isAdminAuthenticated() cannot be null');
        }

        const cognitoUser = this.cognitoUtil.getCurrentUser();
        const _self = this;

        if (cognitoUser != null) {
            cognitoUser.getSession(function(err: any, session: any) {
                if (err) {
                    _self.logger.error('UserLoginService: Couldn\'t get the session: ' + err, err.stack);
                    callback.isLoggedIn(err, false, null);
                } else {
                    _self.logger.info('UserLoginService: Session is ' + session.isValid());
                    if (session.isValid()) {
                        if (loadProfile) {
                            _self.getUserInfo().then((data: ProfileInfo) => {
                                callback.isLoggedIn(err, session.isValid(), data);
                            }).catch((err2) => {
                                _self.logger.error('[Error] Error occurred retrieving user info to validate admin role.');
                                _self.logger.error(err2);
                            });
                        } else {
                            callback.isLoggedIn(err, session.isValid(), null);
                        }
                    } else {
                        callback.isLoggedIn(err, session.isValid(), null);
                    }
                }
            });
        } else {
            this.logger.warn('UserLoginService: can\'t retrieve the current user');
            callback.isLoggedIn('Can\'t retrieve the CurrentUser', false, null);
        }
    }

    getUserInfo() {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognitoUtil.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.logger.info(token);
                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'profile'].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data) => {
                            resolve(new ProfileInfo(data));
                        },
                        (err: HttpErrorResponse) => {
                            if (err.error instanceof Error) {
                                // A client-side or network error occurred.
                                _self.logger.error('An error occurred:', err.error.message);
                            } else {
                                // The backend returned an unsuccessful response code.
                                // The response body may contain clues as to what went wrong,
                                _self.logger.error(`Backend returned code ${err.status}, body was: ${err.error}`);
                            }
                            reject(err);
                        }
                        );
                }
            });
        });

        return promise;
    }

}
