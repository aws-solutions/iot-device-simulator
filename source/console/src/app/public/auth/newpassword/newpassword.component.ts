import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserRegistrationService } from '../../../service/user-registration.service';
import { UserLoginService } from '../../../service/user-login.service';
import { CognitoCallback } from '../../../service/cognito.service';
import { NewPasswordUser } from '../../../model/newPasswordUser';
import { LoggerService } from '../../../service/logger.service';


/**
 * This component is responsible for displaying and controlling
 * the registration of the user.
 */
@Component({
    selector: 'app-ratchet-newpassword',
    templateUrl: './newpassword.html'
})
export class NewPasswordComponent implements CognitoCallback {
    registrationUser: NewPasswordUser;
    router: Router;
    errorMessage: string;

    constructor(
        public userRegistration: UserRegistrationService,
        public userService: UserLoginService,
        router: Router,
        private logger: LoggerService) {
        this.router = router;
        this.onInit();
    }

    onInit() {
        this.registrationUser = new NewPasswordUser();
        this.errorMessage = null;
        this.logger.info('Checking if the user is already authenticated. If so, then redirect to the secure site');
    }

    setPassword() {
        this.errorMessage = null;
        this.userRegistration.newPassword(this.registrationUser, this);
    }

    cognitoCallback(message: string, result: any) {
        if (message != null) { //error
            this.errorMessage = message;
            this.logger.error('result: ' + this.errorMessage);
        } else { //success
            //move to the next step
            this.logger.info('redirecting');
            this.router.navigate(['/securehome']);
        }
    }

}
