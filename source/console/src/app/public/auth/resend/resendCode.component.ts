import { Component, OnInit } from '@angular/core';
import { UserRegistrationService } from '../../../service/user-registration.service';
import { CognitoCallback } from '../../../service/cognito.service';
import { LoggerService } from '../../../service/logger.service';
import { Router } from '@angular/router';
declare var jquery: any;
declare var $: any;

@Component({
    selector: 'app-ratchet',
    templateUrl: './resendCode.html'
})
export class ResendCodeComponent implements CognitoCallback, OnInit {

    email: string;
    username: string;
    errorMessage: string;

    constructor(
        public registrationService: UserRegistrationService,
        public router: Router,
        private logger: LoggerService) {

    }

    ngOnInit() {
        $('.owl-carousel').owlCarousel({
            slideSpeed: 300,
            paginationSpeed: 400,
            singleItem: !0,
            autoPlay: !0
        });
    }

    resendCode() {
        this.username = this.email.replace('@', '_').replace('.', '_');
        this.registrationService.resendCode(this.username, this);
    }

    cognitoCallback(error: any, result: any) {
        if (error != null) {
            this.errorMessage = 'Something went wrong...please try again';
        } else {
            this.router.navigate(['/home/confirmRegistration', this.username]);
        }
    }
}
