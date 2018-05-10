import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserLoginService } from '../../../service/user-login.service';
import { CognitoCallback, LoggedInCallback } from '../../../service/cognito.service';
import { LoggerService } from '../../../service/logger.service';
declare var jquery: any;
declare var $: any;


@Component({
    selector: 'app-ratchet',
    templateUrl: './login.html'
})
export class LoginComponent implements CognitoCallback, OnInit { // LoggedInCallback
    email: string;
    password: string;
    errorMessage: string;

    constructor(
        public router: Router,
        public userService: UserLoginService,
        private logger: LoggerService) {
    }

    ngOnInit() {
        this.errorMessage = null;
        this.logger.info('Checking if the user is already authenticated. If so, then redirect to the secure site');

        $('.owl-carousel').owlCarousel({
            slideSpeed: 300,
            paginationSpeed: 400,
            singleItem: !0,
            autoPlay: !0
        });
    }

    onLogin() {
        if (this.email == null || this.password == null) {
            this.errorMessage = 'All fields are required';
            return;
        }
        this.errorMessage = null;
        this.userService.authenticate(this.email, this.password, this);
    }

    cognitoCallback(message: string, result: any) {
        if (message != null) {
            // error
            this.errorMessage = message;
            this.logger.info('result: ' + this.errorMessage);
            if (this.errorMessage === 'User is not confirmed.') {
                this.logger.error('redirecting');
                this.router.navigate(['/home/confirmRegistration', this.email]);
            } else if (this.errorMessage === 'User needs to set password.') {
                this.logger.error('redirecting to set new password');
                this.router.navigate(['/home/newPassword']);
            }
        } else {
            // success
            this.router.navigate(['/securehome']);
        }
    }

    // isLoggedIn(message: string, isLoggedIn: boolean, profile: ProfileInfo) {
    //     if (isLoggedIn) {
    //         this.router.navigate(['/securehome']);
    //     }
    // }
}
