/**
 * Returns FetchXML query param for fetching the contactid associated with a given email.
 * By default, the CRM does case-insensitive string matching
 */
function contactIdXML(contactid) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="contact">`,
        `<attribute name="fullname" />`,
        `<attribute name="telephone1" />`,
        `<attribute name="emailaddress1" />`,
        `<attribute name="parentcustomerid" />`,
        `<attribute name="dcp_salutation" />`,
        `<attribute name="contactid" />`,
        `<filter type="and" >`,
          `<condition attribute="contactid" operator="eq" value="${contactid}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

module.exports = { contactIdXML };
