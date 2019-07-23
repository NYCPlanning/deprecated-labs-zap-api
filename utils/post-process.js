const dedupeList = require('./dedupe-list');
const getVideoLinks = require('./get-video-links');
const injectSupportingDocumentURLs = require('./inject-supporting-document-urls');
const projectTemplate = require('../response-templates/project');
const projectsTemplate = require('../response-templates/projects');
const {
  keyForValue,
  PUBLICSTATUS,
  CEQRTYPE,
  BOROUGH,
  ULURP,
} = require('./lookups');

/**
 * Post-process a single project, adding entities and geo data,
 * formatting some fields, pulling in video and document resources,
 * and then formatting the entire object using project template.
 *
 * @param {Object} project The raw project object from CRM
 * @param {Object[]} entities The raw project child entities from CRM
 * @param {Object} geo The geo data from PostgreSQL
 * @returns {Object} The processed and formatted project object
 */
async function postProcessProject(rawProject, entities, geo) {
  const project = parsePrefixedProperties(rawProject);
  project.jdcp_easeis = project.dcp_easeis_formatted;
  project.dcp_borough = project.dcp_borough_formatted;
  project.dcp_ceqrtype = project.dcp_ceqrtype_formatted;
  project.dcp_leaddivision = project.dcp_leaddivision_formatted;
  project.dcp_ulurp_nonulurp = project.dcp_ulurp_nonulurp_formatted;
  project.dcp_leadagencyforenvreview = project._dcp_leadagencyforenvreview_value; // eslint-disable-line
  project.dcp_publicstatus_simp = getPublicStatusSimp(project.dcp_publicstatus_formatted);
  // add list entities
  project.bbls = postProcessProjectBbls(entities.bbls);
  project.keywords = postProcessProjectKeywords(entities.keywords);

  // add object entities
  project.actions = postProcessProjectActions(entities.actions);
  project.milestones = postProcessProjectMilestones(entities.milestones, project);
  project.applicantteam = postProcessProjectApplicants(entities.applicants);
  project.addresses = entities.addresses;

  // add geo
  project.bbl_multipolygon = geo.bblMultipolygon;
  project.bbl_featurecollection = geo.bblFeatureCollection;

  await injectSupportingDocumentURLs(project);
  project.video_links = await getVideoLinks(project.dcp_name);

  return projectFromTemplate(project, projectTemplate);
}

/**
 * Post-processes a list of projects for projects list, adding entities and centers,
 * formatting some fields, and then formatting the entire object using project template.
 *
 * @param {Object[]} projects The raw project objects from CRM
 * @param {Object[]} entities The raw project child entities from CRM
 * @param {Point[]} projectCenters The project centers from PostgreSQL
 * @returns {Object} The processed and formatted project objects
 */
function postProcessProjects(projects, entities, projectsCenters = []) {
  return projects.map((project) => {
    // do lookups
    project.dcp_ceqrtype = keyForValue(CEQRTYPE, project.dcp_ceqrtype);
    project.dcp_borough = keyForValue(BOROUGH, project.dcp_borough);
    project.dcp_ulurp_nonulurp = keyForValue(ULURP, project.dcp_ulurp_nonulurp);
    project.dcp_publicstatus_simp = getPublicStatusSimp(keyForValue(PUBLICSTATUS, project.dcp_publicstatus));

    // add  centers
    const id = project.dcp_name;
    const projectCenter = postProcessProjectsCenters(projectsCenters, id);
    project.center = projectCenter;
    project.has_centroid = !!projectCenter.length;

    // add entities
    const uuid = project.dcp_projectid;
    const {
      projectActionTypes,
      projectUlurpNumbers,
    } = postProcessProjectsActions(entities.actions, uuid);
    const projectApplicants = postProcessProjectsApplicants(entities.applicants, uuid);
    project.actiontypes = projectActionTypes;
    project.ulurpnumbers = projectUlurpNumbers;
    project.lastmilestonedate = project.dcp_lastmilestonedate;
    project.applicants = projectApplicants;

    return projectFromTemplate(project, projectsTemplate);
  });
}


/**
 * Post-processes projects for updating geoms to get projects data to use as  geom metadata
 * in the PostgreSQL `project_geoms` table, and add processed bbls.
 *
 * @param {Object[]} projects The raw project objects from CRM
 * @param {Object[]} bbls The raw bbls entities from CRM
 */
