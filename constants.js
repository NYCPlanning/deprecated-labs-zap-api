// CRM Query for Contact Status types:
// https://dcppfstest2.crm9.dynamics.com/api/data/v9.0/EntityDefinitions(LogicalName='contact')/Attributes(a247349a-78ab-4729-8528-515fc2719b67)/Microsoft.Dynamics.CRM.StatusAttributeMetadata/OptionSet?$select=Options

// CRM Query for ProjectMilestone Status types:
// https://dcppfstest2.crm9.dynamics.com/api/data/v9.0/EntityDefinitions(LogicalName='dcp_projectmilestone')/Attributes(5cbf24ef-7923-423a-bf5d-e898a3375331)/Microsoft.Dynamics.CRM.StatusAttributeMetadata/OptionSet?$select=Options

// CRM Query for Milestones:
// https://dcppfstest2.crm9.dynamics.com/api/data/v9.0/dcp_milestones

// CRM Query for Actions
// https://dcppfstest2.crm9.dynamics.com/api/data/v9.0/dcp_actions

// CRM Query for Project publicstatuses
// https://dcppfstest2.crm9.dynamics.com/api/data/v9.0/EntityDefinitions(LogicalName='dcp_project')/Attributes(c8d2d301-d28c-4b41-b1aa-b98bb2bbd7fa)/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet,GlobalOptionSet

// CRM Query for Contact Statecode
// https://dcppfstest2.crm9.dynamics.com/api/data/v9.0/EntityDefinitions(LogicalName='contact')/Attributes(cdc3895a-7539-41e9-966b-3f9ef805aefd)/Microsoft.Dynamics.CRM.StateAttributeMetadata/OptionSet?$select=Options

// CRM Query for ProjectMilestone STATUSCode
// https://dcppfstest2.crm9.dynamics.com/api/data/v9.0/EntityDefinitions(LogicalName='dcp_projectmilestone')/Attributes(5cbf24ef-7923-423a-bf5d-e898a3375331)/Microsoft.Dynamics.CRM.StatusAttributeMetadata/OptionSet?$select=Options

// CRM entity enum lookups
const VISIBILITY = {
  GENERAL_PUBLIC: 717170003,
};

const STATUSCODE = {
  MISTAKE: 717170003,
  OVERRIDDEN: 717170001,
};

const STATECODE = {
  ACTIVE: '0',
};

const APPLICANTROLE = {
  APPLICANT: 717170000,
  COAPPLICANT: 717170002,
};

const EXCLUDED_ACTION_CODES = ['EAS', 'EIS', 'WR', 'FT', 'UK'];

const ACTIONS = {
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

// Are these IDs stable across environments?
const MILESTONES = {
  '963beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Borough Board Review',
    display_description: {
      ULURP: 'The Borough Board has 30 days concurrent with the Borough President’s review period to review the application and issue a recommendation.',
      'Non-ULURP': '',
    },
  },
  '943beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Borough President Review',
    display_description: {
      ULURP: 'The Borough President has 30 days after the Community Board issues a recommendation to review the application and issue a recommendation.',
      'Non-ULURP': '',
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
      ULURP: '',
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
      'Non-ULURP': '',
    },
  },
  '843beec4-dad0-e711-8116-1458d04e2fb8': {
    display_name: 'Draft Environmental Impact Statement Completed',
    display_description: 'A Draft Environmental Impact Statement must be completed prior to the City Planning Commission certifying or referring a project for public review.',
  },
  '780593bb-ecc2-e811-8156-1458d04d0698': {
    display_name: 'CPC Review of Council Modification}',
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
  VISIBILITY,
  STATUSCODE,
  STATECODE,
  APPLICANTROLE,
  EXCLUDED_ACTION_CODES,
  ACTIONS,
  ALLOWED_ACTIONS: Object.keys(ACTIONS),
  MILESTONES,
  ALLOWED_MILESTONES: Object.keys(MILESTONES),
};
