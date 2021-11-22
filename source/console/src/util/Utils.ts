// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0


import Auth from '@aws-amplify/auth';
import { I18n, Logger } from '@aws-amplify/core';
import { IAttribute, IDeviceType, IErrors, AttributeTypeMap, simTypes} from '../components/Shared/Interfaces';

// Logger for Utils
const logger = new Logger('Utils');

//api name
export const API_NAME = "ids";

//Limits
const stringMax = 30;
const latLimits = 90;
const lngLimits = 180;
const topicMax = 128;
const amtMin = 1;
const amtMax = 100; 
const intvlMin = 1;
const durationMin = 1;
const durationMax = 604800;
const charSetMax = 128;
const lngthMin = 1;
const lngthMax = 36;

//Error strings
const getErrors = (field: string, error: string) => {

  let ERRORS: { [key: string]: { [key: string]: string } } = {
    name: {
      length: `${I18n.get("string.max.length.error")} ${stringMax}`,
      chars: I18n.get("name.error")
    },
    general: {
      range: I18n.get("range.error"),
      required: I18n.get("required.error"),
      type: I18n.get("invalid.type")
    },
    lat: {
      min: `${I18n.get("min.error")} -${latLimits}`,
      max: `${I18n.get("max.error")} ${latLimits}`
    },
    long: {
      min: `${I18n.get("min.error")} -${lngLimits}`,
      max: `${I18n.get("max.error")} ${lngLimits}`
    },
    topic: {
      chars: I18n.get("topic.error"),
      length: `${I18n.get("string.max.length.error")} ${topicMax}`
    },
    amount: {
      min: `${I18n.get("min.error")} ${amtMin}`,
      max: `${I18n.get("max.error")} ${amtMax}`
    },
    interval: {
      min: `${I18n.get("min.error")} ${intvlMin}`

    },
    duration: {
      min: `${I18n.get("min.error")} ${durationMin}`,
      max: `${I18n.get("max.error")} ${durationMax}`
    },
    charSet: {
      length: `${I18n.get("string.max.length.error")} ${charSetMax}`
    },
    length: {
      min: `${I18n.get("min.error")} ${lngthMin}`,
      max: `${I18n.get("max.error")} ${lngthMax}`
    }
  }
  return ERRORS[field][error];
}

/**
 * Signs out the user.
 */
export async function signOut() {
  try {
    await Auth.signOut();
    window.location.reload();
  } catch (error) {
    logger.error(I18n.get("sign.out.error"), error);
  }
}

/**
 * get Attribute fields belonging to an attribute type
 * @param type 
 * @returns Array of attribute fields strings
 */
export const getAttrFields = (type: string) => {
  let attrFields: Array<string>;
  switch (type) {
    case "id":
      attrFields = ["charSet", "length", "static"]
      break;
    case "bool":
      attrFields = ["default"];
      break;
    case "int":
    case "sinusoidal":
    case "decay":
      attrFields = ["min", "max", "default"];
      break;
    case "float":
      attrFields = ["min", "max", "precision", "default"];
      break;
    case "location":
      attrFields = ["lat", "long", "radius"];
      break;
    case "string":
      attrFields = ["min", "max", "static", "default"];
      break;
    case "timestamp":
      attrFields = ["tsformat", "default"];
      break;
    case "pickOne":
      attrFields = ["arr", "static"];
      break;
    case "object":
      attrFields = ["payload"];
      break;
    default: attrFields = [];
  }
  return attrFields;
}

/**
 * Validates the contents of an imported JSON file.
 * @param contents The file contents
 */
export function validateFileContents(contents: IDeviceType) {
  if (typeof contents !== 'object') throw Error(`Invalid JSON`);
  for (const key in contents) {
    let errors: IErrors<IDeviceType> = {};
    try {
      switch (key) {
        case 'name':
        case 'topic':
          if (typeof contents[key] !== "string") {
            throw Error(`${key} ${I18n.get('must.be.string')}`);
          }
          errors = validateField(key, contents[key]);
          break;
        case 'payload':
          if (contents[key].length === 0) {
            throw Error(`${key} ${I18n.get('not.empty')}`)
          } else if (!Array.isArray(contents[key])) {
            throw Error(`${key} ${I18n.get('must.be.array')}`)
          }
          validatePayload(contents[key])
          break;
        default:
          throw Error(`${key}\n${I18n.get('unknown.field')}: ${key}`);
      }
      if (Object.keys(errors).length > 0) {
        throw Error(errors[key]);
      }
    } catch (err) {
      if(err instanceof Error) {
        let trace = I18n.get('trace');
        if (key === 'payload') {
          throw new Error(`\n${trace}: ${err.message}`)
        }
        throw new Error(`\n${trace}: ${key}\n ${err.message}`);
      }
    }
  }
}
/**
 * Checks if Exported file contains valid payload attribute fields
 * @param payload 
 */
