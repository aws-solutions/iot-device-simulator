import { RouterModule, Routes } from '@angular/router';
import { ModuleWithProviders } from '@angular/core';
import { HomeComponent, HomeLandingComponent } from './public/home.component';
import { SecureHomeComponent } from './secure/landing/securehome.component';
import { UsersComponent } from './secure/admin/users/users.component';
import { UserComponent } from './secure/admin/users/user.component';
import { SettingsComponent } from './secure/admin/settings/settings.component';
import { ProfileComponent } from './secure/profile/profile.component';
import { DashboardComponent } from './secure/dashboard/dashboard.component';
import { GetStartedComponent } from './secure/landing/getstarted.component';
import { LoginComponent } from './public/auth/login/login.component';
import { RegisterComponent } from './public/auth/register/registration.component';
import { ForgotPassword2Component, ForgotPasswordStep1Component } from './public/auth/forgot/forgotPassword.component';
import { LogoutComponent, RegistrationConfirmationComponent } from './public/auth/confirm/confirmRegistration.component';
import { ResendCodeComponent } from './public/auth/resend/resendCode.component';
import { NewPasswordComponent } from './public/auth/newpassword/newpassword.component';
import { MyDevicesComponent } from './secure/devices/mydevices.component';
import { WidgetsComponent } from './secure/devices/widgets.component';
import { WidgetComponent } from './secure/devices/widget.component';
import { DeviceTypesComponent } from './secure/devices/types.component';
import { DeviceTypeComponent } from './secure/devices/type.component';
import { FleetComponent } from './secure/automotive/fleet.component';
import { VehicleComponent } from './secure/automotive/vehicle.component';
import { CustomizeAutomotiveComponent } from './secure/automotive/customize.component';

const homeRoutes: Routes = [
    {
        path: '',
        redirectTo: '/home/login',
        pathMatch: 'full'
    },
    {
        path: 'home',
        component: HomeComponent,
        children: [
            { path: 'login', component: LoginComponent },
            { path: 'register', component: RegisterComponent },
            { path: 'confirmRegistration/:username', component: RegistrationConfirmationComponent },
            { path: 'resendCode', component: ResendCodeComponent },
            { path: 'forgotPassword/:email', component: ForgotPassword2Component },
            { path: 'forgotPassword', component: ForgotPasswordStep1Component },
            { path: 'newPassword', component: NewPasswordComponent }
        ]
    }
];

const secureHomeRoutes: Routes = [
    {

        path: '',
        redirectTo: '/securehome',
        pathMatch: 'full'
    },
    {
        path: 'securehome', component: SecureHomeComponent, children: [
            { path: 'logout', component: LogoutComponent },
            { path: 'admin/users', component: UsersComponent },
            { path: 'admin/users/:username', component: UserComponent },
            { path: 'admin/settings', component: SettingsComponent },
            { path: 'devices', component: MyDevicesComponent },
            { path: 'general', component: WidgetsComponent },
            { path: 'general/:deviceId', component: WidgetComponent },
            { path: 'automotive', component: FleetComponent },
            { path: 'automotive/customize', component: CustomizeAutomotiveComponent },
            { path: 'automotive/vehicle/:vehicleId', component: VehicleComponent },
            { path: 'profile', component: ProfileComponent },
            { path: 'types', component: DeviceTypesComponent },
            { path: 'types/:typeId', component: DeviceTypeComponent },
            { path: 'dashboard', component: DashboardComponent },
            { path: '', component: GetStartedComponent }
        ]
    }
];

const routes: Routes = [
    {
        path: '',
        children: [
            ...homeRoutes,
            ...secureHomeRoutes,
            {
                path: '',
                component: HomeComponent
            }
        ]
    },


];

export const appRoutingProviders: any[] = [];

export const routing: ModuleWithProviders = RouterModule.forRoot(routes);
