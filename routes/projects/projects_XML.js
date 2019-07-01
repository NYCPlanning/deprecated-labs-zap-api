/*eslint-disable*/

const express = require('express');
const ADALService = require('../../utils/ADALServices');
const crmWebAPI = require('../../utils/crmWebAPI');
const fetchXmls = require('../../queries/fetchXmls');
const responseTemplate = require('../../queries/responseTemplate');
const router = express.Router({ mergeParams: true });
const postFetchEdits = require('../../utils/postFetchEdits');


/* GET /projects-xmls */
/* gets a JSON array of projects that match the query params */
router.post('/', async (req, res) => {
  const { queryParams } = req.body; //  temporary declaration for postman param use
  const { fillProjectsTemplate } = responseTemplate;

  const {page, itemsPerPage} = queryParams;


  try {
    const projectFetchXML = fetchXmls.fetchProjects(queryParams, page, itemsPerPage);
    const projects = await crmWebAPI.get(`dcp_projects?fetchXml=${projectFetchXML}`, 1);
    const projectIDs = projects['value'].map( project => project.dcp_projectid);


    let milestones, actions, bbls, applicantTeams;
    if(projectIDs.length > 0){
      milestones = crmWebAPI.get(`dcp_projectmilestones?fetchXml=${fetchXmls.fetchMilestoneForProjects(projectIDs)}`, 1);
      actions = crmWebAPI.get(`dcp_projectactions?fetchXml=${fetchXmls.fetchActionForProjects(projectIDs)}`, 1);
      bbls = crmWebAPI.get(`dcp_projectbbls?fetchXml=${fetchXmls.fetchBBLForProjects(projectIDs)}`, 1);
      applicantTeams = crmWebAPI.get(`dcp_projectapplicants?fetchXml=${fetchXmls.fetchApplicantTeamForProjects(projectIDs)}`, 1);
    }

    const projectResult = await Promise.all([projects, milestones, actions, bbls, applicantTeams]);

    const projectsAssembled = assembleResponse(projectResult);


    // send the response with a tile template
    res.send({
      data: fillProjectsTemplate(projectsAssembled)
      // data: projects['value'].map(project => fillProjectsTemplate(projectsTemplate, project))
      // meta: {
      //   total,
      //   pageTotal: length,
      //   ...tileMeta,
      // },
    });
  } catch (e) {
    console.log(e); // eslint-disable-line
    res.status(404).send({
      error: e.toString(),
    });
  }
});

module.exports = router;


function assembleResponse(projectResult){
  let [
    projects,
    milestones,
    actions,
    bbls,
    applicantTeams
  ] = projectResult;

  return projects['value'].map( project => {
    const filterActionCode = ['BD', 'BF', 'CM', 'CP', 'DL', 'DM', 'EB', 'EC', 'EE', 'EF', 'EM', 'EN', 'EU', 'GF', 'HA', 'HC', 'HD', 'HF', 'HG', 'HI', 'HK', 'HL', 'HM', 'HN', 'HO', 'HP', 'HR', 'HS', 'HU', 'HZ', 'LD', 'MA', 'MC', 'MD', 'ME', 'MF', 'ML', 'MM', 'MP', 'MY', 'NP', 'PA', 'PC', 'PD', 'PE', 'PI', 'PL', 'PM', 'PN', 'PO', 'PP', 'PQ', 'PR', 'PS', 'PX', 'RA', 'RC', 'RS', 'SC', 'TC', 'TL', 'UC', 'VT', 'ZA', 'ZC', 'ZD', 'ZJ', 'ZL', 'ZM', 'ZP', 'ZR', 'ZS', 'ZX', 'ZZ'];
    actions['value'] = actions['value'].filter( action => filterActionCode.includes(action['action_code']));

    const projectAction = findByID(project.dcp_projectid, actions);
    let actionTypes = [];
    let ulurpnumbers = [];

    projectAction.forEach( action => {
      const actionType = action['_dcp_action_value_formatted'];
      const ulurpNumber = action.dcp_ulurpnumber;

      if(actionType && actionTypes.indexOf(actionType)) actionTypes.push(actionType);
      if(ulurpNumber && ulurpnumbers.indexOf(ulurpNumber)) ulurpnumbers.push(ulurpNumber);
    });

    const actionCodes = actionTypes.join(';');
    const lastmilestonedates = findByID(project.dcp_projectid, milestones);
    const projectbbls = findByID(project.dcp_projectid, bbls).map( bbl => bbl.blocks).join(';');
    const applicants = findByID(project.dcp_projectid, applicantTeams).map( applicant => applicant['_dcp_applicant_customer_value_formatted']).filter( applicant => !!applicant).join(';');

    return {
      ...project,
      actiontypes: actionCodes,
      lastmilestonedate: lastmilestonedates.length !== 0 ? lastmilestonedates[0].actualenddate : [],
      bbls: projectbbls.length !== 0 ? projectbbls : [],
      applicants: applicants,
      ulurpnumbers,
      total_projects: projects['@Microsoft.Dynamics.CRM.totalrecordcount']
    };
  })
}

function findByID(id, entities){
  return entities['value'].filter( entity => entity.projectid === id);
}
