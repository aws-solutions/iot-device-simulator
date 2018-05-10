export class WidgetRequest {
    typeId: string = '';
    count: number = 1;
    metadata: any = {};

    constructor(values: Object = {}) {
        Object.assign(this, values);
    }

}
