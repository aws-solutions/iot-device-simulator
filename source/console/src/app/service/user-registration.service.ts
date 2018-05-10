import { Inject, Injectable } from '@angular/core';
import { CognitoCallback, CognitoUtil } from './cognito.service';
import { AuthenticationDetails, CognitoUser, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { RegistrationUser } from '../public/auth/register/registration.component';
import { NewPasswordUser } from '../model/newPasswordUser';
import { LoggerService } from './logger.service';
import * as AWS from 'aws-sdk/global';

@Injectable()
export class UserRegistrationService {

    constructor( @Inject(CognitoUtil) public cognitoUtil: CognitoUtil, private logger: LoggerService) {

    }

    register(user: RegistrationUser, callback: CognitoCallback): void {
        this.logger.info('UserRegistrationService: user is ' + user);

        let attributeList = [];

        const dataEmail = {
            Name: 'email',
            Value: user.email
        };
        const dataNickname = {
            Name: 'nickname',
            Value: user.name
        };
        const dataPhone = {
            Name: 'phone_number',
            Value: '+1112223333'
        };
        const username = user.email.replace('@', '_').replace('.', '_');
        attributeList.push(new CognitoUserAttribute(dataEmail));
        attributeList.push(new CognitoUserAttribute(dataNickname));
        attributeList.push(new CognitoUserAttribute(dataPhone));

        const _self = this;
        this.cognitoUtil.getUserPool().signUp(username, user.password, attributeList, null, function(err: any, result: any) {
            if (err) {
                callback.cognitoCallback(err.message, null);
            } else {
                _self.logger.warn('UserRegistrationService: registered user is ' + result);
                callback.cognitoCallback(null, result);
            }
        });

    }

    confirmRegistration(username: string, confirmationCode: string, callback: CognitoCallback): void {

        const userData = {
            Username: username,
            Pool: this.cognitoUtil.getUserPool()
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.confirmRegistration(confirmationCode, true, function(err: any, result: any) {
            if (err) {
                callback.cognitoCallback(err.message, null);
            } else {
                callback.cognitoCallback(null, result);
            }
        });
    }

    resendCode(username: string, callback: CognitoCallback): void {
        const userData = {
            Username: username,
            Pool: this.cognitoUtil.getUserPool()
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.resendConfirmationCode(function(err: any, result: any) {
            if (err) {
                callback.cognitoCallback(err.message, null);
            } else {
                callback.cognitoCallback(null, result);
            }
        });
    }

    newPassword(newPasswordUser: NewPasswordUser, callback: CognitoCallback): void {
        // Get these details and call
        const username = newPasswordUser.email.replace('@', '_').replace('.', '_');

        const authenticationData = {
            Username: username,
            Password: newPasswordUser.existingPassword,
        };
        const authenticationDetails = new AuthenticationDetails(authenticationData);

        const userData = {
            Username: username,
            Pool: this.cognitoUtil.getUserPool()
        };

        this.logger.info('UserLoginService: Params set...Authenticating the user');
        const cognitoUser = new CognitoUser(userData);
        this.logger.info('UserLoginService: config is ' + AWS.config);
        cognitoUser.authenticateUser(authenticationDetails, {
            newPasswordRequired: function(userAttributes: any, requiredAttributes: any) {
                // User was signed up by an admin and must provide new
                // password and required attributes, if any, to complete
                // authentication.

                // the api doesn't accept this field back
                delete userAttributes.email_verified;
                cognitoUser.completeNewPasswordChallenge(newPasswordUser.password, requiredAttributes, {
                    onSuccess: function(result: any) {
                        callback.cognitoCallback(null, userAttributes);
                    },
                    onFailure: function(err: any) {
                        callback.cognitoCallback(err, null);
                    }
                });
            },
            onSuccess: function(result: any) {
                callback.cognitoCallback(null, result);
            },
            onFailure: function(err: any) {
                callback.cognitoCallback(err, null);
            }
        });
    }
}
