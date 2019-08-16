/* eslint-disable indent */

const projectAttrsPartial = require('./_project-attrs');
const { formatLikeOperator } = require('../helpers');

module.exports = function userProjectsXML(contactId) {
  console.log(contactId);
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="true">`,
      `<entity name="dcp_project">`,
        ...projectAttrsPartial,
        // `<filter type="and">`,
        //   `<condition attribute="dcp_publicstatus" operator="in">`,
        //     `<value>717170001</value>`,
        //     `<value>717170000</value>`,
        //   `</condition>`,
        // `</filter>`,
        // `<link-entity name="processstage" from="processstageid" to="stageid" visible="false" link-type="outer" alias="a_142da9b6ac8be71181111458d04eaba0">`,
        //   `<attribute name="stagename" />`,
        // `</link-entity>`,
        `<link-entity name="dcp_projectlupteam" from="dcp_project" to="dcp_projectid" link-type="inner" alias="bt">`,
          `<attribute name="dcp_lupteammemberrole" />`,
          `<link-entity name="contact" from="contactid" to="dcp_lupteammember" link-type="inner" alias="bu">`,
            `<filter type="and">`,
              `<condition attribute="contactid" operator="eq" uitype="contact" value="{${contactId}}" />`,
              // `<condition attribute="statecode" operator="eq" value="0" />`,
            `</filter>`,
          `</link-entity>`,
        `</link-entity>`,
        `<link-entity name="dcp_projectmilestone" from="dcp_project" to="dcp_projectid" link-type="inner" alias="bv">`,
          // `<filter type="and">`,
          //   `<condition attribute="statuscode" operator="eq" value="2" />`,
          // `</filter>`,
          // `<filter type="and">`,
          //   `<condition attribute="dcp_milestone" operator="in">`,
          //     `<value uiname="Community Board Referral" uitype="dcp_milestone">{923BEEC4-DAD0-E711-8116-1458D04E2FB8}</value>`,
          //     `<value uiname="Borough Board Referral" uitype="dcp_milestone">{963BEEC4-DAD0-E711-8116-1458D04E2FB8}</value>`,
          //     `<value uiname="Borough President Referral" uitype="dcp_milestone">{943BEEC4-DAD0-E711-8116-1458D04E2FB8}</value>`,
          //   `</condition>`,
          // `</filter>`,
        `</link-entity>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
};
