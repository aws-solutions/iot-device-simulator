import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { CognitoUtil } from './cognito.service';
import { User } from '../model/user';
import { Invitation } from '../model/invitation';
import { Group } from '../model/group';
import { Setting } from '../model/setting';
import { LoggerService } from './logger.service';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/toPromise';
declare var appVariables: any;

@Injectable()
export class AdminService {

    constructor(private http: HttpClient, private cognito: CognitoUtil, private logger: LoggerService) {
    }

    public getAllUsers() {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'admin', 'users'].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data) => {
                            let users: User[] = [];
                            users = data.map((user) => new User(user));
                            resolve(users);
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


    public getUser(username: string) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'admin', 'users', username].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data: User) => {
                            resolve(data);
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

    public getGroups() {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'admin', 'groups'].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data) => {
                            let groups: Group[] = [];
                            groups = data.map((group) => new Group(group));
                            resolve(groups);
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


    public disableUser(username: string) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .put<any>([appVariables.APIG_ENDPOINT, 'admin', 'users', username].join('/'), {
                            'operation': 'disable'
                        }, {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data) => {
                            resolve();
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


    public enableUser(username: string) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .put<any>([appVariables.APIG_ENDPOINT, 'admin', 'users', username].join('/'), {
                            'operation': 'enable'
                        }, {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data) => {
                            resolve();
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

    public deleteUser(username: string) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .delete<any>([appVariables.APIG_ENDPOINT, 'admin', 'users', username].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data) => {
                            resolve();
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

    public updateUser(user: User) {
        const _self = this;

        const _payload = {
            operation: 'update',
            user: {
                user_id: user.user_id,
                display_name: user.name,
                email: user.email,
                groups: user.groups
            }
        };

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .put<any>([appVariables.APIG_ENDPOINT, 'admin', 'users', user.user_id].join('/'), _payload, {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data) => {
                            resolve();
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


    public inviteUser(invite: Invitation) {
        const _self = this;

        const _payload = {
            name: invite.name,
            email: invite.email,
            groups: invite.groups
        };

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .post<any>([appVariables.APIG_ENDPOINT, 'admin', 'invitations'].join('/'), _payload, {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data) => {
                            resolve();
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

    public getSettings(settingId: string) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            const path = `settings?id=${settingId}`;

            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'admin', path].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data) => {
                            let setting = new Setting(data);
                            resolve(setting);
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

    public updateSettings(setting: Setting) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .put<any>([appVariables.APIG_ENDPOINT, 'admin', 'settings'].join('/'), setting, {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data: any) => {
                            resolve(data);
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
                        });
                }
            });
        });

        return promise;
    }

    private handleError(error: Response | any) {
        console.error('ApiService::handleError', error);
        return Observable.throw(error);
    }

}
