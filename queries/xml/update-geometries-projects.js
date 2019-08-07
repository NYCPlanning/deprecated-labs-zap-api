/* eslint-disable indent */

const { VISIBILITY } = require('../../constants');
const { escapeFetchParam } = require('./helpers');

function updateGeometriesProjectsXML(page, count, pagingCookie, modifiedOn = false, projectId = false) {
  return [
   `<fetch version="1.0" output-format="xml-platform" mapping="logical" paging-cookie="${escapeFetchParam(pagingCookie)}" page="${page}" count="${count}" >`,
      `<entity name="dcp_project">`,
        `<attribute name="dcp_name" />`,
        `<filter type="and">`,
          getProjectIdFilter(projectId),
          `<condition attribute="dcp_visibility" operator="eq" value="${VISIBILITY.GENERAL_PUBLIC}" />`,
        `</filter>`,
        `<link-entity name="dcp_projectbbl" from="dcp_project" to="dcp_projectid" link-type="inner" alias="bbls">`,
          `<attribute name="dcp_bblnumber" />`,
          `<filter type="and">`,
            getModifiedFilter(modifiedOn),
            `<condition attribute="statuscode" operator="eq" value="1" />`,
            `<condition attribute="dcp_bblnumber" operator="not-null" />`,
          `</filter>`,
        `</link-entity>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

function getProjectIdFilter(projectId) {
  return projectId
    ? `<condition attribute="dcp_name" operator="eq" value="${projectId}" />`
    : '';
}

function getModifiedFilter(modifiedOn) {
  return modifiedOn
    ? `<condition attribute="modifiedon" operator="gt" value="${escapeFetchParam(modifiedOn.toISOString())}" />`
    : '';
}
module.exports = { updateGeometriesProjectsXML };
