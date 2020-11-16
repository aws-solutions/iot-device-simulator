import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { CognitoUtil } from './cognito.service';
import { Device } from '../model/device';
import { DeviceType } from '../model/deviceType';
import { WidgetRequest } from '../model/widgetRequest';
import { LoggerService } from './logger.service';




import * as _ from 'underscore';
declare var appVariables: any;

@Injectable()
export class DeviceService {

    constructor(private http: HttpClient, private cognito: CognitoUtil, private logger: LoggerService) {
    }

    public getAllDevices(page: number, filter: any) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.logger.info(token);
                    let pg = 0;
                    if (page) {
                        pg = page;
                    }

                    let path = `widgets?page=${pg}&op=list`;
                    if (filter) {
                        path = `${path}&filter=${encodeURI(JSON.stringify(filter))}`;
                    }
                    console.log(path);

                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'devices', path].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data: any) => {
                            let devices: Device[] = [];
                            devices = data.map((device) => new Device(device));
                            resolve(devices);
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

    public getDeviceStats(filter: any, op: string = 'stats') {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            let path = `widgets?op=${op}`;

            if (filter) {
                path = `${path}&filter=${encodeURI(JSON.stringify(filter))}`;
            }

            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'devices', path].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data: any) => {
                            if (op === 'stats') {
                                data.simulations = data.hydrated;
                            }
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

    public getDevice(id: string) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.logger.info(token);

                    const path = `widgets/${id}`;

                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'devices', path].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data: any) => {
                            const device = new Device(data);
                            resolve(device);
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

    public bulkUpdateDevices(devices: Device[]) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            const path = `widgets`;

            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .put<any>([appVariables.APIG_ENDPOINT, 'devices', path].join('/'), devices, {
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

    public updateDevice(device: Device) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            const path = `widgets/${device.id}`;

            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .put<any>([appVariables.APIG_ENDPOINT, 'devices', path].join('/'), device, {
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

    public deleteDevice(deviceId: string) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            const path = `widgets/${deviceId}`;

            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .delete<any>([appVariables.APIG_ENDPOINT, 'devices', path].join('/'), {
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

    public createDevice(widget: WidgetRequest) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.logger.info(token);

                    _self.http
                        .post<any>([appVariables.APIG_ENDPOINT, 'devices', 'widgets'].join('/'), {
                            typeId: widget.typeId,
                            metadata: widget.metadata,
                            count: widget.count
                        }, {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data: any) => {
                            let device = new Device(data);
                            resolve(device);
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

    public getDeviceTypeStats() {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            const path = 'types?op=stats';

            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'devices', path].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data: any) => {
                            _self.logger.info(data);
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

    public getDeviceTypes(page: number) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.logger.info(token);
                    let pg = 0;
                    if (page) {
                        pg = page;
                    }

                    const path = `types?page=${pg}&op=list`;

                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'devices', path].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data: any) => {
                            let deviceTypes: DeviceType[] = [];
                            deviceTypes = data.map((type) => new DeviceType(type));
                            resolve(deviceTypes);
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

    public getDeviceType(id: string) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.logger.info(token);

                    const path = `types/${id}`;

                    _self.http
                        .get<any>([appVariables.APIG_ENDPOINT, 'devices', path].join('/'), {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data: any) => {
                            const deviceType = new DeviceType(data);
                            resolve(deviceType);
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

    public updateDeviceType(type: DeviceType) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            const path = `types/${type.typeId}`;

            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.http
                        .put<any>([appVariables.APIG_ENDPOINT, 'devices', path].join('/'), type, {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data: any) => {
                            _self.logger.info(data);
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

    public createDeviceType(dtype: DeviceType) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {
            this.cognito.getIdToken({
                callback() {
                },
                callbackWithParam(token: any) {
                    _self.logger.info(token);

                    let payload = {
                        spec: dtype.spec,
                        name: dtype.name,
                        custom: dtype.custom,
                        visibility: dtype.visibility
                    };

                    if (_.has(dtype, 'typeId')) {
                        if (dtype.typeId !== 'new') {
                            payload['typeId'] = dtype.typeId;
                        }
                    }

                    _self.http
                        .post<any>([appVariables.APIG_ENDPOINT, 'devices', 'types'].join('/'), payload, {
                            headers: new HttpHeaders().set('Authorization', token)
                        })
                        .toPromise()
                        .then((data: any) => {
                            let type = new DeviceType(data);
                            resolve(type);
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

    public getNextRouteStep(route: string, step: number) {
        const _self = this;

        const promise = new Promise((resolve, reject) => {

            _self.http
                .get<any>('/assets/routes.json', {})
                .toPromise()
                .then(
                data => {
                    resolve(data[route][step]);
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
        });

        return promise;

    }

}
