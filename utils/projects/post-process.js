const dedupeList = require('../dedupe-list');
const projectsTemplate = require('../../response-templates/projects');
const parsePrefixedProperties = require('../parse-prefixed-properties');
const getPublicStatusSimp = require('../get-publicstatus-simp');
const projectFromTemplate = require('../project-from-template');

const {
  keyForValue,
  PUBLICSTATUS,
  CEQRTYPE,
  BOROUGH,
  ULURP,
  ALLOWED_ACTION_CODES,
  ACTION_DCP_NAME_REGEX,
} = require('../constants');

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
    project.actiontypes = projectActionTypes.join(';');
    project.ulurpnumbers = projectUlurpNumbers.join(';');
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
    .map((action) => {
      const actionMatch = action.dcp_name.match(ACTION_DCP_NAME_REGEX);
      if (actionMatch) {
        const [,, actionType] = actionMatch;
        action.action_type = actionType;
      }
      return action;
    })
    .filter(action => !!action.action_type && ALLOWED_ACTION_CODES.includes(action.action_code));

  return {
    projectActionTypes: dedupeList(projectActions.map(action => action.action_type)),
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
    .map((rawApplicant) => {
      const applicant = parsePrefixedProperties(rawApplicant);
      return applicant._dcp_applicant_customer_value_formatted; // eslint-disable-line
    })
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

/* CONSTANTS FOR PROJECT/ENTITY FORMATTING */

module.exports = {
  postProcessProjects,
  postProcessProjectsUpdateGeoms,
};
