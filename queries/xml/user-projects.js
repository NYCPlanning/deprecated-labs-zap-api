/* eslint-disable indent */
const { escapeFetchParam } = require('./helpers');
const {
  EXCLUDED_ACTION_CODES,
  STATUSCODE,
} = require('../../constants');

function userProjectsXML(userId, milestones, projectState) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="true">`,
      `<entity name="dcp_project">`,
        `<attribute name="dcp_name" />`,
         // other project attributes here
        `<link-entity name="dcp_projectlupteam" from="dcp_project" to="dcp_projectid" link-type="inner" alias="lupteam">`,
          `<filter type="and">`,
            `<condition attribute="dcp_lupteammember" operator="eq" value="${userId}" />`,
          `</filter>`,
        `</link-entity>`,
//        `<link-entity name="dcp_projectaction" from="dcp_project" to="dcp_projectid" link-type="inner" alias="actions">`,
//          `<filter type="and">`,
//            ...EXCLUDED_ACTION_CODES.map(ac => `<condition attribute="dcp_name" operator="not-like" value="${escapeFetchParam(ac + '%')}" />`), // eslint-disable-line
//            `<condition attribute="statuscode" operator="ne" value="${STATUSCODE.MISTAKE}" />`,
//          `</filter>`,
//        `</link-entity>`,
        `<link-entity name="dcp_projectmilestone" from="dcp_project" to ="dcp_projectid" link-type="inner" alias="milestones">`,
          // milestone attributes here
          `<filter type="and">`,
            `<condition attribute="dcp_milestone" operator="in">`,
              ...milestones.map(milestone => `<value>{${milestone}}</value>`),
            `</condition>`,
            ...getMilestoneDateFilter(projectState),
          `</filter>`,
        `</link-entity>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

function getMilestoneDateFilter(projectState) {
  const now = new Date();
  // target milestone has not started yet

  if (projectState === 'upcoming') {
    return [
      `<filter type="or">`,
        `<condition attribute="dcp_plannedstartdate" operator="gt" value="${escapeFetchParam(now.toISOString())}" />`,
        `<filter type="and">`,
          `<condition attribute="dcp_actualstartdate" operator="not-null" />`,
          `<condition attribute="dcp_actualstartdate" operator="gt" value="${escapeFetchParam(now.toISOString())}" />`,
        `</filter>`,
      `</filter>`,
    ];
  }

  // target milestone is ongoing
  if (projectState === 'current') {
    return [
      `<filter type="and">`,
        `<condition attribute="dcp_actualstartdate" operator="not-null" />`,
        `<condition attribute="dcp_actualstartdate" operator="lt" value="${escapeFetchParam(now.toISOString())}" />`,
        `<filter type="or">`,
          `<condition attribute="dcp_actualenddate" operator="null" />`,
          `<condition attribute="dcp_actualenddate" operator="gt" value="${escapeFetchParam(now.toISOString())}" />`,
        `</filter>`,
      `</filter>`,
    ];
  }

  // target milestone is past
  // projectState = 'reviewed' or 'archived' (determined based on project status)
  return [
    `<filter type="and">`,
      `<condition attribute="dcp_actualenddate" operator="lt" value="${escapeFetchParam(now.toISOString())}" />`,
    `</filter>`,
  ];
}

module.exports = { userProjectsXML };
