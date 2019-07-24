/* eslint-disable indent */
/**
 * This file contains functions for generating FetchXML query strings used to
 * query multiple projects data from CRM.
 */

const {
  VISIBILITY,
  ULURP,
  STATUSCODE,
  PUBLICSTATUS,
  BOROUGH,
  APPLICANTROLE,
  MILESTONE_NAMES,
} = require('../utils/lookups');

const { escapeFetchParam, formatLikeOperator } = require('../utils/fetch-xml-helpers');

/**
 * Returns FetchXML query param for fetching ALL projects that match a given set of project
 * filters for the `/projects` route. This query should ideally only be run once for a given
 * set of filters, and then the filterId should be used to page through the results.
 *
 * TODO: Implement optional "get-all" functionality (page=0 ?) where this query is run with
 * all attributes included (see projectsXML), and the full result is processed and returned to
 * the user. Current state: pagination is enforced.
 */
function allProjectsXML(queryParams, projectIds) {
  const {
    'community-districts': community_districts = [],
    'action-types': action_types = [],
    boroughs = [],
    dcp_ulurp_nonulurp = [],
    dcp_femafloodzonev = false,
    dcp_femafloodzonecoastala = false,
    dcp_femafloodzonea = false,
    dcp_femafloodzoneshadedx = false,
    dcp_publicstatus = [],
    dcp_certifiedreferred = [],
    project_applicant_text = '',
    block = '',
    applicant_name = '',
    ulurp_number = '',
  } = queryParams;

  const projectFilters = buildProjectFilters(
    projectIds,
    dcp_femafloodzonea,
    dcp_femafloodzonecoastala,
    dcp_femafloodzoneshadedx,
    dcp_femafloodzonev,
    dcp_certifiedreferred,
    community_districts,
    boroughs,
    project_applicant_text,
    dcp_ulurp_nonulurp,
    dcp_publicstatus,
  );

  const linkFilters = buildLinkFilters(
    block,
    action_types,
    ulurp_number,
    applicant_name,
  );

  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_project">`,
        `<order attribute="dcp_lastmilestonedate" descending="true" />`,
        `<attribute name="dcp_name"/>`,
        `<attribute name="dcp_projectid"/>`,
        `<filter type="and">`,
          ...projectFilters,
          `<condition attribute="dcp_visibility" operator="eq" value="${VISIBILITY.GENERAL_PUBLIC}"/>`,
        `</filter>`,
        ...linkFilters,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/**
 * Returns FetchXML query param for fetching a page of projects results for `/projects` route
 */
function projectsXML(projectIds, page, itemsPerPage) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false" page="${page}" count="${itemsPerPage}">`,
      `<entity name="dcp_project">`,
        `<order attribute="dcp_lastmilestonedate" descending="true" />`,
        `<attribute name="dcp_name"/>`,
        `<attribute name="dcp_projectid"/>`,
        `<attribute name="dcp_ceqrnumber"/>`,
        `<attribute name="dcp_ceqrtype"/>`,
        `<attribute name="dcp_projectname"/>`,
        `<attribute name="dcp_projectbrief"/>`,
        `<attribute name="dcp_borough"/>`,
        `<attribute name="dcp_ulurp_nonulurp"/>`,
        `<attribute name="dcp_communitydistricts"/>`,
        `<attribute name="dcp_publicstatus"/>`,
        `<attribute name="dcp_certifiedreferred"/>`,
        `<attribute name="createdon"/>`,
        `<attribute name="dcp_femafloodzonea"/>`,
        `<attribute name="dcp_femafloodzonecoastala"/>`,
        `<attribute name="dcp_femafloodzoneshadedx"/>`,
        `<attribute name="dcp_femafloodzonev"/>`,
        `<filter type="and">`,
          ...buildProjectIdsFilter(projectIds),
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/**
 * Returns FetchXML query param for fetching actions for a set of projects
 */
function actionsXML(projectIds) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_projectaction">`,
        `<attribute name="dcp_project" alias="projectid" />`,
        `<attribute name="dcp_action"/>`,
        `<attribute name="dcp_ulurpnumber"/>`,
        `<filter type="and">`,
          `<condition attribute="dcp_project" operator="in">`,
          ...projectIds.map(projectId => `<value>{${projectId}}</value>`),
          `</condition>`,
          `<condition attribute="statuscode" operator="ne" value="${STATUSCODE.MISTAKE}" />`,
        `</filter>`,
        `<link-entity name="dcp_action" from="dcp_actionid" to="dcp_action" link-type="inner" alias="aa">`,
          `<attribute name="dcp_name" alias="action_code"/>`,
        `</link-entity>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/**
 * Returns FetchXML query param for fetching applicants for a set of projects
 */
function applicantsXML(projectIds) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_projectapplicant">`,
        `<attribute name="dcp_project" alias="projectid" />`,
        `<attribute name="dcp_applicant_customer" />`,
        `<filter type="and">`,
          `<condition attribute="dcp_project" operator="in">`,
            ...projectIds.map(projectId => `<value>{${projectId}}</value>`),
          `</condition>`,
        `</filter>`,
        `<filter type="or">`,
          `<condition attribute="dcp_applicantrole" operator="eq" value="${APPLICANTROLE.APPLICANT}" />`,
          `<condition attribute="dcp_applicantrole" operator="eq" value="${APPLICANTROLE.COAPPLICANT}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

// Used by `/projects` route
const projectsXMLs = {
  action: actionsXML,
  applicant: applicantsXML,
};

/**
 * Returns FetchXML query param for fetching projects within a lookback window; used
 * to select projects for updating geometires by the `/update-geometries` route
 */
function projectsUpdateGeoms(modifiedOn, page, count) {
  return [
   `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false" page="${page}" count="${count}" returntotalrecordcount="true">`,
      `<entity name="dcp_project">`,
        `<attribute name="dcp_name" />`,
        `<attribute name="dcp_projectname" />`,
        `<attribute name="dcp_publicstatus" />`,
        `<attribute name="dcp_lastmilestonedate" />`,
        `<filter type="and">`,
          `<condition attribute="dcp_visibility" operator="eq" value="${VISIBILITY.GENERAL_PUBLIC}" />`,
          `<condition attribute="modifiedon" operator="gt" value="${escapeFetchParam(modifiedOn.toISOString())}" />`,
        `</filter>`,
        `<link-entity name="dcp_projectbbl" from="dcp_project" to="dcp_projectid" link-type="inner" alias="bbl">`,
          `<filter type="and">`,
            `<condition attribute="modifiedon" operator="gt" value="${escapeFetchParam(modifiedOn.toISOString())}" />`,
            `<condition attribute="statuscode" operator="eq" value="1" />`,
            `<condition attribute="dcp_bblnumber" operator="not-null" />`,
          `</filter>`,
        `</link-entity>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/**
 * Returns FetchXML query param for fetching bbls for a set of projects
 */
function bblsXML(projectIds) {
  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
      `<entity name="dcp_projectbbl">`,
        `<attribute name="dcp_project" alias="projectid" />`,
        `<attribute name="dcp_bblnumber" />`,
        `<filter type="and">`,
          ...buildProjectUUIDsFilters(projectIds),
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

// used in the `/update-geometries` route
const projectsBblsXML = bblsXML;

/**
 * Helper function to build project filter XML arrays
 */
function buildProjectFilters(
  projectIds,
  dcp_femafloodzonea,
  dcp_femafloodzonecoastala,
  dcp_femafloodzoneshadedx,
  dcp_femafloodzonev,
  dcp_certifiedreferred,
  community_districts,
  boroughs,
  project_applicant_text,
  dcp_ulurp_nonulurp,
  dcp_publicstatus,
) {
  return [
    ...buildProjectIdsFilter(projectIds),
    ...buildFloodzoneFilters(dcp_femafloodzonea, dcp_femafloodzonev, dcp_femafloodzonecoastala, dcp_femafloodzoneshadedx),
    ...buildCertifiedReferredFilters(dcp_certifiedreferred),
    ...buildCommunityDistrictsFilters(community_districts),
    ...buildBoroughFilters(boroughs),
    ...buildProjectApplicantTextFilter(project_applicant_text),
    ...buildULURPNonULURPFilter(dcp_ulurp_nonulurp),
    ...buildPublicStatusFilter(dcp_publicstatus),
  ];
}

/**
 * Helper function to build link filter XML arrays
 */
function buildLinkFilters(
  block,
  action_types,
  ulurp_number,
  applicant_name,
) {
  return [
    ...buildBlockFilters(block),
    ...buildActionFilters(action_types, ulurp_number),
    ...buildApplicantNameFilters(applicant_name),
  ];
}

/**
 * Helper function to build filter for projectIds against project.dcp_name
 */
function buildProjectIdsFilter(projectIds) {
  if (projectIds.length) {
    return [
      `<condition attribute="dcp_name" operator="in">`,
        ...projectIds.map(projectId => `<value>${projectId}</value>`),
      `</condition>`,
    ];
  }

  return [];
}

/**
 * Helper function to build filter for projectUUIDs against dcp_project field on a project entity
 */
function buildProjectUUIDsFilters(projectUUIDs) {
  if (projectUUIDs.length) {
    return [
      `<condition attribute="dcp_project" operator="in">`,
        ...projectUUIDs.map(uuid => `<value>${uuid}</value>`),
      `</condition>`,
    ];
  }

  return [];
}


/**
 * Helper function to build filter for floodzone fields on dcp_project
 */
function buildFloodzoneFilters(a, v, coastal_a, shaded_x) {
  const filter = [];
  if (a) filter.push(`<condition attribute="dcp_femafloodzonea" operator="eq" value="true" />`);
  if (v) filter.push(`<condition attribute="dcp_femafloodzonev" operator="eq" value="true" />`);
  if (coastal_a) filter.push(`<condition attribute="dcp_femafloodzonecoastala" operator="eq" value="true" />`);
  if (shaded_x) filter.push(`<condition attribute="dcp_femafloodzoneshadedx" operator="eq" value="true" />`);

  return filter;
}

/**
 * Helper function to build filter for certified-referred date range on dcp_project
 */
function buildCertifiedReferredFilters(certifiedReferred) {
  if (certifiedReferred.length) {
    const start = new Date(certifiedReferred[0] * 1000);
    const end = new Date(certifiedReferred[1] * 1000);
    return [
      `<condition attribute="dcp_certifiedreferred" operator="ge" value="${escapeFetchParam(start.toISOString())}" />`,
      `<condition attribute="dcp_certifiedreferred" operator="le" value="${escapeFetchParam(end.toISOString())}" />`,
    ];
  }

  return [];
}

/**
 * Helper function to build filter for community districts on dcp_project
 */
function buildCommunityDistrictsFilters(communityDistricts) {
  if (communityDistricts.length) {
    return [
      `<filter type="or">`,
        ...communityDistricts.map(cd => `<condition attribute="dcp_communitydistricts" operator="like" value="${formatLikeOperator(cd)}" />`),
      `</filter>`,
    ];
  }

  return [];
}

/**
 * Helper function to build filter for boroughs on dcp_project
 */
function buildBoroughFilters(boroughs) {
  if (boroughs.length) {
    return [
      `<filter type="or">`,
        ...boroughs.map(b => `<condition attribute="dcp_borough" operator="eq" value="${BOROUGH[b]}" />`),
      `</filter>`,
    ];
  }

  return [];
}

/**
 * Helper function to build project applicant text filter on dcp_project, doing 'like'
 * text matching on  dcp_projectbrief, dcp_projectname, and dcp_ceqrnumber
 */
function buildProjectApplicantTextFilter(applicantText) {
  if (applicantText) {
    return [
      `<filter type="or">`,
        `<condition attribute="dcp_projectbrief" operator="like" value="${formatLikeOperator(applicantText)}"/>`,
        `<condition attribute="dcp_projectname" operator="like" value="${formatLikeOperator(applicantText)}"/>`,
        `<condition attribute="dcp_ceqrnumber" operator="like" value="${formatLikeOperator(applicantText)}"/>`,
      `</filter>,`,
    ];
  }

  return [];
}

/**
 * Helper function to build ulurp-nonulurp filter on dcp_project
 */
function buildULURPNonULURPFilter(ulurpNonulurp) {
  if (ulurpNonulurp.length) {
    return [
      `<condition attribute="dcp_ulurp_nonulurp" operator="in">`,
        ...ulurpNonulurp.map(ulurp => `<value>${ULURP[ulurp]}</value>`),
      `</condition>`,
    ];
  }

  return [];
}

/**
 * Helper function to build public status filter on dcp_project,
 * translating the derived `publicstatus_simp` field back into dcp_publicstatus
 */
function buildPublicStatusFilter(publicStatus) {
  const knownStatuses = Object.keys(PUBLICSTATUS);
  // build filter for UNKNOWN ( i.e. NOT any of the known statuses)
  const unknownFilter = [];
  if (publicStatus.includes('Unknown')) {
    unknownFilter.push(
     `<condition attribute="dcp_publicstatus" operator="not-in">`,
      ...knownStatuses.map(status => `<value>${PUBLICSTATUS[status]}</value>`),
    `</condition>`,
    );
  }

  // build filter for known statuses
  const knownStatus = publicStatus.filter(status => knownStatus.includes(status));
  const knownFilter = [];
  if (knownStatus.length) {
    knownFilter.push(`<condition attribute="dcp_publicstatus" operator="in">`);
    if (publicStatus.includes('Filed')) {
      knownFilter.push(`<value>${PUBLICSTATUS.Filed}</value>`);
    }

    if (publicStatus.includes('In Public Review')) {
      knownFilter.push(`<value>${PUBLICSTATUS.Certified}</value>`);
    }

    if (publicStatus.includes('Completed')) {
      knownFilter.push(
        `<value>${PUBLICSTATUS.Approved}</value>`,
        `<value>${PUBLICSTATUS.Withdrawn}</value>`,
      );
    }
    knownFilter.push(`</condition>`);
  }

  if (knownFilter.length && unknownFilter.length) {
    return [`<filter type="or">`, ...knownFilter, ...unknownFilter, `</filter>`];
  }

  return [...knownFilter, ...unknownFilter];
}

/**
 * Helper function to build bbl filter on dcp_projectbbl (link filter)
 */
function buildBlockFilters(block) {
  if (block) {
    return [
      `<link-entity name="dcp_projectbbl" from="dcp_project" to="dcp_projectid" link-type="inner" alias="ad">`,
        `<filter type="and">`,
          `<condition attribute="dcp_validatedblock" operator="like" value="${formatLikeOperator(block)}"/>`,
        `</filter>`,
      `</link-entity>`,
    ];
  }

  return [];
}

/**
 * Helper function to build action types and ulurp number filters on dcp_projectaction (link filter)
 */
function buildActionFilters(actionTypes, ulurpNumber) {
  if (actionTypes.length || ulurpNumber) {
    const filter = [`<link-entity name="dcp_projectaction" from="dcp_project" to="dcp_projectid" link-type="inner" alias="ae">`];

    if (ulurpNumber) {
      filter.push(
        `<filter type="and">`,
          `<condition attribute="dcp_ulurpnumber" operator="like" value="${formatLikeOperator(ulurpNumber)}"/>`,
        `</filter>`,
      );
    }

    if (actionTypes.length) {
      filter.push(
        `<link-entity name="dcp_action" from="dcp_actionid" to="dcp_action" link-type="inner" alias="at">`,
          `<filter type="or">`,
            ...actionTypes.map(action => `<condition attribute="dcp_name" operator="eq" value="${escapeFetchParam(action)}"/>`),
          `</filter>`,
        `</link-entity>`,
      );
    }

    filter.push(`</link-entity>`);
    return filter;
  }

  return [];
}

/**
 * Helper function to build applicant name filter on dcp_projectapplicant (link filter)
 */
function buildApplicantNameFilters(applicantName) {
  if (applicantName) {
    return [
      `<link-entity name="dcp_projectapplicant" from="dcp_project" to="dcp_projectid" link-type="inner" alias="an">`,
        `<link-entity name="account" from="accountid" to="dcp_applicant_customer" link-type="inner" alias="af">`,
          `<filter type="and">`,
            `<condition attribute="name" operator="like" value="${formatLikeOperator(applicantName)}"/>`,
          `</filter>`,
        `</link-entity>`,
      `</link-entity>`,
    ];
  }

  return [];
}

module.exports = {
  projectsXMLs,
  projectsXML,
  allProjectsXML,
  projectsUpdateGeoms,
  projectsBblsXML,
};
