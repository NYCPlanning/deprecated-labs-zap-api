/* eslint-disable indent */
/**
 * This file contains functions for generating FetchXML query strings used to
 * query single project data from CRM.
 */

const {
  VISIBILITY,
  STATUSCODE,
  STATECODE,
  APPLICANTROLE,
} = require('../utils/constants');

const { escapeFetchParam, formatLikeOperator } = require('./fetch-xml-helpers');

/**
 * Returns FetchXML query param for fetching a single project for the `/project/id` route
 */
function projectXML(projectName) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="true" top="1">`,
      `<entity name="dcp_project">`,
        `<attribute name="dcp_name"/>`,
        `<attribute name="dcp_projectid"/>`,
        `<attribute name="dcp_projectname"/>`,
        `<attribute name="dcp_projectbrief"/>`,
        `<attribute name="dcp_borough"/>`,
        `<attribute name="dcp_communitydistricts"/>`,
        `<attribute name="dcp_ulurp_nonulurp"/>`,
        `<attribute name="dcp_ceqrtype"/>`,
        `<attribute name="dcp_ceqrnumber"/>`,
        `<attribute name="dcp_femafloodzonea"/>`,
        `<attribute name="dcp_femafloodzonecoastala"/>`,
        `<attribute name="dcp_femafloodzonev"/>`,
        `<attribute name="dcp_publicstatus"/>`,
        `<attribute name="dcp_currentmilestone"/>`,
        `<filter type="and">`,
          `<condition attribute="dcp_name" operator="eq" value="${escapeFetchParam(projectName)}" />`,
          `<condition attribute="dcp_visibility" operator="eq" value="${VISIBILITY.GENERAL_PUBLIC}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/**
 * Returns FetchXML query param for fetching bbls for a single project
 */
function bblsXML(projectId) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_projectbbl">`,
        `<attribute name="dcp_bblnumber" />`,
        `<filter type="and">`,
          `<condition attribute="dcp_project" operator="eq" value="${projectId}" />`,
          `<condition attribute="dcp_bblnumber" operator="not-null" />`,
          `<condition attribute="statuscode" operator="eq" value="1"/>`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/**
 * Returns FetchXML query param for fetching actions for a single project
 */
function actionsXML(projectId) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_projectaction">`,
        `<attribute name="dcp_name" />`,
        `<attribute name="dcp_ulurpnumber" />`,
        `<attribute name="statuscode" />`,
        `<filter type="and">`,
          `<condition attribute="dcp_project" operator="eq" value="${projectId}" />`,
          `<condition attribute="statuscode" operator="ne" value="${STATUSCODE.MISTAKE}" />`,
        `</filter>`,
        `<link-entity name="dcp_zoningresolution" from="dcp_zoningresolutionid" to="dcp_zoningresolution" alias="a" link-type="outer" >`,
          `<attribute name="dcp_zoningresolution"/>`,
        `</link-entity>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/**
 * Returns FetchXML query param for fetching milestones for a single project
 */
function milestonesXML(projectId) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_projectmilestone">`,
        `<attribute name="dcp_name"/>`,
        `<attribute name="dcp_milestone" />`,
        `<attribute name="dcp_plannedstartdate" />`,
        `<attribute name="dcp_plannedcompletiondate" />`,
        `<attribute name="dcp_actualstartdate" />`,
        `<attribute name="dcp_actualenddate" />`,
        `<attribute name="statuscode" />`,
        `<attribute name="dcp_goalduration" />`,
        `<attribute name="dcp_milestonesequence" />`,
        `<link-entity name="dcp_milestone" from="dcp_milestoneid" to="dcp_milestone" link-type="outer" alias="ac" >`,
          `<attribute name="dcp_sequence" />`,
        `</link-entity>`,
        `<link-entity name="dcp_milestoneoutcome" from="dcp_milestoneoutcomeid" to="dcp_milestoneoutcome" link-type="outer" alias="ad" >`,
          `<attribute name="dcp_outcome" />`,
        `</link-entity>`,
        `<filter type="and">`,
          `<condition attribute="dcp_project" operator="eq" value="${projectId}" />`,
          `<condition attribute="statuscode" operator="ne" value="${STATUSCODE.OVERRIDDEN}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/**
 * Returns FetchXML query param for fetching keywords for a single project
 */
function keywordsXML(projectId) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_projectkeywords">`,
        `<attribute name="dcp_keyword" />`,
        `<link-entity name="dcp_keyword" from="dcp_keywordid" to="dcp_keyword" link-type="outer" alias="ab" />`,
        `<filter type="and">`,
          `<condition attribute="dcp_project" operator="eq" value="${projectId}" />`,
          `<condition attribute="statecode" operator="eq" value="${STATECODE.ACTIVE}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/**
 * Returns FetchXML query param for fetching applicants for a single project
 */
function applicantXML(projectId) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_projectapplicant">`,
        `<attribute name="dcp_applicantrole"/>`,
        `<attribute name="dcp_applicant_customer"/>`,
        `<link-entity name="account" from="accountid" to="dcp_applicant_customer" link-type="inner" alias="ab"/>`,
        `<filter type="and">`,
          `<condition attribute="dcp_project" operator="eq" value="${projectId}" />`,
          `<condition attribute="statecode" operator="eq" value="0"/>`,
        `</filter>`,
        `<filter type="or">`,
          `<condition attribute="dcp_applicantrole" operator="eq" value="${APPLICANTROLE.APPLICANT}" />`,
          `<condition attribute="dcp_applicantrole" operator="eq" value="${APPLICANTROLE.COAPPLICANT}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/**
 * Returns FetchXML query param for fetching addresses for a single project
 */
function addressXML(projectId) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_projectaddress">`,
        `<attribute name="dcp_validatedaddressnumber" />`,
        `<attribute name="dcp_validatedstreet" />`,
        `<attribute name="statuscode" />`,
        `<filter type="and">`,
          `<condition attribute="dcp_project" operator="eq" value="${projectId}" />`,
          `<condition attribute="dcp_validatedaddressnumber" operator="not-null" />`,
          `<condition attribute="dcp_validatedstreet" operator="not-null" />`,
          `<condition attribute="statuscode" operator="eq" value="1"/>`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/**
 * Returns FetchXML for fetching a single project id (called dcp_name in CRM) by ulurp number
 */
function projectForULURPXML(ulurpNumber) {
  return [
     `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="true" top="1">`,
      `<entity name="dcp_project">`,
        `<attribute name="dcp_name"/>`,
        `<link-entity name="dcp_projectaction" from="dcp_project" to="dcp_projectid" link-type="inner" alias="ae">`,
          `<filter type ="and">`,
            `<condition attribute="dcp_ulurpnumber" operator="like" value="${formatLikeOperator(ulurpNumber)}" />`,
          `</filter>`,
        `</link-entity>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

const projectXMLs = {
  bbl: bblsXML,
  action: actionsXML,
  milestone: milestonesXML,
  keyword: keywordsXML,
  applicant: applicantXML,
  address: addressXML,
};

module.exports = {
  projectXMLs,
  projectXML,
  projectForULURPXML,
};