export function validatePayload(payload: IAttribute[]) {
  let index = 0;
  let msgString = I18n.get('error.message.title');
  let error: IErrors<IAttribute>;
  try {

    for (index; index < payload.length; index++) {
      let payloadFields = Object.keys(payload[index]);
      //check if payload at index has name and type and they are valid
      if (!payloadFields.includes('name')) {
        throw Error(`\n${msgString}: ${I18n.get('missing.field')} 'name'`);
      } else {
        error = validateField('name', payload[index].name);
        if (Object.keys(error).length > 0) {
          throw Error(`name\n${msgString}: ${error['name']}`);
        }
      }
      if (!payloadFields.includes('type')) {
        throw Error(`\n${msgString}: ${I18n.get('missing.field')} 'type'`)
      } else {
        error = validateField('type', payload[index].type)
        if (Object.keys(validateField('type', payload[index].type)).length > 0) {
          throw Error(`type\n${msgString}: ${error['type']}`);
        }
      }

      //get attribute fields that should exist
      let attrFields = getAttrFields(payload[index].type) as Array<keyof IAttribute>;
      //If returned no fields, not a valid attribute
      if (attrFields.length === 0) {
        throw Error(`\n${msgString}: ${payload[index].type} ${I18n.get('not.valid')}`);
      }

      attrFields.forEach((field: keyof IAttribute) => {
        //Check if field exists
        if (!payloadFields.includes(field)) {
          //If field is optional, skip iteration
          if (!('default charSet length'.includes(field))) {
            throw Error(`\n${msgString}: ${field} ${I18n.get('is.required')}`);
          }
        }
        //if object, recursively check fields
        if (payload[index].payload) {
          validatePayload(payload[index].payload!);
        }
        //Validate fields
        let errors: IErrors<IAttribute> = validateField(field, payload[index][field]);
        if (Object.keys(errors).length > 0) {
          throw Error(`${field}\n${msgString}: ${errors[field]}`);
        }
      })
    }
  } catch (err) {
    if(err instanceof Error){
      throw new Error(`payload[${index}].${err.message}`);
    }
  }
}

/**
 * Checks that a value exists
 * @param value 
 * @returns Boolean
 */
function checkExistence(value: string | number | undefined) {
  return typeof value !== "undefined" && value !== "";
}

/**
 * Checks that a range is valid
 * @param field 
 * @param min 
 * @param max 
 * @returns Error object
 */
export function validateRange(field: string, min: number, max: number) {
  if (isNaN(min) || (isNaN(max)) || min > max) {
    return { [field]: getErrors('general', 'range') };
  }
  else return {};
}

/**
 * Checks the type of an attribute value
 * @param field 
 * @param value 
 * @returns boolean
 */
function confirmValidType<K extends keyof IAttribute>(field: K, value: IAttribute[K]): boolean {
  const optional = ["charSet", "default", "length"].includes(field);
  let validType: boolean;

    if (field === 'default') {
      validType = AttributeTypeMap[field].includes(typeof value)
    } else {
      validType = typeof value === AttributeTypeMap[field]
    }
      
    return validType || (optional && value === undefined);
}

/**
 * Checks the validity of the attribute values
 * @param field 
 * @param value 
 * @returns Error object
 */
export function verifyAttributeField(field: keyof IAttribute, value: any): Object {
  if (!confirmValidType(field, value)) {
    return {[field]: `${getErrors('general', 'type')}, ${I18n.get('expecting')} ${AttributeTypeMap[field]}`};
  }
  switch (field) {
    case "lat":
      if (value < -latLimits) return { [field]: getErrors('lat', 'min') };
      else if (value > latLimits) return { [field]: getErrors('lat', 'max') };
      break;
    case "long":
      if (value < -lngLimits) return { [field]: getErrors('long', 'min') };
      else if (value > lngLimits) return { [field]: getErrors('long', 'max') };
      break;
    case "charSet":
      if (value && value > charSetMax) return { [field]: getErrors('charSet', 'length') };
      break;
    case "length":
      if (value && value < lngthMin) return { [field]: getErrors('length', 'min') };
      else if (value > lngthMax) return { [field]: getErrors('length', 'max') };
      break;
    default: return {};
  }
  return {};
}

