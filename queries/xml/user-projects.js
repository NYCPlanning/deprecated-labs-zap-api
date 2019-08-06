/* eslint-disable indent */
const { escapeFetchParam } = require('./helpers');
const {
  EXCLUDED_ACTION_CODES,
  STATUSCODE,
} = require('../../constants');

function userProjectsSQL(accountId) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="true">`,
      `<entity name="dcp_project">`,
        `<attribute name="dcp_name" />`,
        `<link-entity name="dcp_projectlupteam" from="dcp_project" to="dcp_projectid" link-type="inner" alias="lupteam">`,
          `<filter type="and">`,
            `<condition attribute="dcp_lupteammember" operator="eq" value="${accountId}" />`,
          `</filter>`,
        `</link-entity>`,
        `<link-entity name="dcp_projectaction" from="dcp_project" to="dcp_projectid" link-type="outer" alias="actions">`,
          `<filter type="and">`,
            ...EXCLUDED_ACTION_CODES.map(ac => `<condition attribute="dcp_name" operator="not-like" value="${escapeFetchParam(ac + '%')}" />`), // eslint-disable-line
            `<condition attribute="statuscode" operator="ne" value="${STATUSCODE.MISTAKE}" />`,
          `</filter>`,
        `</link-entity>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

module.exports = { userProjectsSQL };
