const dedupeList = require('./dedupe-list');
const getVideoLinks = require('./get-video-links');
const injectSupportingDocumentURLs = require('./inject-supporting-document-urls');
const projectTemplate = require('../response-templates/project');
const projectsTemplate = require('../response-templates/projects');

/* POST PROCESS FUNCTIONS FOR SINGLE PROJECT */
async function postProcessProject(project, entities, geo) {
  setPublicStatusSimp(project);

  project.jdcp_easeis = project.dcp_easeis_formatted; project.dcp_borough = project.dcp_borough_formatted; project.dcp_ceqrtype = project.dcp_ceqrtype_formatted;
  project.dcp_leaddivision = project.dcp_leaddivision_formatted; project.dcp_ulurp_nonulurp = project.dcp_ulurp_nonulurp_formatted;
  project.dcp_leadagencyforenvreview = project._dcp_leadagencyforenvreview_value; // eslint-disable-line

  // add list entities
  project.bbls = postProcessProjectBbls(entities.bbls);
  project.keywords = postProcessProjectKeywords(entities.keywords);

  // add object entities
  project.actions = postProcessProjectActions(entities.actions);
  project.milestones = postProcessProjectMilestones(entities.milestones, project);
  project.applicantteam = postProcessProjectApplicantTeam(entities.applicants);
  project.addresses = entities.addresses;

  // add geo
  project.bbl_multipolygon = geo.bblMultipolygon;
  project.bbl_featurecollection = geo.bblFeatureCollection;

  await injectSupportingDocumentURLs(project);
  project.video_links = await getVideoLinks(project.dcp_name);

  return projectFromTemplate(project, projectTemplate);
}

function setPublicStatusSimp(project) {
  switch (project.dcp_publicstatus_formatted) {
    case 'Filed':
      project.dcp_publicstatus_simp = 'Filed';
      break;
    case 'Certified':
      project.dcp_publicstatus_simp = 'In Public Review';
      break;
    case 'Approved':
    case 'Withdrawn':
      project.dcp_publicstatus_simp = 'Completed';
      break;
    default:
      project.dcp_publicstatus_simp = 'Unknown';
  }
}

function postProcessProjectBbls(bbls) { return bbls.map(bbl => bbl.dcp_bblnumber); }

function postProcessProjectActions(actions) {
  return actions
    .filter((action) => {
      const actioncodeMatch = action.dcp_name.match('^(\\w+)\\s*-{1}\\s*(.*)\\s');
      if (actioncodeMatch) {
        const [, actioncode, dcpName] = actioncodeMatch;
        if (ACTION_CODES.includes(actioncode)) {
          action.actioncode = actioncode;
          action.dcp_name = dcpName;
          action.statuscode = action.statuscode_formatted;
          return true;
        }
      }

      return false;
    });
}

function postProcessProjectMilestones(milestones, project) {
  const ulurpNonUlurp = project.dcp_ulurp_nonulurp_formatted;
  const publicStatus = project.dcp_publicstatus_formatted;
  return milestones.map((milestone) => {
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

function postProcessProjectKeywords(keywords) {
  return keywords.map(keyword => keyword._dcp_keyword_value_formatted); // eslint-disable-line
}

function postProcessProjectApplicantTeam(applicantTeam) {
  return applicantTeam.map((team) => {
    team.role = team.dcp_applicantrole_formatted;
    team.name = team._dcp_applicant_customer_value_formatted; // eslint-disable-line 
    return team;
  });
}

/* POST PROCESS FUNCTIONS FOR PROJECTS LIST */
function postProcessProjects(projects, entities, projectsCenters = []) {
  return projects.map((project) => {
    const uuid = project.dcp_projectid;
    const id = project.dcp_name;
    const projectCenter = postProcessProjectsCenters(projectsCenters, id);
    const {
      projectActionTypes,
      projectUlurpNumbers,
    } = postProcessProjectsActions(entities.actions, uuid);
    const projectApplicants = postProcessProjectsApplicants(entities.applicants, uuid);

    project.center = projectCenter;
    project.has_centroid = !!projectCenter.length;
    project.actiontypes = projectActionTypes;
    project.ulurpnumbers = projectUlurpNumbers;
    project.lastmilestonedate = project.dcp_lastmilestonedate;
    project.applicants = projectApplicants;

    return projectFromTemplate(project, projectsTemplate);
  });
}

function postProcessProjectsCenters(centers, projectId) {
  return entitiesForProject(centers, projectId).map(center => center.center);
}

function postProcessProjectsActions(actions, projectId) {
  const projectActions = entitiesForProject(actions, projectId)
    .filter(action => ACTION_CODES.includes(action.action_code));

  return {
    projectActionTypes: dedupeList(projectActions.map(action => action.action_code)).map(code => ACTION_TYPES[code]),
    projectUlurpNumbers: projectActions.map(action => action.dcp_ulurpnumber).filter(ulurpNumber => !!ulurpNumber),
  };
}

function postProcessProjectsApplicants(applicants, projectId) {
  const projectApplicants = entitiesForProject(applicants, projectId)
    .map(applicant => applicant._dcp_applicant_customer_value_formatted) // eslint-disable-line
    .filter(applicant => !!applicant);

  return dedupeList(projectApplicants).join(';');
}

function postProcessProjectsUpdateGeoms(projects, bbls) {
  projects.forEach((project) => {
    const uuid = project.dcp_projectid;
    setPublicStatusSimp(project);
    project.bbls = postProcessProjectsBbls(bbls, uuid);
  });
}

function postProcessProjectsBbls(bbls, uuid) {
  return entitiesForProject(bbls, uuid).map(bbl => bbl.dcp_bblnumber);
}

function entitiesForProject(entities, projectId) {
  return entities.filter(entity => entity.projectid === projectId);
}


function projectFromTemplate(project, template) {
  const { fields, entities = [], entity_fields } = template;
  const formatted = objectFromFields(project, fields);

  entities.forEach((entityType) => {
    formatted[entityType] = project[entityType]
      .map(entity => objectFromFields(entity, entity_fields[entityType]));
  });

  return formatted;
}

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
    display_name: 'CPC Review of Council Modification}', display_sequence: 58,
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
