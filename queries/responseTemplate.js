/*eslint-disable */

const postFetchEdits = require('../utils/postFetchEdits');

//  fillTemplate takes data and template, overwrites template with data,
//    and then filters out any properties that don't exist in template
const fillTemplate = (template, data) => {
    if(!Array.isArray(data)){
        return fillTemplate(template, [data])
    }

    // return data; // uncomment to get untemplated data

    return data.map(
        entity => {
            const templatedData = Object.assign({}, template, entity);

            Object.entries(templatedData).forEach( ([key]) => {
                if(!(key in template)) delete templatedData[key];
            });

            return templatedData;
        });
};

const fillProjectsTemplate = (data) => {
    return data.map(
      project =>
        Object.assign({},
          {
              type: 'projects',
              id: project.dcp_name,
              attributes: (fillTemplate(projectsTemplate, postFetchEdits.projectsPostFetchEdits(project)))[0]
          }
        ));
};

const projectsTemplate = {
    "dcp_name": null,
    "dcp_ceqrnumber": null,
    "dcp_ceqrtype": null,
    "dcp_projectname": null,
    "dcp_projectbrief": null,
    "dcp_publicstatus_simp": null,
    "dcp_borough": null,
    "dcp_ulurp_nonulurp": null,
    "dcp_communitydistricts": null,
    "actiontypes": null,
    "dcp_certifiedreferred": null,
    "dcp_femafloodzonea": null,
    "dcp_femafloodzonecoastala": null,
    "dcp_femafloodzoneshadedx": null,
    "dcp_femafloodzonev": null,
    "applicants": null,
    "lastmilestonedate": null,
    "total_projects": null,
    "has_centroid": null,
    "center": [],
    "ulurpnumbers": null
};

const projectTemplate = {
    "dcp_name": null,
    "dcp_projectid": null,
    "dcp_projectname": null,
    "dcp_projectbrief": null,
    "dcp_borough": null,
    "dcp_communitydistricts": null,
    "dcp_ulurp_nonulurp": null,
    "dcp_leaddivision": null,
    "dcp_ceqrtype": null,
    "dcp_ceqrnumber": null,
    "dcp_easeis": null,
    "dcp_leadagencyforenvreview": null,
    "dcp_alterationmapnumber": null,
    "dcp_sisubdivision": null,
    "dcp_sischoolseat": null,
    "dcp_previousactiononsite": null,
    "dcp_wrpnumber": null,
    "dcp_nydospermitnumber": null,
    "dcp_bsanumber": null,
    "dcp_lpcnumber": null,
    "dcp_decpermitnumber": null,
    "dcp_femafloodzonea": null,
    "dcp_femafloodzonecoastala": null,
    "dcp_femafloodzonev": null,
    "dcp_publicstatus_simp": null,
};
const actionTemplate = {
    "dcp_name": null,
    "actioncode": null,
    "dcp_ulurpnumber": null,
    "dcp_prefix": null,
    "statuscode": null,
    "dcp_ccresolutionnumber": null,
    "dcp_zoningresolution": null
};
const milestoneTemplate = {
    "dcp_name": null,
    "milestonename": null,
    "dcp_plannedstartdate": null,
    "dcp_plannedcompletiondate": null,
    "dcp_actualstartdate": null,
    "dcp_actualenddate": null,
    "statuscode": null,
    "outcome": null,
    "zap_id": null,
    "dcp_milestonesequence": null,
    "display_sequence": null,
    "display_name": null,
    "display_date": null,
    "display_date_2": null,
    "display_description": null
};
const addressTemplate = {
    "dcp_validatedaddressnumber": null,
    "dcp_validatedstreet": null
};
const applicantTeamTemplate = {
    "role": null,
    "name": null
};
const keywordsTemplate = {

};


module.exports = {
    projectsTemplate,
    projectTemplate,
    actionTemplate,
    milestoneTemplate,
    addressTemplate,
    applicantTeamTemplate,
    fillTemplate,
    fillProjectsTemplate
};