function postProcessProjectsUpdateGeoms(projects, bbls) {
  projects.forEach((project) => {
    const uuid = project.dcp_projectid;
    project.dcp_publicstatus_simp = getPublicStatusSimp(keyForValue(PUBLICSTATUS, project.dcp_publicstatus));
    project.bbls = postProcessProjectsBbls(bbls, uuid);
  });
}

/**
 * Normalizes prefixed property names, and returns an object containing all properties
 * with correct (either original or normalized) name.
 */
function parsePrefixedProperties(project) {
  const normalizedProject = {};
  Object.keys(project).forEach((propertyName) => {
    const normalizedPropertyName = getNormalizedPropertyName(propertyName);
    normalizedProject[normalizedPropertyName] = project[propertyName];
  });
  return normalizedProject;
}

/**
 * Returns the normalized property name if the name is prefixed with
 * FORMATTED_VALUE prefix, LOGICAL_NAME prefix, or NAVIGATION_PROPERTY prefix;
 * otherwise returns the original property name.
 */
function getNormalizedPropertyName(propertyName) {
  const FORMATTED_VALUE = '@OData.Community.Display.V1.FormattedValue';
  const LOGICAL_NAME = '@Microsoft.Dynamics.CRM.lookuplogicalname';
  const NAVIGATION_PROPERTY = '@Microsoft.Dynamics.CRM.associatednavigationproperty';

  let index;
  let suffix;
  if (propertyName.includes(FORMATTED_VALUE)) {
    index = propertyName.indexOf(FORMATTED_VALUE);
    suffix = '_formatted';
  }

  if (propertyName.includes(LOGICAL_NAME)) {
    index = propertyName.indexOf(LOGICAL_NAME);
    suffix = '_logical';
  }

  if (propertyName.includes(NAVIGATION_PROPERTY)) {
    index = propertyName.indexOf(NAVIGATION_PROPERTY);
    suffix = '_navigationproperty';
  }

  return (index && suffix) ? propertyName.substring(0, index) + suffix : propertyName;
}


/**
 * Helper function to set derived field `dcp_publicstatus_simp` from `dcp_publicstatus_formatted`
 *
 * @param {String} publicStatus The formatted dcp_publicstatus string
 * @param {String} The formatted dcp_publicstatus_simp string
 */
function getPublicStatusSimp(publicStatus) {
  switch (publicStatus) {
    case 'Filed':
      return 'Filed';
    case 'Certified':
      return 'In Public Review';
    case 'Approved':
    case 'Withdrawn':
      return 'Completed';
    default:
      return 'Unknown';
  }
}

/**
 * Helper function to process bbls entity for single project.
 *
 * @param {Object[]} bbls The raw bbls from CRM
 * @returns {String[]} Processed bbls, an array of Bbl numbers
 */
function postProcessProjectBbls(bbls) {
  return bbls.map((rawBbl) => {
    const bbl = parsePrefixedProperties(rawBbl);
    return bbl.dcp_bblnumber;
  });
}

/**
 * Helper function to process actions entity for single project.
 * Raw action `dcp_name`s are parsed into actioncode and dcp_name (which is a human-readable
 * string description of the action), then filtered to only those included in ACTION_CODES
 * (see below).
 *
 * @param {Object[]} actions The raw actions from CRM
 * @returns {Object[]} Processed and filtered actions
 */
function postProcessProjectActions(actions) {
  return actions
    .map((rawAction) => {
      const action = parsePrefixedProperties(rawAction);
      action.statuscode = action.statuscode_formatted;
      action.dcp_zoningresolution = action._dcp_zoningresolution_value_formatted; // eslint-disable-line

      const actioncodeMatch = action.dcp_name.match('^(\\w+)\\s*-{1}\\s*(.*)\\s');
      if (actioncodeMatch) {
        const [, actioncode, dcpName] = actioncodeMatch;
        action.actioncode = actioncode;
        action.dcp_name = dcpName;
      }
      return action;
    })
    .filter(action => ACTION_CODES.includes(action.actioncode));
}

/**
 * Helper function to process actions entity for single project.
 * Raw milestones have a few fields renamed. If the milestone.zap_id is in the MILESTONES
 * lookup, then additional fields are set from the MILESTONES lookup, and display_date and
 * display_date_2 are set from other raw date fields. Milestones are then filtered to only
 * those in ALLOWED_MILESTONES (see below)
 *
 * @param {Object[]} milestones The raw milestone entities from CRM
 * @param {Object} project The project these milestones belong to, which contains fields added to the milestone //TODO necessary?
 * @returns {Object[]} Processed and filtered milestones
 */
