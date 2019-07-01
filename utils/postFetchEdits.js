/*eslint-disable*/

const fetchXmls = require('../queries/fetchXmls');
const crmWebAPI = require('../utils/crmWebAPI');

function pluralize(entity) {
  if(entity !== 'keyword' && entity !== 'address')
    return entity + 's';
  else if(entity !== 'keyword')
    return entity + 'es';
  else
    return entity + 'ses';
}
function getEntity(project, entity, headers) {
  const projectID = project.dcp_projectid;

  const dictionary = {
    'bbl': {
      edit: postFetchEdits.bbls,
      fetch: projectID => fetchXmls.fetchBBL(projectID)
    },
    'action': {
      edit: postFetchEdits.actions,
      fetch: projectID => fetchXmls.fetchAction(projectID)
    },
    'milestone': {
      edit: postFetchEdits.milestones,
      fetch: projectID => fetchXmls.fetchMilestone(projectID)
    },
    'keyword': {
      edit: postFetchEdits.keywords,
      fetch: projectID => fetchXmls.fetchKeywords(projectID)
    },
    'applicant': {
      edit: postFetchEdits.applicantTeams,
      fetch: projectID => fetchXmls.fetchApplicantTeam(projectID)
    },
    'address': {
      edit: null,
      fetch: projectID => fetchXmls.fetchAddress(projectID)
    }
  };

  const query = `dcp_project${pluralize(entity)}?fetchXml=${dictionary[entity].fetch(projectID)}`;

  return crmWebAPI.get(query, 1, headers)
    .then(result => {
      if(dictionary[entity].edit !== null){
        if(entity !== 'milestone')
          return dictionary[entity].edit(result['value']);
        else
          return dictionary[entity].edit(result['value'], project);
      }
      else
        return result['value'];
    });
}

