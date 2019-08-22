const dedupeList = require('../dedupe-list');
const projectTemplate = require('../../response-templates/project');
const projectFromTemplate = require('../project-from-template');

const {
  ALLOWED_ACTIONS,
  ALLOWED_MILESTONES,
  MILESTONES,
} = require('../../constants');

const FORMATTED = '@OData.Community.Display.V1.FormattedValue';

/**
 * TODO: RENAME CLASS AND EXTRACT DISTINCT RESPONSIBILITIES INTO NEW CLASS
 * Flatten an array of project rows (all associated with a single project)
 * into a single project object, with associated entities rolled up into arrays,
 * and finally formatting object for response from template.
 *
 * @param {Object[] projectRows The project rows from CRM
 * @returns {Object} The flattened, formatted project
 */
function flattenProjectRows(projectRows) {
  const bbls = [];
  const actions = [];
  const milestones = [];
  const keywords = [];
  const applicants = [];
  const addresses = [];

  projectRows.forEach((row) => {
    bbls.push(extractBbl(row));
    actions.push(extractAction(row));
    milestones.push(extractMilestone(row));
    keywords.push(extractKeyword(row));
    applicants.push(extractApplicant(row));
    addresses.push(extractAddress(row));
  });

  const project = projectRows[0];
  project.dcp_borough = project[`dcp_borough${FORMATTED}`];
  project.dcp_ceqrtype = project[`dcp_ceqrtype${FORMATTED}`];
  project.dcp_ulurp_nonulurp = project[`dcp_ulurp_nonulurp${FORMATTED}`];
  project.dcp_publicstatus_simp = getPublicStatusSimp(project[`dcp_publicstatus${FORMATTED}`]);

  // add entities
  project.bbls = dedupeList(bbls);
  project.actions = dedupeList(actions, 'dcp_ulurpnumber')
    .filter(action => ALLOWED_ACTIONS.includes(action.actioncode));
  project.milestones = dedupeList(milestones, 'zap_id', 'display_date')
    .filter(milestone => ALLOWED_MILESTONES.includes(milestone.zap_id))
    .sort((milestone1, milestone2) => {
      if (milestone1.dcp_milestonesequence > milestone2.dcp_milestonesequence) return 1;
      if (milestone1.dcp_milestonesequence < milestone2.dcp_milestonesequence) return -1;

      if (milestone1.display_date > milestone2.display_date) return 1;
      if (milestone1.display_date < milestone2.display_date) return -1;

      return 0;
    });

  project.keywords = dedupeList(keywords);
  project.applicantteam = dedupeList(applicants, 'name');
  project.addresses = dedupeList(addresses, 'full_address');

  return projectFromTemplate(project, projectTemplate);
}

/**
 * Sets derived field `dcp_publicstatus_simp` from `dcp_publicstatus_formatted`
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
 * Extracts bbl entity from a single project row
 *
 * @param {Object} projectRow The single project row from CRM
 * @returns {String} The bbl string
 */
function extractBbl(projectRow) {
  return projectRow['bbls.dcp_bblnumber'];
}

/**
 * Extracts action entity from a single project row. Returns
 * empty object if dcp_name does not match defined regex.
 *
 * @param {Object} projectRow The single project row from CRM
 * @returns {Object} The formatted action object with properties:
 * statuscode, dcp_ulurpnumber, actioncode, dcp_name
 */
function extractAction(projectRow) {
  if (!projectRow['actions.dcp_name']) return {};

  const ACTION_DCP_NAME_REGEX = '^(\\w+)\\s*-{1}\\s*(.*)\\s';
  const actionMatch = projectRow['actions.dcp_name'].match(ACTION_DCP_NAME_REGEX);
  if (actionMatch) {
    const [, actioncode, dcp_name] = actionMatch;
    return {
      statuscode: projectRow[`actions.statuscode${FORMATTED}`],
      dcp_ulurpnumber: projectRow[`actions.dcp_ulurpnumber`],
      actioncode,
      dcp_name,
    };
  }

  return {};
}

/**
 * Extracts milestone entity from a single project row. Returns
 * empty object if `dcp_milestone` is not set.
 *
 * @param {Object} projectRow The single project row from CRM
 * @returns {Object} The formatted milestone object with properties:
 * zap_id, display_name, display_description, display_date, display_date_2
 */
function extractMilestone(projectRow) {
  const id = projectRow['milestones.dcp_milestone'];

  const display_date = getMilestoneDisplayDate(
    id,
    projectRow['milestones.dcp_actualstartdate'],
    projectRow['milestones.dcp_actualenddate'],
    projectRow[`dcp_publicstatus${FORMATTED}`],
  );

  const display_date_2 = getMilestoneDisplayDate2(
    id,
    projectRow['milestones.dcp_actualenddate'],
    projectRow['milestones.dcp_plannedcompletiondate'],
    projectRow[`dcp_publicstatus${FORMATTED}`],
  );

  if (id) {
    return {
      zap_id: id,
      display_name: getMilestoneDisplayName(id),
      display_description: getMilestoneDisplayDescription(id, projectRow[`dcp_ulurp_nonulurp${FORMATTED}`]),
      display_date,
      // TODO: This is behavior that should be dealt with in the frontend
      display_date_2: (display_date === display_date_2) ? null : display_date_2,
      outcome: projectRow['outcomes.dcp_name'],
      dcp_milestonesequence: projectRow['milestones.dcp_milestonesequence'],
    };
  }

  return {};
}