function postProcessProjectMilestones(milestones, project) {
  const ulurpNonUlurp = project.dcp_ulurp_nonulurp_formatted;
  const publicStatus = project.dcp_publicstatus_formatted;
  return milestones.map((rawMilestone) => {
    const milestone = parsePrefixedProperties(rawMilestone);
    milestone.milestonename = milestone._dcp_milestone_value_formatted; // eslint-disable-line
    milestone.statuscode = milestone.statuscode_formatted;
    milestone.zap_id = milestone._dcp_milestone_value; // eslint-disable-line

    if (milestone.zap_id in MILESTONES) {
      const id = milestone.zap_id;
      milestone.display_sequence = MILESTONES[id].display_sequence || milestone['ac.dcp_sequence'];
      milestone.display_name = MILESTONES[id].display_name || '';
      const displayDescription = MILESTONES[id].display_description || {};
      milestone.display_description = displayDescription[ulurpNonUlurp] ? displayDescription[ulurpNonUlurp] : displayDescription[id];

      const USE_ACTUAL = ['763beec4-dad0-e711-8116-1458d04e2fb8', '783beec4-dad0-e711-8116-1458d04e2fb8', '663beec4-dad0-e711-8116-1458d04e2fb8', '6a3beec4-dad0-e711-8116-1458d04e2fb8', '780593bb-ecc2-e811-8156-1458d04d0698'];
      const USE_START = '783beec4-dad0-e711-8116-1458d04e2fb8';
      const USE_END = ['a43beec4-dad0-e711-8116-1458d04e2fb8', '863beec4-dad0-e711-8116-1458d04e2fb8', '7e3beec4-dad0-e711-8116-1458d04e2fb8', 'aa3beec4-dad0-e711-8116-1458d04e2fb8', '823beec4-dad0-e711-8116-1458d04e2fb8', '843beec4-dad0-e711-8116-1458d04e2fb8', '8e3beec4-dad0-e711-8116-1458d04e2fb8'];

      if (USE_ACTUAL.includes(id)) {
        milestone.display_date = id === USE_START ? milestone.dcp_actualstartdate : milestone.dcp_actualenddate;
      } else if (publicStatus === 'Filed') {
        milestone.display_date = USE_END.includes(id) ? milestone.dcp_actualenddate : milestone.dcp_actualstartdate;
      }

      const USE_NULL = ['763beec4-dad0-e711-8116-1458d04e2fb8', 'a43beec4-dad0-e711-8116-1458d04e2fb8', '863beec4-dad0-e711-8116-1458d04e2fb8', '7c3beec4-dad0-e711-8116-1458d04e2fb8', '7e3beec4-dad0-e711-8116-1458d04e2fb8', '883beec4-dad0-e711-8116-1458d04e2fb8', '783beec4-dad0-e711-8116-1458d04e2fb8', 'aa3beec4-dad0-e711-8116-1458d04e2fb8', '823beec4-dad0-e711-8116-1458d04e2fb8', '663beec4-dad0-e711-8116-1458d04e2fb8', '6a3beec4-dad0-e711-8116-1458d04e2fb8', '843beec4-dad0-e711-8116-1458d04e2fb8', '8e3beec4-dad0-e711-8116-1458d04e2fb8', '780593bb-ecc2-e811-8156-1458d04d0698'];
      if (USE_NULL.includes(id)) {
        milestone.display_date_2 = null;
      } else if (publicStatus === 'Filed') {
        milestone.display_date_2 = milestone.dcp_actualenddate ? milestone.dcp_actualenddate : (milestone.dcp_plannedcompletiondate || null);
      }
    }

    return milestone;
  }).filter(milestone => ALLOWED_MILESTONES.includes(milestone.milestonename));
}

/**
 * Helper function to process keywords entity for single project.
 *
 * @param {Object[]} keywords The raw keyword entities from CRM
 * @returns {String[]} Processed keywords, an array of keyword strings
 */
function postProcessProjectKeywords(keywords) {
  return keywords.map((rawKeyword) => {
    const keyword = parsePrefixedProperties(rawKeyword);
    return keyword._dcp_keyword_value_formatted; // eslint-disable-line
  });
}

/**
 * Helper function to process applicants entity for single project.
 *
 * @param {Object[]} applicants The raw applicant entities from CRM
 * @response {Object[]} Processed applicants
 */
