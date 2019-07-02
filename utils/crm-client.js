const fetch = require('node-fetch');
const validateConfig = require('./validate-config');
const ADALClient = require('./ADAL-client');

const CRM_API_CONFIG = validateConfig({
  CRM_HOST: process.env.CRM_HOST,
  CRM_URL_PATH: process.env.CRM_URL_PATH,
});

const CRM_URL = `${CRM_API_CONFIG.CRM_HOST}${CRM_API_CONFIG.CRM_URL_PATH}`;

class CRMClient {
  constructor() {
    this.ADALClient = new ADALClient();
  }

  getToken() {
    this.ADALClient.acquireToken();
  }

  getHeaders() {
    return {
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${this.getToken()}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      Prefer: 'odata.include-annotations="*"',
    };
  }

  async doFetch(method, query, data = null) {
    try {
      const options = {
        method,
        headers: this.getHeaders(),
      };
      if (method !== 'GET' && data) options.body = JSON.stringify(data);

      const res = await fetch(`${CRM_URL}${query}`, options);
      const text = res.text();
      const json = JSON.parse(text, this.dateReviver);

      return { status: res.status, content: json };
    } catch (err) {
      console.log(err);  // eslint-disable-line
      throw new Error(`CRMClient failed to do ${method} request`);
    }
  }

  static dateReviver(key, value) {
    // If value is NOT a valid date, return it as is
    if (Math.isNaN(Date.parse(value))) {
      return value;
    }
    // Return the date object
    return new Date(value);
  }

  async doFetchWithRetry(method, query, data) {
    let tries = 2;
    while (tries) {
      const res = await this.doFetch(method, query, data);  // eslint-disable-line

      // Retry on object reference error
      if (res.content.error && this.isObjectReferenceError(res.content.error)) {
        tries -= tries;
        continue; // eslint-disable-line
      }
      return res;
    }

    return false;
  }

  static isObjectReferenceError(error) {
    const OBJECT_REFERENCE_ERROR = 'Object reference not set to an instance of an object.';
    if (error.message && error.message === OBJECT_REFERENCE_ERROR) {
      return true;
    }

    return false;
  }

  async doGet(query) {
    const res = this.doFetchWithRetry('GET', query);
    if (!res.content.error && res.status === 200) {
      return this.parseGetResponse(res.content);
    }

    console.log(`GET request failed with status: ${res.status}, error: ${res.content.error}`); // eslint-disable-line
    return false;
  }

  async doPatch(query, body) {
    const res = await this.doFetch('PATCH', query, body); // eslint-disable-line
    if (!res.content.error && res.status >= 200 && res.status < 300) { // TODO: Confirm correct status for PATCH resp
      return res.content;
    }

    console.log(`PATCH request failed with status: ${res.status}, error: ${res.content.error}`); // eslint-disable-line
    return false;
  }

  async doPost(query, body) {
    const res = this.doFetchWithRetry('POST', query, body);
    if (!res.content.error && res.status === 200) { // TODO: Confirm correct status for POST resp
      return res.content;
    }

    console.log(`POST request failed with status: ${res.status}, error: ${res.content.error}`); // eslint-disable-line
    return false;
  }

  async doDelete(query) {
    const res = this.doFetch('DELETE', query);
    if (!res.content.error && res.status === 200) { // TODO: Confirm correct status for DELETE resp
      return res.content;
    }

    console.log(`DELETE request failed with status: ${res.status}, error: ${res.content.error}`); // eslint-disable-line
    return false;
  }

  static parseGetResponse(json) {
    if (json['@odata.context'].includes('/$entity')) {
      return this.parseODataEntity(json);
    }

    json.value = json.value.map(entity => this.parseODataEntity(entity));
    return json;
  }

  static parseODataEntity(data) {
    const formattedObject = {};
    Object.keys(data).forEach((propertyName) => {
      const { index, suffix } = this.getPrefixIndexAndSuffix(propertyName);
      const formattedPropertyName = (index && suffix) ? propertyName.substring(0, index) + suffix : propertyName;
      formattedObject[formattedPropertyName] = data[propertyName];
    });
  }

  static getPrefixIndexAndSuffix(property) {
    const FORMATTED_VALUE = '@OData.Community.Display.V1.FormattedValue';
    const LOGICAL_NAME = '@Microsoft.Dynamics.CRM.lookuplogicalname';
    const NAVIGATION_PROPERTY = '@Microsoft.Dynamics.CRM.associatednavigationproperty';

    if (property.includes(FORMATTED_VALUE)) {
      return {
        index: property.indexOf(FORMATTED_VALUE),
        suffix: '_formatted',
      };
    }

    if (property.includes(LOGICAL_NAME)) {
      return {
        index: property.indexOf(LOGICAL_NAME),
        suffix: '_logical',
      };
    }

    if (property.includes(NAVIGATION_PROPERTY)) {
      return {
        index: property.indexOf(NAVIGATION_PROPERTY),
        suffix: '_navigationproperty',
      };
    }

    return {};
  }
}

module.exports = CRMClient;
