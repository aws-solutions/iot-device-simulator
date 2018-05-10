export class Attribute {
    _id_: string;
    name: string;
    type: string = 'uuid';
    default: string = '';
    static: boolean = true;
    tsformat: string = 'default';
    dmin: number = 0;
    dmax: number = 99;
    imin: number = 0;
    imax: number = 100;
    precision: number = 2;
    smin: number = 1;
    smax: number = 20;
    min: number = 0;
    max: number = 1000;
    bmin: number = 1;
    bmax: number = 5;
    bseed: number = 4;
    lat: number = 38.9072;
    long: number = 77.0369;
    radius: number = 1609;
    arr: string[] = ['running', 'stopped', 'starting', 'error'];
}