function postProcessProjectApplicants(applicants) {
  return applicants.map((rawTeam) => {
    const team = parsePrefixedProperties(rawTeam);
    team.role = team.dcp_applicantrole_formatted;
    team.name = team._dcp_applicant_customer_value_formatted; // eslint-disable-line
    return team;
  });
}

/**
 * Helper function to process project center for a single project in a projects list.
 *
 * @param {Object[]} centers The Array of project centers from PostgreSQL
 * @param {String} projectId The projectId to get center for
 * @returns {Point} The center point as Array [x, y] for the project
 */
function postProcessProjectsCenters(centers, projectId) {
  const [projectCenter] = entitiesForProject(centers, projectId).map(center => center.center);
  return projectCenter || [];
}

/**
 * Helper function to process action entities for single project in a projects list.
 * Actions are filtered to only those in ACTION_CODE (see below), then processed into:
 * - projectActionTypes: A de-duped list of human-readable project actions from the ACTION_TYPES lookup
 * - projectUlurpNumbers: A ';'-separated string of ulurp numbers associated with the project
 *
 * @param {Object[]} actions The raw actions entities
 * @param {String} projectId The projectId to get actions for
 * @returns {Object} An object containing projectActionTypes
 */
function postProcessProjectsActions(actions, projectId) {
  const projectActions = entitiesForProject(actions, projectId)
    .filter(action => ACTION_CODES.includes(action.action_code));

  return {
    projectActionTypes: dedupeList(projectActions.map(action => action.action_code)).map(code => ACTION_TYPES[code]),
    projectUlurpNumbers: projectActions.map(action => action.dcp_ulurpnumber).filter(ulurpNumber => !!ulurpNumber),
  };
}

/**
 * Helper function to process applicants entities for single project in a projects list.
 * Applicant names (_dcp_applicant_customer_value_formatted) are extracted, and returned as a
 * ';'-separated string
 *
 * @param {Object[]} applicants The raw applicants entities
 * @param {String} projectId The projectId to get applicants for
 * @returns {String} String of applicants for project
 */
function postProcessProjectsApplicants(applicants, projectId) {
  const projectApplicants = entitiesForProject(applicants, projectId)
    .map(applicant => applicant._dcp_applicant_customer_value_formatted) // eslint-disable-line
    .filter(applicant => !!applicant);

  return dedupeList(projectApplicants).join(';');
}

/**
 * Helper function to process bbls entities for single project in a projects list.
 *
 * @param {Object[]} bbls The raw bbls entities
 * @param {String} projectId The project id to get bbls for
 * @returns {String[]} Processed bbls, an Array of bbl numbers
 */
function postProcessProjectsBbls(bbls, projectId) {
  return entitiesForProject(bbls, projectId).map(bbl => bbl.dcp_bblnumber);
}

/**
 * Helper function to grab all entities for a given projectId
 *
 * @param {Object[]} entities The array of all entities
 * @param {String} projectId The projectId to get entities for
 * @returns {Object[]} The filtered entities for specified project
 */
function entitiesForProject(entities, projectId) {
  return entities.filter(entity => entity.projectid === projectId);
}

/**
 * Helper function to create a formatted project from a template. Template is
 * expected to be a POJO containing at least a 'fields' property, and optionally
 * entities and entity_fields (See `/response-templates`).
 *
 * @param {Object} project The processed project object
 * @param {Object} template The project template
 * @returns {Object} The formatted object, containing exactly the fields defined in template
 */
function projectFromTemplate(project, template) {
  const { fields, entities = [], entity_fields } = template;

  // Create all fields in formatted object from original
  const formatted = objectFromFields(project, fields);

  // Create arrays for each entity type from original entity array
  entities.forEach((entityType) => {
    formatted[entityType] = project[entityType]
      .map(entity => objectFromFields(entity, entity_fields[entityType]));
  });

  return formatted;
}

/**
 * Helper function to make a formatted object from an original, given an array of fields to transfer
 *
 * @param {Object} object The original object to pull field values from
 * @param {String[]} fields The Array of fields to pull into
 * @returns {Object} The formatted object, containing all fields with values from original object
 */
function objectFromFields(object, fields) {
  const formatted = {};
  fields.forEach((field) => {
    formatted[field] = object[field];
  });
  return formatted;
}

