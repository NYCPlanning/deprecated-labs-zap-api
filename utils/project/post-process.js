const getVideoLinks = require('./get-video-links');
const injectSupportingDocumentURLs = require('./inject-supporting-document-urls');
const projectTemplate = require('../../response-templates/project');
const parsePrefixedProperties = require('../parse-prefixed-properties');
const getPublicStatusSimp = require('../get-publicstatus-simp');
const projectFromTemplate = require('../project-from-template');

const {
  ALLOWED_ACTION_CODES,
  ACTION_DCP_NAME_REGEX,
  ALLOWED_MILESTONES,
  MILESTONES,
} = require('../constants');

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
  project.dcp_borough = project.dcp_borough_formatted;
  project.dcp_ceqrtype = project.dcp_ceqrtype_formatted;
  project.dcp_ulurp_nonulurp = project.dcp_ulurp_nonulurp_formatted;
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

      const actionMatch = action.dcp_name.match(ACTION_DCP_NAME_REGEX);
      if (actionMatch) {
        const [, actioncode, dcpName] = actionMatch;
        action.actioncode = actioncode;
        action.dcp_name = dcpName;
      }
      return action;
    })
    .filter(action => ALLOWED_ACTION_CODES.includes(action.actioncode));
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

/* CONSTANTS FOR PROJECT/ENTITY FORMATTING */
module.exports = {
  postProcessProject,
};
