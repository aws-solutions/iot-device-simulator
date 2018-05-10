export class Message {
    topic: string = '';
    content: any = {};
    timestamp: string = '';

    constructor(values: Object = {}) {
        Object.assign(this, values);
    }

}
