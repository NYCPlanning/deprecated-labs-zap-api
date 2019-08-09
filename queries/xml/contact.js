/* eslint-disable indent */

/**
 * Returns FetchXML query param for fetching the contact associated with a given email.
 * By default, the CRM does case-insensitive string matching
 */
function contactXML(email) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false" top="1">`,
      `<entity name="contact">`,
        `<attribute name="fullname" />`,
        `<attribute name="contactid" />`,
        `<filter type="and">`,
          `<condition attribute="emailaddress1" operator="eq" value="${email}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

module.exports = { contactXML };