/* CONSTANTS FOR PROJECT/ENTITY FORMATTING */
const ACTION_CODES = ['BD', 'BF', 'CM', 'CP', 'DL', 'DM', 'EB', 'EC', 'EE', 'EF', 'EM', 'EN', 'EU', 'GF', 'HA', 'HC', 'HD', 'HF', 'HG', 'HI', 'HK', 'HL', 'HM', 'HN', 'HO', 'HP', 'HR', 'HS', 'HU', 'HZ', 'LD', 'MA', 'MC', 'MD', 'ME', 'MF', 'ML', 'MM', 'MP', 'MY', 'NP', 'PA', 'PC', 'PD', 'PE', 'PI', 'PL', 'PM', 'PN', 'PO', 'PP', 'PQ', 'PR', 'PS', 'PX', 'RA', 'RC', 'RS', 'SC', 'TC', 'TL', 'UC', 'VT', 'ZA', 'ZC', 'ZD', 'ZJ', 'ZL', 'ZM', 'ZP', 'ZR', 'ZS', 'ZX', 'ZZ'];
const ACTION_TYPES = {
  BD: 'Business Improvement Districts',
  BF: 'Business Franchise',
  CM: 'Renewal',
  CP: '',
  DL: 'Disposition for Residential Low-Income Use',
  DM: 'Disposition for Residential Not Low-Income Use',
  EB: 'CEQR Application',
  EC: 'Enclosed Sidewalk Cafes',
  EE: 'CEQR Application',
  EF: 'CEQR Application',
  EM: 'CEQR Application',
  EN: 'CEQR Application',
  EU: 'CEQR Application',
  GF: 'Franchise or Revocable Consent',
  HA: 'Urban Development Action Area',
  HC: 'Minor Change',
  HD: 'Disposition of Urban Renewal Site',
  HF: 'Community Dev. Application/Amendment',
  HG: 'Urban Renewal Designation',
  HI: 'Landmarks - Individual Sites',
  HK: 'Landmarks - Historic Districts ',
  HL: 'Housing/Urban Renewal/Pub Ben Corp Lease',
  HM: 'Currently Residential/Not Low-Income',
  HN: 'Urban Development Action Area - UDAAP Non-ULURP',
  HO: 'Housing Application (Plan and Project)',
  HP: 'Plan & Project/Land Disposition Agreement (LDA) ',
  HR: 'Assignments & Transfers',
  HS: 'Special District/Mall Plan/REMIC NPA',
  HU: 'Urban Renewal Plan and Amendments',
  HZ: 'Preliminary Site Approval Application',
  LD: 'Legal Document (NOC, NOR, RD)',
  MA: 'Assignment/Acquisition',
  MC: 'Major Concessions',
  MD: 'Drainage Plan',
  ME: 'Easements (Administrative)',
  MF: 'Franchise Applic - Not Sidewalk Café',
  ML: 'Landfill',
  MM: 'Change in City Map',
  MP: 'Prior Action',
  MY: 'Administration Demapping',
  NP: '197-A Plan',
  PA: 'Transfer/Assignment',
  PC: 'Combination Acquisition and Site Selection by the City',
  PD: 'Amended Drainage Plan',
  PE: 'Exchange of City Property with Private Property',
  PI: 'Private Improvement',
  PL: 'Leasing of Private Property by the City',
  PM: 'Map Change Related to Site Selection',
  PN: 'Negotiated Disposition of City Property',
  PO: 'OTB Site Selection',
  PP: 'Disposition of Non-Residential City-Owned Property',
  PQ: 'Acquisition of Property by the City',
  PR: 'Release of City\'s Interest',
  PS: 'Site Selection (City Facility) ',
  PX: 'Office Space',
  RA: 'South Richmond District Authorizations ',
  RC: 'South Richmond District Certifications',
  RS: 'South Richmond District Special Permits',
  SC: 'Special Natural Area Certifications',
  TC: 'Consent - Sidewalk Café',
  TL: 'Leasing of C-O-P By Private Applicants',
  UC: 'Unenclosed Café',
  VT: 'Cable TV',
  ZA: 'Zoning Authorization',
  ZC: 'Zoning Certification',
  ZD: 'Amended Restrictive Declaration',
  ZJ: 'Residential Loft Determination',
  ZL: 'Large Scale Special Permit',
  ZM: 'Zoning Map Amendment',
  ZP: 'Parking Special Permit/Incl non-ULURP Ext',
  ZR: 'Zoning Text Amendment ',
  ZS: 'Zoning Special Permit',
  ZX: 'Counsel\'s Office - Rules of Procedure',
  ZZ: 'Site Plan Approval in Natural Area Districts',
};
const ALLOWED_MILESTONES = ['Borough Board Referral', 'Borough President Referral', 'Prepare CEQR Fee Payment', 'City Council Review', 'Community Board Referral', 'CPC Public Meeting - Public Hearing', 'CPC Public Meeting - Vote', 'DEIS Public Hearing Held', 'Review Filed EAS and EIS Draft Scope of Work', 'DEIS Public Scoping Meeting', 'Prepare and Review FEIS', 'Review Filed EAS', 'Final Letter Sent', 'Issue Final Scope of Work', 'Prepare Filed Land Use Application', 'Prepare Filed Land Use Fee Payment', 'Mayoral Veto', 'DEIS Notice of Completion Issued', 'Review Session - Certified / Referred', 'CPC Review of Modification Scope'];
const MILESTONES = {
  '963beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Borough Board Review',
    display_description: {
      ULURP: 'The Borough Board has 30 days concurrent with the Borough President’s review period to review the application and issue a recommendation.',
    },
  },
  '943beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Borough President Review',
    display_description: {
      ULURP: 'The Borough President has 30 days after the Community Board issues a recommendation to review the application and issue a recommendation.',
    },
  },
  '763beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'CEQR Fee Paid',
  },
  'a43beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'City Planning Commission Vote',
  },
  '863beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Draft Environmental Impact Statement Public Hearing',
  },
  '7c3beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Draft Scope of Work for Environmental Impact Statement Received',
    display_description: 'A Draft Scope of Work must be recieved 30 days prior to the Public Scoping Meeting.',
  },
  '7e3beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Environmental Impact Statement Public Scoping Meeting',
  },
  '883beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Final Environmental Impact Statement Submitted',
    display_description: 'A Final Environmental Impact Statement (FEIS) must be completed ten days prior to the City Planning Commission vote.',
  },
  '783beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Environmental Assessment Statement Filed',
  },
  'aa3beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Approval Letter Sent to Responsible Agency',
    display_description: {
      'Non-ULURP': 'For many non-ULURP actions this is the final action and record of the decision.',
    },
  },
  '823beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Final Scope of Work for Environmental Impact Statement Issued',
  },
  '663beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Land Use Application Filed',
  },
  '6a3beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Land Use Fee Paid',
  },
  'a83beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Mayoral Review',
    display_description: {
      ULURP: 'The Mayor has five days to review the City Councils decision and issue a veto.',
    },
  },
  '843beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Draft Environmental Impact Statement Completed',
    display_description: 'A Draft Environmental Impact Statement must be completed prior to the City Planning Commission certifying or referring a project for public review.',
  },
  '780593bb-ecc2-e811-8156-1458d04d0698': {
    display_name: 'CPC Review of Council Modification}',
    display_sequence: 58,
  },

  'a63beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'City Council Review',
    display_description: {
      ULURP: 'The City Council has 50 days from receiving the City Planning Commission report to call up the application, hold a hearing and vote on the application.',
      'Non-ULURP': 'The City Council reviews text amendments and a few other non-ULURP items.',
    },
  },
  '923beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Community Board Review',
    display_description: {
      ULURP: 'The Community Board has 60 days from the time of referral (nine days after certification) to hold a hearing and issue a recommendation.',
      'Non-ULURP': 'The City Planning Commission refers to the Community Board for 30, 45 or 60 days.',
    },
  },
  '9e3beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'City Planning Commission Review',
    display_description: {
      ULURP: 'The City Planning Commission has 60 days after the Borough President issues a recommendation to hold a hearing and vote on an application.',
      'Non-ULURP': 'The City Planning Commission does not have a clock for non-ULURP items. It may or may not hold a hearing depending on the action.',
    },
  },
  '8e3beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Application Reviewed at City Planning Commission Review Session',
    display_description: {
      ULURP: 'A "Review Session" milestone signifies that the application has been sent to the City Planning Commission (CPC) and is ready for review. The "Review" milestone represents the period of time (up to 60 days) that the CPC reviews the application before their vote.',
      'Non-ULURP': 'A "Review Session" milestone signifies that the application has been sent to the City Planning Commission and is ready for review. The City Planning Commission does not have a clock for non-ULURP items. It may or may not hold a hearing depending on the action.',
    },
  },
};

module.exports = {
  postProcessProject,
  postProcessProjects,
  postProcessProjectsUpdateGeoms,
};
