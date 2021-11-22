// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export interface IPageProps {
    region: string,
    title: string
}

export interface IAttribute {
    name: string,
    type: string,
    charSet?: string,
    length?: number,
    default?: string | number,
    static?: boolean,
    tsformat?: string,
    precision?: number,
    min?: number,
    max?: number,
    lat?: number,
    long?: number,
    radius?: number,
    arr?: string[] | string,
    object?: IAttribute
    payload?: IAttribute[];
}

export interface IDeviceType {
    name: string,
    topic: string,
    typeId: string,
    payload: Array<IAttribute>
    createdAt?: string,
    updatedAt?: string
}

export interface IDevice {
    typeId: string,
    name: string,
    amount: number,
}

export interface ISimulation {
    simId: string,
    name: string,
    stage: string,
    duration: number,
    interval: number,
    devices: Array<IDevice>,
    runs?: number,
    lastRun?: string,
    createdAt?: string,
    updatedAt?: string
    checked?: boolean
}

export type IErrors<T> = {
    [key in keyof T]?: string
}

export const AttributeTypeMap = {
    default: ['string', 'number'],
    name: 'string',
    type: 'string',
    charSet: 'string',
    length: 'number',
    static: 'boolean',
    tsformat: 'string',
    precision: 'number',
    min: 'number',
    max: 'number',
    lat: 'number',
    long: 'number',
    radius: 'number',
    arr: 'object',
    object: 'object',
    payload: 'object'
}

export enum simTypes{
    autoDemo = "idsAutoDemo",
    custom = "custom"
}