/**
 * Checks if name values are character charaters and length
 * @param value 
 * @returns Error object
 */
function validateName(value: string) {
  let error: { [key: string]: string } = {};
  value = value.trim();
  if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
    error.name = getErrors('name', 'chars');
  }
  else if (value.length > stringMax) {
    error.name = getErrors('name', 'length');
  }
  return error;
}

/**
 * Checks if name values are character charaters and length
 * @param value 
 * @returns Error object
 */
export function validateTopic(value: string) {
  let error: { [key: string]: string } = {}
  value = value.trim();
  if (!/^[^+#]+$/.test(value)) {
    error.topic = getErrors('topic', 'chars');
  }
  else if (value.length > topicMax) {
    error.topic = getErrors('topic', 'length');
  }
  return error;
}

/**
 * Checks the validity of a form field value
 * @param field 
 * @param value 
 * @returns Error object
 */
export function validateField(field: string, value: any): Object {
  let error: { [key: string]: string } = {};

  const optional = 'default length charSet'.includes(field);
  //check if value exists
  if (!optional && !checkExistence(value)) {
    error[field] = getErrors('general', 'required');
    return error;
  }

  //if passed existence check, check limits
  switch (field) {
    case "name":
      return validateName(value);
    case "topic":
      return validateTopic(value);
    case "amount":
      if (value < amtMin) return { amount: getErrors('amount', 'min') };
      else if (value > amtMax) return { amount: getErrors('amount', 'max') };
      else return {};
    case "interval":
      if (value < intvlMin) return { interval: getErrors('interval', 'min') };
      break;
    case "duration":
      if (value < durationMin) return { duration: getErrors('duration', 'min') };
      else if (value > durationMax) return { duration: getErrors('duration', 'max') }
      break;
    default:
      return verifyAttributeField(field as keyof IAttribute, value);
  }
  return {}
}

export const VehicleDemoPayload = { 
  typeId: simTypes.autoDemo,
  payload: [
    { "name": "VIN", "type": "id", "charSet": "ABCDEFGHILJKLMNOPQRSTUVWXYZ0123456789", "length": 17 }, 
    { "name": "tripId", "type": "id"},
    { "name": "brake", "min": 0, "type": "float", "max": 100, "precision": 0.1 }, 
    { "name": "steeringWheelAngle", "min": 0, "type": "float", "max": 900, "precision": 0.1 }, 
    { "name": "torqueAtTransmission", "min": 0, "type": "float", "max": 9000, "precision": 0.1 }, 
    { "name": "engineSpeed", "min": 0, "type": "float", "max": 13563, "precision": 0.01 }, 
    { "name": "vehicleSpeed", "min": 0, "type": "float", "max": 500, "precision": 0.01 }, 
    { "name": "acceleration", "min": 0, "type": "float", "max": 500, "precision": 0.0001 }, 
    { "name": "acceleratorPedalPos", "min": 0, "type": "float", "max": 100, "precision": 0.1 }, 
    { "name": "parkingBrakeStatus", "type": "bool" }, 
    { "name": "brakePedalStatus", "type": "bool" }, 
    { "name": "transmissionGearPosition", "arr": ["neutral", "first", "second", "third", "fourth", "fifth", "sixth"], "static": false, "type": "pickOne" }, 
    { "name": "gearLeverPosition", "default": "drive", "static": false, "type": "string" }, 
    { "name": "odometer", "min": 0, "type": "float", "max": 1000, "precision": 0.001 }, 
    { "name": "ignitionStatus", "arr": ["run", "off"], "static": false, "type": "pickOne" }, 
    { "name": "fuelLevel", "min": 0, "type": "float", "max": 100, "precision": 0.01 }, 
    { "name": "fuelConsumedSinceRestart", "min": 0, "type": "float", "max": 40, "precision": 0.000001 }, 
    { "name": "oilTemp", "min": 0, "type": "float", "max": 320, "precision": 0.1 }, 
    { "name": "location", "type": "location", "radius": 500000, "lat": 0, "long": 0 }
  ]}


