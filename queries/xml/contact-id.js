/**
 * Returns FetchXML query param for fetching the contactid associated with a given email.
 * By default, the CRM does case-insensitive string matching
 */
function contactIdXML(email) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="contact">`,
        `<attribute name="contactid" />`,
        `<filter type="and" >`,
          `<condition name="emailaddress1" operator="eq" value="${email}" />`
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

module.exports = { contactIdXML };
