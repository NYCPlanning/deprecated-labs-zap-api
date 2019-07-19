/* eslint-disable indent */
const escape = str => str.replace(/'/g, `''`);
const escapeFetchParam = str => encodeURIComponent(escape(str));
const formatLikeOperator = value => escapeFetchParam(`%${value}%`);

function projectXML(projectName) {
  const GENERAL_PUBLIC = '717170003';

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
        `<attribute name="dcp_leaddivision"/>`,
        `<attribute name="dcp_ceqrtype"/>`,
        `<attribute name="dcp_ceqrnumber"/>`,
        `<attribute name="dcp_easeis"/>`,
        `<attribute name="dcp_leadagencyforenvreview"/>`,
        `<attribute name="dcp_alterationmapnumber"/>`,
        `<attribute name="dcp_sisubdivision"/>`,
        `<attribute name="dcp_sischoolseat"/>`,
        `<attribute name="dcp_previousactiononsite"/>`,
        `<attribute name="dcp_wrpnumber"/>`,
        `<attribute name="dcp_nydospermitnumber"/>`,
        `<attribute name="dcp_bsanumber"/>`,
        `<attribute name="dcp_lpcnumber"/>`,
        `<attribute name="dcp_decpermitnumber"/>`,
        `<attribute name="dcp_femafloodzonea"/>`,
        `<attribute name="dcp_femafloodzonecoastala"/>`,
        `<attribute name="dcp_femafloodzonev"/>`,
        `<attribute name="dcp_publicstatus"/>`,
        `<attribute name="dcp_currentmilestone"/>`,
        `<filter type="and">`,
          `<condition attribute="dcp_name" operator="eq" value="${escapeFetchParam(projectName)}" />`,
          `<condition attribute="dcp_visibility" operator="eq" value="${GENERAL_PUBLIC}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

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

function actionsXML(projectId) {
  const MISTAKE = '717170003';
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_projectaction">`,
        `<attribute name="dcp_name" />`,
        `<attribute name="dcp_ulurpnumber" />`,
        `<attribute name="dcp_prefix" />`,
        `<attribute name="statuscode" />`,
        `<attribute name="dcp_ccresolutionnumber" />`,
        `<attribute name="dcp_zoningresolution" />`,
        `<filter type="and">`,
          `<condition attribute="dcp_project" operator="eq" value="${projectId}" />`,
          `<condition attribute="statuscode" operator="ne" value="${MISTAKE}" />`,
        `</filter>`,
        `<link-entity name="dcp_zoningresolution" from="dcp_zoningresolutionid" to="dcp_zoningresolution" alias="a" link-type="outer" >`,
          `<attribute name="dcp_zoningresolution"/>`,
        `</link-entity>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

function milestonesXML(projectId) {
  const OVERRIDDEN = '717170001';

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
          `<condition attribute="statuscode" operator="ne" value="${OVERRIDDEN}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

function keywordsXML(projectId) {
  const ACTIVE = '0';

  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_projectkeywords">`,
        `<attribute name="dcp_keyword" />`,
        `<link-entity name="dcp_keyword" from="dcp_keywordid" to="dcp_keyword" link-type="outer" alias="ab" />`,
        `<filter type="and">`,
          `<condition attribute="dcp_project" operator="eq" value="${projectId}" />`,
          `<condition attribute="statecode" operator="eq" value="${ACTIVE}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

function applicantTeamXML(projectId) {
  const APPLICANT = '717170000';
  const COAPPLICANT = '717170002';

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
          `<condition attribute="dcp_applicantrole" operator="eq" value="${APPLICANT}" />`,
          `<condition attribute="dcp_applicantrole" operator="eq" value="${COAPPLICANT}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

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
  applicant: applicantTeamXML,
  address: addressXML,
};

module.exports = {
  projectXMLs,
  projectXML,
  projectForULURPXML,
};