/**
 * Gets milestone display name from lookup constant
 *
 * @param {String} id The milestone UUID
 * @returns {String} The milestone display name
 */
function getMilestoneDisplayName(id) {
  return MILESTONES[id] && MILESTONES[id].display_name
    ? MILESTONES[id].display_name
    : '';
}

/**
 * Gets milestone display description from lookup constant
 *
 * @param {String} id The milestone UUID
 * @Param {String} ulurpNonUlurp The ulurp/non-ulurp status
 * @returns {String} The milestone display description
 */
function getMilestoneDisplayDescription(id, ulurpNonUlurp) {
  if (MILESTONES[id] && MILESTONES[id].display_description) {
    const desc = MILESTONES[id].display_description;
    if (desc[ulurpNonUlurp] !== undefined) return desc[ulurpNonUlurp];
    return desc;
  }

  return '';
}

/**
 * Gets milestone display date from milestone actual start and end dates
 *
 * @param {String} id The milestone UUID
 * @param {String} start The milestone dcp_actualstartdate
 * @param {String} end The milestone dcp_actualenddate
 * @param {String} publicStatus The project publicstatus
 * @returns {String} The appropriate date to use as display_date
 */
function getMilestoneDisplayDate(id, start, end, publicStatus) {
  const USE_END = [
    '763beec4-dad0-e711-8116-1458d04e2fb8',
    '663beec4-dad0-e711-8116-1458d04e2fb8',
    '6a3beec4-dad0-e711-8116-1458d04e2fb8',
    '780593bb-ecc2-e811-8156-1458d04d0698',
    '483beec4-dad0-e711-8116-1458d04e2fb8',
    '4a3beec4-dad0-e711-8116-1458d04e2fb8',
  ];
  const USE_END_IF_NOT_FILED = [
    'a43beec4-dad0-e711-8116-1458d04e2fb8',
    '863beec4-dad0-e711-8116-1458d04e2fb8',
    '7e3beec4-dad0-e711-8116-1458d04e2fb8',
    'aa3beec4-dad0-e711-8116-1458d04e2fb8',
    '823beec4-dad0-e711-8116-1458d04e2fb8',
    '843beec4-dad0-e711-8116-1458d04e2fb8',
    '8e3beec4-dad0-e711-8116-1458d04e2fb8',
  ];
  const USE_START = [
    '783beec4-dad0-e711-8116-1458d04e2fb8',
  ];
  const USE_START_IF_NOT_FILED = [
    '963beec4-dad0-e711-8116-1458d04e2fb8',
    '943beec4-dad0-e711-8116-1458d04e2fb8',
    'a63beec4-dad0-e711-8116-1458d04e2fb8',
    '923beec4-dad0-e711-8116-1458d04e2fb8',
    '9e3beec4-dad0-e711-8116-1458d04e2fb8',
    '7c3beec4-dad0-e711-8116-1458d04e2fb8',
    '883beec4-dad0-e711-8116-1458d04e2fb8',
    'a83beec4-dad0-e711-8116-1458d04e2fb8',
  ];

  if (USE_END.includes(id)) return end;
  if (USE_END_IF_NOT_FILED.includes(id) && publicStatus !== 'Filed') return end;

  if (USE_START.includes(id)) return start;
  if (USE_START_IF_NOT_FILED.includes(id) && publicStatus !== 'Filed') return start;

  return null;
}

/**
 * Gets milestone display date from milestone actual end date and planned completion date
 *
 * @param {String} id The milestone UUID
 * @param {String} start The milestone dcp_actualenddate
 * @param {String} end The milestone dcp_plannedcompletiondate
 * @param {String} publicStatus The project publicstatus
 * @returns {String} The appropriate date to use as display_date_2
 */
function getMilestoneDisplayDate2(id, actualEnd, plannedCompletion, publicStatus) {
  if (publicStatus !== 'Filed') {
    return actualEnd || plannedCompletion;
  }

  return null;
}

/**
 * Extracts bbl entity from a single project row
 *
 * @param {Object} projectRow The single project row from CRM
 * @returns {String} The keyword string
 */
function extractKeyword(projectRow) {
  return projectRow[`keywords.dcp_keyword${FORMATTED}`];
}

/**
 * Extracts applicants entity from a single project row. Returns
 * empty object if none of the expected properties are set.
 *
 * @param {Object} projectRow The single project row from CRM
 * @returns {Object} The formatted applicants object with properties:
 * role, name
 */
function extractApplicant(projectRow) {
  const role = projectRow[`applicants.dcp_applicantrole${FORMATTED}`];
  const name = projectRow[`applicants.dcp_applicant_customer${FORMATTED}`];
  if (role || name) {
    return {
      role,
      name,
    };
  }

  return {};
}

/**
 * Extracts address entity from a single project row. Returns
 * empty object if none of the expected properties are set.
 *
 * @param {Object} projectRow The single project row from CRM
 * @returns {Object} The formatted address object with properties:
 * dcp_validatedstreet, dcp_validatedaddressnumber, full_address
 */
function extractAddress(projectRow) {
  const dcp_validatedstreet = projectRow[`addresses.dcp_validatedstreet`];
  const dcp_validatedaddressnumber = projectRow[`addresses.dcp_validatedaddressnumber`];

  if (dcp_validatedaddressnumber || dcp_validatedaddressnumber) {
    return {
      dcp_validatedstreet,
      dcp_validatedaddressnumber,
      full_address: `${dcp_validatedaddressnumber} ${dcp_validatedstreet}`,
    };
  }

  return {};
}

module.exports = {
  flattenProjectRows,
};