const postFetchEdits = {
  actions: actions => actionsPostFetchEdits(actions),
  bbls: bbls => bbls.map(bbl => bbl.dcp_bblnumber),
  milestones: (milestones, project) => milestonesPostFetchEdits(milestones, project),
  keywords: keywords => keywordsPostFetchEdits(keywords),
  applicantTeams: applicantTeams => applicantTeamPostFetchEdits(applicantTeams)
};
const projectsPostFetchEdits = project => {
  project = projectPostFetchEdits(project);



  return project;
};
const projectPostFetchEdits = project => {
  switch(project.dcp_publicstatus_formatted){
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

  project['dcp_easeis'] = project['dcp_easeis_formatted'];
  project['dcp_borough'] = project['dcp_borough_formatted'];
  project['dcp_ceqrtype'] = project['dcp_ceqrtype_formatted'];
  project['dcp_leaddivision'] = project['dcp_leaddivision_formatted'];
  project['dcp_ulurp_nonulurp'] = project['dcp_ulurp_nonulurp_formatted'];
  project['dcp_leadagencyforenvreview'] = project['_dcp_leadagencyforenvreview_value'];

  return project;
};
const actionsPostFetchEdits = actions => {
  const filterActionCode = ['BD', 'BF', 'CM', 'CP', 'DL', 'DM', 'EB', 'EC', 'EE', 'EF', 'EM', 'EN', 'EU', 'GF', 'HA', 'HC', 'HD', 'HF', 'HG', 'HI', 'HK', 'HL', 'HM', 'HN', 'HO', 'HP', 'HR', 'HS', 'HU', 'HZ', 'LD', 'MA', 'MC', 'MD', 'ME', 'MF', 'ML', 'MM', 'MP', 'MY', 'NP', 'PA', 'PC', 'PD', 'PE', 'PI', 'PL', 'PM', 'PN', 'PO', 'PP', 'PQ', 'PR', 'PS', 'PX', 'RA', 'RC', 'RS', 'SC', 'TC', 'TL', 'UC', 'VT', 'ZA', 'ZC', 'ZD', 'ZJ', 'ZL', 'ZM', 'ZP', 'ZR', 'ZS', 'ZX', 'ZZ'];
  const parseActionCode = dcp_name => {
    const result = dcp_name.match('^(\\w+)');
    return result ? result[0] : null;
  };

  actions.forEach( action => { action.statuscode = action.statuscode_formatted });
  // actions.statuscode = actions['statuscode_formatted'];
  const filteredActions = actions.filter(
    action => {
      const actionCode = parseActionCode(action.dcp_name);
      return actionCode && filterActionCode.includes(actionCode)
    }
  );
  filteredActions.forEach( action => {
    action.actioncode = action.dcp_name.match('^(\\w+)')[0];
    action.dcp_name = action.dcp_name.match('-{1}\s*(.*)')[1];
    action.dcp_name = action.dcp_name.replace(/(^\s+|\s+$)/g, '');    //  remove space in front of dcp_name
  });

  return filteredActions;
};
const milestonesPostFetchEdits = (milestones, project) => {
  const milestonesHardcodeMap = {
    '963beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Borough Board Review',
      display_description: {
        'ULURP': 'The Borough Board has 30 days concurrent with the Borough President’s review period to review the application and issue a recommendation.'
      },
    },
    '943beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Borough President Review',
      display_description: {
        'ULURP': 'The Borough President has 30 days after the Community Board issues a recommendation to review the application and issue a recommendation.'
      },
    },
    '763beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'CEQR Fee Paid'
    },
    'a43beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'City Planning Commission Vote'
    },
    '863beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Draft Environmental Impact Statement Public Hearing'
    },
    '7c3beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Draft Scope of Work for Environmental Impact Statement Received',
      display_description: 'A Draft Scope of Work must be recieved 30 days prior to the Public Scoping Meeting.',
    },
    '7e3beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Environmental Impact Statement Public Scoping Meeting'
    },
    '883beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Final Environmental Impact Statement Submitted',
      display_description: 'A Final Environmental Impact Statement (FEIS) must be completed ten days prior to the City Planning Commission vote.',
    },
    '783beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Environmental Assessment Statement Filed'
    },
    'aa3beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Approval Letter Sent to Responsible Agency',
      display_description: {
        'Non-ULURP': 'For many non-ULURP actions this is the final action and record of the decision.'
      },
    },
    '823beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Final Scope of Work for Environmental Impact Statement Issued'
    },
    '663beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Land Use Application Filed'
    },
    '6a3beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Land Use Fee Paid'
    },
    'a83beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Mayoral Review',
      display_description: {
        'ULURP': 'The Mayor has five days to review the City Councils decision and issue a veto.'
      },
    },
    '843beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Draft Environmental Impact Statement Completed',
      display_description: 'A Draft Environmental Impact Statement must be completed prior to the City Planning Commission certifying or referring a project for public review.',
    },
    '780593bb-ecc2-e811-8156-1458d04d0698': {
      display_name: 'CPC Review of Council Modification}',
      display_sequence: 58
    },

    'a63beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'City Council Review',
      display_description: {
        'ULURP': 'The City Council has 50 days from receiving the City Planning Commission report to call up the application, hold a hearing and vote on the application.',
        'Non-ULURP': 'The City Council reviews text amendments and a few other non-ULURP items.'
      },
    },
    '923beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Community Board Review',
      display_description: {
        'ULURP': 'The Community Board has 60 days from the time of referral (nine days after certification) to hold a hearing and issue a recommendation.',
        'Non-ULURP': 'The City Planning Commission refers to the Community Board for 30, 45 or 60 days.'
      },
    },
    '9e3beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'City Planning Commission Review',
      display_description: {
        'ULURP': 'The City Planning Commission has 60 days after the Borough President issues a recommendation to hold a hearing and vote on an application.',
        'Non-ULURP': 'The City Planning Commission does not have a clock for non-ULURP items. It may or may not hold a hearing depending on the action.'
      },
    },
    '8e3beec4-dad0-e711-8116-1458d04e2fb8': {
      display_name: 'Application Reviewed at City Planning Commission Review Session',
      display_description: {
        'ULURP': 'A "Review Session" milestone signifies that the application has been sent to the City Planning Commission (CPC) and is ready for review. The "Review" milestone represents the period of time (up to 60 days) that the CPC reviews the application before their vote.',
        'Non-ULURP': 'A "Review Session" milestone signifies that the application has been sent to the City Planning Commission and is ready for review. The City Planning Commission does not have a clock for non-ULURP items. It may or may not hold a hearing depending on the action.'
      },
    },
  };
  const filter_dcpName_allowed = ['Borough Board Referral', 'Borough President Referral', 'Prepare CEQR Fee Payment', 'City Council Review', 'Community Board Referral', 'CPC Public Meeting - Public Hearing', 'CPC Public Meeting - Vote', 'DEIS Public Hearing Held', 'Review Filed EAS and EIS Draft Scope of Work', 'DEIS Public Scoping Meeting', 'Prepare and Review FEIS', 'Review Filed EAS', 'Final Letter Sent', 'Issue Final Scope of Work', 'Prepare Filed Land Use Application', 'Prepare Filed Land Use Fee Payment', 'Mayoral Veto', 'DEIS Notice of Completion Issued', 'Review Session - Certified / Referred', 'CPC Review of Modification Scope'];

  milestones.forEach( milestone => {
    milestone['milestonename'] = milestone['_dcp_milestone_value_formatted'];
    milestone['dcp_plannedstartdate'] = milestone.dcp_plannedstartdate;
    milestone['dcp_plannedcompletiondate'] = milestone.dcp_plannedcompletiondate;
    milestone['dcp_actualstartdate'] = milestone.dcp_actualstartdate;
    milestone['dcp_actualenddate'] = milestone.dcp_actualenddate;
    milestone['statuscode'] = milestone['statuscode_formatted'];
    milestone['zap_id'] = milestone._dcp_milestone_value;
    milestone['dcp_milestonesequence'] = milestone.dcp_milestonesequence;

    if(milestone._dcp_milestone_value in milestonesHardcodeMap){

      //  display_sequence
      if(milestonesHardcodeMap[milestone._dcp_milestone_value]['display_sequence'])
        milestone['display_sequence'] = milestonesHardcodeMap[milestone._dcp_milestone_value]['display_sequence'];
      else
        milestone['display_sequence'] = milestone['ac.dcp_sequence'];

      //  display_name
      if(milestonesHardcodeMap[milestone._dcp_milestone_value]['display_name'])
        milestone['display_name'] = milestonesHardcodeMap[milestone._dcp_milestone_value]['display_name'];

      //  display_date
      const filter_immediateAssign = ['763beec4-dad0-e711-8116-1458d04e2fb8', '783beec4-dad0-e711-8116-1458d04e2fb8', '663beec4-dad0-e711-8116-1458d04e2fb8', '6a3beec4-dad0-e711-8116-1458d04e2fb8', '780593bb-ecc2-e811-8156-1458d04d0698'];
      if(filter_immediateAssign.includes(milestone._dcp_milestone_value)){
        if(milestone._dcp_milestone_value === '783beec4-dad0-e711-8116-1458d04e2fb8')
          milestone['display_date'] = milestone.dcp_actualstartdate;
        else
          milestone['display_date'] = milestone.dcp_actualenddate;
      }
      else if(project['dcp_publicstatus_formatted'] === 'Filed'){
        const filter_useEndDates = ['a43beec4-dad0-e711-8116-1458d04e2fb8', '863beec4-dad0-e711-8116-1458d04e2fb8', '7e3beec4-dad0-e711-8116-1458d04e2fb8', 'aa3beec4-dad0-e711-8116-1458d04e2fb8', '823beec4-dad0-e711-8116-1458d04e2fb8', '843beec4-dad0-e711-8116-1458d04e2fb8', '8e3beec4-dad0-e711-8116-1458d04e2fb8'];
        if(milestone._dcp_milestone_value in filter_useEndDates)
          milestone['display_date'] = milestone.dcp_actualenddate;
        else
          milestone['display_date'] = milestone.dcp_actualstartdate;
      }

      //  display_date_2
      const filter_assignNull = ['763beec4-dad0-e711-8116-1458d04e2fb8', 'a43beec4-dad0-e711-8116-1458d04e2fb8', '863beec4-dad0-e711-8116-1458d04e2fb8', '7c3beec4-dad0-e711-8116-1458d04e2fb8', '7e3beec4-dad0-e711-8116-1458d04e2fb8', '883beec4-dad0-e711-8116-1458d04e2fb8', '783beec4-dad0-e711-8116-1458d04e2fb8', 'aa3beec4-dad0-e711-8116-1458d04e2fb8', '823beec4-dad0-e711-8116-1458d04e2fb8', '663beec4-dad0-e711-8116-1458d04e2fb8', '6a3beec4-dad0-e711-8116-1458d04e2fb8', '843beec4-dad0-e711-8116-1458d04e2fb8', '8e3beec4-dad0-e711-8116-1458d04e2fb8', '780593bb-ecc2-e811-8156-1458d04d0698'];
      if(filter_assignNull.includes(milestone._dcp_milestone_value))
        milestone['display_date_2'] = null;
      else if(project['dcp_publicstatus_formatted'] === 'Filed'){
        if(milestone.dcp_actualenddate)
          milestone['display_date_2'] = milestone.dcp_actualenddate;
        else if(milestone.dcp_plannedcompletiondate)
          milestone['display_date_2'] = milestone.dcp_plannedcompletiondate;
        else
          milestone['display_date_2'] = null;
      }

      //  display_description
      if(milestonesHardcodeMap[milestone._dcp_milestone_value]['display_description']) {
        const filter_immediateAssign = ['7c3beec4-dad0-e711-8116-1458d04e2fb8', '883beec4-dad0-e711-8116-1458d04e2fb8', '843beec4-dad0-e711-8116-1458d04e2fb8'];
        if(milestone._dcp_milestone_value in filter_immediateAssign)
          milestone['display_description'] = milestonesHardcodeMap[milestone._dcp_milestone_value]['display_description'];
        else if(project['dcp_ulurp_nonulurp_formatted'] === 'ULURP')
          milestone['display_description'] = milestonesHardcodeMap[milestone._dcp_milestone_value]['display_description']['ULURP'];
        else if(project['dcp_ulurp_nonulurp_formatted'] === 'Non-ULURP')
          milestone['display_description'] = milestonesHardcodeMap[milestone._dcp_milestone_value]['display_description']['Non-ULURP'];
      }
    }
  });

  return milestones.filter(milestone => filter_dcpName_allowed.includes(milestone.milestonename));
};
const keywordsPostFetchEdits = keywords => {
  return keywords.map( keyword => keyword['_dcp_keyword_value_formatted']);
};
const applicantTeamPostFetchEdits = applicantTeams => {
  const acceptedApplicantRoles = ['Applicant', 'Co-Applicant'];

  applicantTeams.forEach( applicantTeam => {
    applicantTeam.role = applicantTeam.dcp_applicantrole_formatted;
    applicantTeam.name = applicantTeam._dcp_applicant_customer_value_formatted;
  });

  return applicantTeams.filter( applicantTeam => acceptedApplicantRoles.includes(applicantTeam.dcp_applicantrole_formatted));
};

module.exports = {
  projectsPostFetchEdits,
  projectPostFetchEdits,
  getEntity
};
