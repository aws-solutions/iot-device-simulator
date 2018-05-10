import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { AppComponent } from './app.component';
import { UserRegistrationService } from './service/user-registration.service';
import { UserLoginService } from './service/user-login.service';
import { DeviceService } from './service/device.service';
import { StatsService } from './service/stats.service';
import { AdminService } from './service/admin.service';
import { LoggerService } from './service/logger.service';
import { MQTTService } from './service/mqtt.service';
import { ConsoleLoggerService } from './service/console-logger.service';
import { CognitoUtil } from './service/cognito.service';
import { MetricsService } from './service/metrics.service';
import { routing } from './app.routes';
import { HomeComponent, HomeLandingComponent } from './public/home.component';
import { SecureHomeComponent } from './secure/landing/securehome.component';
import { UsersComponent } from './secure/admin/users/users.component';
import { UserComponent } from './secure/admin/users/user.component';
import { SettingsComponent } from './secure/admin/settings/settings.component';
import { MyDevicesComponent } from './secure/devices/mydevices.component';
import { WidgetsComponent } from './secure/devices/widgets.component';
import { WidgetComponent } from './secure/devices/widget.component';
import { DeviceTypesComponent } from './secure/devices/types.component';
import { DeviceTypeComponent } from './secure/devices/type.component';
import { FleetComponent } from './secure/automotive/fleet.component';
import { VehicleComponent } from './secure/automotive/vehicle.component';
import { CustomizeAutomotiveComponent } from './secure/automotive/customize.component';
import { ProfileComponent } from './secure/profile/profile.component';
import { DashboardComponent } from './secure/dashboard/dashboard.component';
import { GetStartedComponent } from './secure/landing/getstarted.component';
import { LoginComponent } from './public/auth/login/login.component';
import { RegisterComponent } from './public/auth/register/registration.component';
import { ForgotPassword2Component, ForgotPasswordStep1Component } from './public/auth/forgot/forgotPassword.component';
import { LogoutComponent, RegistrationConfirmationComponent } from './public/auth/confirm/confirmRegistration.component';
import { ResendCodeComponent } from './public/auth/resend/resendCode.component';
import { NewPasswordComponent } from './public/auth/newpassword/newpassword.component';
import { HttpClientModule } from '@angular/common/http';
import { AsyncLocalStorageModule } from 'angular-async-local-storage';
import { EqualValidator } from './shared/equal-validator.directive';
import { BlockUIModule } from 'ng-block-ui';

@NgModule({
    declarations: [
        LoginComponent,
        LogoutComponent,
        RegistrationConfirmationComponent,
        ResendCodeComponent,
        ForgotPasswordStep1Component,
        ForgotPassword2Component,
        RegisterComponent,
        NewPasswordComponent,
        HomeLandingComponent,
        HomeComponent,
        SecureHomeComponent,
        AppComponent,
        UsersComponent,
        UserComponent,
        MyDevicesComponent,
        ProfileComponent,
        FleetComponent,
        CustomizeAutomotiveComponent,
        EqualValidator,
        DashboardComponent,
        VehicleComponent,
        WidgetsComponent,
        WidgetComponent,
        DeviceTypesComponent,
        DeviceTypeComponent,
        GetStartedComponent,
        SettingsComponent
    ],
    imports: [
        BrowserModule,
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        HttpModule,
        routing,
        AsyncLocalStorageModule,
        BlockUIModule.forRoot()
    ],
    providers: [
        CognitoUtil,
        UserRegistrationService,
        UserLoginService,
        DeviceService,
        AdminService,
        MetricsService,
        MQTTService,
        StatsService,
        { provide: LoggerService, useClass: ConsoleLoggerService }
    ],
    bootstrap: [AppComponent]
})

export class AppModule { }
