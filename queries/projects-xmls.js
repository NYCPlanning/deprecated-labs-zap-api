/* eslint-disable indent */
const escape = str => str.replace(/'/g, `''`);
const escapeFetchParam = str => encodeURIComponent(escape(str));
const formatLikeOperator = value => escapeFetchParam(`%${value}%`);

function actionsXML(projectIds) {
  const MISTAKE = '717170003';
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
          `<condition attribute="statuscode" operator="ne" value="${MISTAKE}" />`,
        `</filter>`,
        `<link-entity name="dcp_action" from="dcp_actionid" to="dcp_action" link-type="inner" alias="aa">`,
          `<attribute name="dcp_name" alias="action_code"/>`,
        `</link-entity>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

function milestonesXML(projectIds) {
  const OVERRIDDEN = '717170001';
  const MILESTONE_NAMES = [
    'Land Use Fee Payment',
    'Land Use Application Filed Review',
    'CEQR Fee Payment',
    'Filed EAS Review',
    'EIS Draft Scope Review',
    'EIS Public Scoping Meeting',
    'Final Scope of Work Issued',
    'NOC of Draft EIS Issued',
    'DEIS Public Hearing Held',
    'Review Session - Certified / Referred',
    'Community Board Referral',
    'Borough President Referral',
    'Borough Board Referral',
    'CPC Public Meeting - Vote',
    'CPC Public Meeting - Public Hearing',
    'City Council Review',
    'Mayoral Veto',
    'Final Letter Sent',
  ];

  return [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false" aggregate="true">`,
      `<entity name="dcp_projectmilestone">`,
      `<attribute name="dcp_project" alias="projectid" groupby="true"/>`,
      `<attribute name="dcp_actualenddate" alias="actualenddate" aggregate="max"/>`,
      `<filter type="and">`,
        `<condition attribute="dcp_project" operator="in">`,
          ...projectIds.map(projectId => `<value>{${projectId}}</value>`),
        `</condition>`,
      `</filter>`,
      `<link-entity name="dcp_milestone" from="dcp_milestoneid" to="dcp_milestone" link-type="inner" alias="al">`,
        `<filter type="and">`,
          `<condition attribute="statuscode" operator="ne" value="${OVERRIDDEN}" />`,
          `<filter type="or">`,
            ...MILESTONE_NAMES.map(msName => `<condition attribute="dcp_name" operator="eq" value="${msName}" />`),
          `</filter>`,
        `</filter>`,
      `</link-entity>`,
    `</entity>`,
  `</fetch>`,
  ].join('');
}

function applicantTeamXML(projectIds) {
  const APPLICANT = '717170000';
  const COAPPLICANT = '717170002';

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
          `<condition attribute="dcp_applicantrole" operator="eq" value="${APPLICANT}" />`,
          `<condition attribute="dcp_applicantrole" operator="eq" value="${COAPPLICANT}" />`,
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

function projectsXML(queryParams, projectIds) {
  const {
    page = 1,
    itemsPerPage = 30,
    'community-districts': community_districts = [],
    'action-types': action_types = [],
    boroughs = [],
    dcp_ulurp_nonulurp = ['ULURP', 'Non-ULURP'],
    dcp_femafloodzonev = false,
    dcp_femafloodzonecoastala = false,
    dcp_femafloodzonea = false,
    dcp_femafloodzoneshadedx = false,
    dcp_publicstatus = ['Completed', 'Filed', 'In Public Review', 'Unknown'],
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
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false" page="${page}" count="${itemsPerPage}">`,
      `<entity name="dcp_project">`,
        `<order attribute="createdon" descending="true" />`,
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
          ...projectFilters,
        `</filter>`,
        ...linkFilters,
      `</entity>`,
    `</fetch>`,
  ].join('');
}

/* Helper functions to build project filter XMLs */
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
    ...buildProjectIdsFilters(projectIds),
    ...buildFloodzoneFilters(dcp_femafloodzonea, dcp_femafloodzonev, dcp_femafloodzonecoastala, dcp_femafloodzoneshadedx),
    ...buildCertifiedReferredFilters(dcp_certifiedreferred),
    ...buildCommunityDistrictsFilters(community_districts),
    ...buildBoroughFilters(boroughs),
    ...buildProjectApplicantTextFilter(project_applicant_text),
    ...buildULURPNonULURPFilter(dcp_ulurp_nonulurp),
    ...buildPublicStatusFilter(dcp_publicstatus),
  ];
}

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

