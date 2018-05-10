import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserLoginService } from '../../../service/user-login.service';
import { CognitoCallback } from '../../../service/cognito.service';
import { LoggerService } from '../../../service/logger.service';
declare var jquery: any;
declare var $: any;

@Component({
    selector: 'app-ratchet',
    templateUrl: './forgotPassword.html'
})
export class ForgotPasswordStep1Component implements OnInit, CognitoCallback {
    email: string;
    errorMessage: string;

    constructor(public router: Router,
        public userService: UserLoginService,
        private logger: LoggerService) {
        this.errorMessage = null;
    }

    ngOnInit() {
        $('.owl-carousel').owlCarousel({
            slideSpeed: 300,
            paginationSpeed: 400,
            singleItem: !0,
            autoPlay: !0
        });
    }

    onNext() {
        this.errorMessage = null;
        this.userService.forgotPassword(this.email, this);
    }

    cognitoCallback(message: string, result: any) {
        if (message == null && result == null) {
            // error
            this.router.navigate(['/home/forgotPassword', this.email]);
        } else {
            // success
            this.errorMessage = message;
        }
    }
}


@Component({
    selector: 'app-ratchet',
    templateUrl: './forgotPasswordStep2.html'
})
export class ForgotPassword2Component implements CognitoCallback, OnInit, OnDestroy {

    verificationCode: string;
    email: string;
    password: string;
    errorMessage: string;
    private sub: any;

    constructor(
        public router: Router,
        public route: ActivatedRoute,
        public userService: UserLoginService,
        private logger: LoggerService) {
        this.logger.info('email from the url: ' + this.email);
    }

    ngOnInit() {
        this.sub = this.route.params.subscribe(params => {
            this.email = params['email'];
        });
        this.errorMessage = null;

        $('.owl-carousel').owlCarousel({
            slideSpeed: 300,
            paginationSpeed: 400,
            singleItem: !0,
            autoPlay: !0
        });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    onNext() {
        this.errorMessage = null;
        this.userService.confirmNewPassword(this.email, this.verificationCode, this.password, this);
    }

    cognitoCallback(message: string) {
        if (message != null) {
            // error
            this.errorMessage = message;
            this.logger.error('result: ' + this.errorMessage);
        } else {
            // success
            this.router.navigate(['/home/login']);
        }
    }

}
