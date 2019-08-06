/* eslint-disable indent */
const { formatLikeOperator } = require('./helpers');

/**
 * Returns FetchXML for fetching a single project id (called dcp_name in CRM) by ulurp number
 */
function projectForULURPXML(ulurpNumber) {
  return [
     `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="true" top="1">`,
      `<entity name="dcp_project">`,
        `<attribute name="dcp_name"/>`,
        `<link-entity name="dcp_projectaction" from="dcp_project" to="dcp_projectid" link-type="inner" alias="action">`,
          `<filter type ="and">`,
            `<condition attribute="dcp_ulurpnumber" operator="like" value="${formatLikeOperator(ulurpNumber)}" />`,
          `</filter>`,
        `</link-entity>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

module.exports = {
  projectForULURPXML,
};