function buildProjectIdsFilters(projectIds) {
  if (projectIds.length) {
    return [
      `<condition attribute="dcp_name" operator="in">`,
        ...projectIds.map(projectId => `<value>${projectId}</value>`),
      `</condition>`,
    ];
  }

  return [];
}

function buildFloodzoneFilters(a, v, coastal_a, shaded_x) {
  const filter = [];
  if (a) filter.push(`<condition attribute="dcp_femafloodzonea" operator="eq" value="true" />`);
  if (v) filter.push(`<condition attribute="dcp_femafloodzonev" operator="eq" value="true" />`);
  if (coastal_a) filter.push(`<condition attribute="dcp_femafloodzonecoastala" operator="eq" value="true" />`);
  if (shaded_x) filter.push(`<condition attribute="dcp_femafloodzoneshadedx" operator="eq" value="true" />`);

  return filter;
}

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

function buildBoroughFilters(boroughs) {
  const BOROUGHS = {
    Bronx: 717170000,
    Brooklyn: 717170002,
    Manhattan: 717170001,
    Queens: 717170003,
    'Staten Island': 717170004,
    Citywide: 717170005,
  };

  if (boroughs.length) {
    return [
      `<filter type="or">`,
        ...boroughs.map(b => `<condition attribute="dcp_borough" operator="eq" value="${BOROUGHS[b]}" />`),
      `</filter>`,
    ];
  }

  return [];
}

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

function buildULURPNonULURPFilter(ulurpNonulurp) {
  const ULURP = {
    ULURP: 717170001,
    'Non-ULURP': 717170000,
  };

  if (ulurpNonulurp.length) {
    return [
      `<condition attribute="dcp_ulurp_nonulurp" operator="in">`,
        ...ulurpNonulurp.map(ulurp => `<value>${ULURP[ulurp]}</value>`),
      `</condition>`,
    ];
  }

  return [];
}

function buildPublicStatusFilter(publicStatus) {
  const STATUS = {
    Filed: 717170000,
    Certified: 717170001,
    Approved: 717170002,
    Withdrawn: 717170003,
  };

  const KNOWN_STATUSES = Object.keys(STATUS);

  const filter = [`<filter type="or">`];
  // build filter for UNKNOWN ( i.e. NOT any of the known statuses)
  if (publicStatus.includes('Unknown')) {
    filter.push(
     `<condition attribute="dcp_publicstatus" operator="not-in">`,
      ...KNOWN_STATUSES.map(status => `<value>${STATUS[status]}</value>`),
    `</condition>`,
    );
  }

  // build filter for known statuses
  const knownStatus = publicStatus.filter(status => KNOWN_STATUSES.includes(status));
  if (knownStatus.length) {
    filter.push(`<condition attribute="dcp_publicstatus" operator="in">`);
    if (publicStatus.includes('Filed')) {
      filter.push(`<value>${STATUS.Filed}</value>`);
    }

    if (publicStatus.includes('In Public Review')) {
      filter.push(`<value>${STATUS.Certified}</value>`);
    }

    if (publicStatus.includes('Completed')) {
      filter.push(
        `<value>${STATUS.Approved}</value>`,
        `<value>${STATUS.Withdrawn}</value>`,
      );
    }
    filter.push(`</condition>`);
  }

  filter.push(`</filter>`);
  return filter;
}

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

function projectsByIdsXML(projectIds, page, count) {
  return [
   `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false" page="${page}" count="${count}">`,
      `<entity name="dcp_project">`,
        `<order attribute="createdon" descending="true" />`,
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
          ...buildProjectIdsFilters(projectIds),
        `</filter>`,
      `</entity>`,
    `</fetch>`,
  ];
}

const projectsXMLs = {
  action: actionsXML,
  milestone: milestonesXML,
  applicant: applicantTeamXML,
};

module.exports = {
  projectsXMLs,
  projectsXML,
  projectsByIdsXML,
};
