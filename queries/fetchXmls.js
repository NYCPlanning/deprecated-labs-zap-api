/*eslint-disable */

const crmWebAPI = require('../utils/crmWebAPI');

module.exports = {

    fetchProjects: (queryParams, page=1, itemsPerPage=30) => {
        const {
            // filters
            'community-districts': communityDistricts = [],
            'action-types': actionTypes = [],
            boroughs = [],
            dcp_ceqrtype = ['Type I', 'Type II', 'Unlisted', 'Unknown'],
            dcp_ulurp_nonulurp = ['ULURP', 'Non-ULURP'],
            dcp_femafloodzonev = false,
            dcp_femafloodzonecoastala = false,
            dcp_femafloodzonea = false,
            dcp_femafloodzoneshadedx = false,
            dcp_publicstatus = ['Completed', 'Filed', 'In Public Review', 'Unknown'],
            dcp_certifiedreferred = [],
            project_applicant_text = '',
            block = '',
            distance_from_point = [],
            radius_from_point = 10,
            applicant_name = '',
            ulurp_number = ''
        } = queryParams;

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //  Set project filters
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        let linkFilters = '';
        let projectFilters ='';
            if(dcp_femafloodzonea) projectFilters += `<condition attribute="dcp_femafloodzonea" operator="eq" value="true" />`;
            if(dcp_femafloodzonecoastala) projectFilters += `<condition attribute="dcp_femafloodzonecoastala" operator="eq" value="true" />`;
            if(dcp_femafloodzoneshadedx) projectFilters += `<condition attribute="dcp_femafloodzoneshadedx" operator="eq" value="true" />`;
            if(dcp_femafloodzonev) projectFilters += `<condition attribute="dcp_femafloodzonev" operator="eq" value="true" />`;

            if(dcp_certifiedreferred.length > 0) {
                const d1 = new Date(dcp_certifiedreferred[0] * 1000);
                const d2 = new Date(dcp_certifiedreferred[1] * 1000);
                projectFilters += `<condition attribute="dcp_certifiedreferred" operator="ge" value="${d1.toISOString()}" />`;
                projectFilters += `<condition attribute="dcp_certifiedreferred" operator="le" value="${d2.toISOString()}" />`;
            }

            if(communityDistricts.length > 0){
                projectFilters += `<filter type="or">`;
                communityDistricts.forEach( cd => projectFilters += `<condition attribute="dcp_communitydistricts" operator="like" value="${escapeFetchParam("%" + cd + "%")}" />`);
                projectFilters += `</filter>`;
            }

            if(boroughs.length > 0){
                const boroughOptions = {
                    'Bronx': 717170000,
                    'Brooklyn': 717170002,
                    'Manhattan': 717170001,
                    'Queens': 717170003,
                    'Staten Island': 717170004,
                    'Citywide': 717170005
                };
                projectFilters += `<filter type="or">`;
                boroughs.forEach( borough => projectFilters += `<condition attribute="dcp_borough" operator="eq" value="${boroughOptions[borough]}" />`);
                projectFilters += `</filter>`;
            }

        if(block){
            linkFilters += `<link-entity name="dcp_projectbbl" from="dcp_project" to="dcp_projectid" link-type="inner" alias="ad">`;
            linkFilters += `<filter type="and">`;
            linkFilters += `<condition attribute="dcp_validatedblock" operator="like" value="${escapeFetchParam("%" + block + "%")}"/>`;
            linkFilters += `</filter>`;
            linkFilters += `</link-entity>`;
        }

        if(project_applicant_text){
            projectFilters += `<filter type="or">`;
            projectFilters += `<condition attribute="dcp_projectbrief" operator="like" value="${escapeFetchParam("%" + project_applicant_text + "%")}"/>`;
            projectFilters += `<condition attribute="dcp_projectname" operator="like" value="${escapeFetchParam("%" + project_applicant_text + "%")}"/>`;
            projectFilters += `<condition attribute="dcp_ceqrnumber" operator="like" value="${escapeFetchParam("%" + project_applicant_text + "%")}"/>`;
            projectFilters += `</filter>`; //   todo: applicants, ulurpnumbers, bbls, keywords
        }

        if(actionTypes.length > 0 || ulurp_number){
            linkFilters += `<link-entity name="dcp_projectaction" from="dcp_project" to="dcp_projectid" link-type="inner" alias="ae">`;
            if(ulurp_number) {
                linkFilters += `<filter type="and">`;
                linkFilters += `<condition attribute="dcp_ulurpnumber" operator="like" value="${escapeFetchParam("%"+ ulurp_number + "%")}"/>`;
                linkFilters += `</filter>`;
            }
            if(actionTypes.length > 0){
                linkFilters += `<link-entity name="dcp_action" from="dcp_actionid" to="dcp_action" link-type="inner" alias="at">`;
                linkFilters += `<filter type="and">`;
                actionTypes.forEach( action => linkFilters += `<condition attribute="dcp_name" operator="eq" value="${escapeFetchParam(action)}"/>`);
                linkFilters += `</filter>`;
                linkFilters += `</link-entity>`;
            }
            linkFilters += `</link-entity>`;
        }

        if(dcp_ulurp_nonulurp.length > 0){
            const ulurpOptions = {
                'ULURP': 717170000,
                'Non-ULURP': 717170001
            };
            projectFilters += `<condition attribute="dcp_ulurp_nonulurp" operator="in">`;
            dcp_ulurp_nonulurp.forEach( ulurp => projectFilters += `<value>${ulurpOptions[ulurp]}</value>`);
            projectFilters += `</condition>`;
        }

        if(dcp_publicstatus.length > 0){
            const statusOptions = {
                'Filed': 717170000,
                'Certified': 717170001,
                'Approved': 717170002,
                'Withdrawn': 717170003
            };
            const unknownIndex = dcp_publicstatus.indexOf('Unknown');
            projectFilters += `<filter type="or">`;
            if(unknownIndex >= 0){
                dcp_publicstatus.splice(unknownIndex,1);
                let knownStatuses = [];
                if(dcp_publicstatus.indexOf('Filed') === -1) knownStatuses.push(statusOptions['Filed']);
                if(dcp_publicstatus.indexOf('In Public Review') === -1) knownStatuses.push(statusOptions['Certified']);
                if(dcp_publicstatus.indexOf('Completed') === -1) {
                    knownStatuses.push(statusOptions['Approved']);
                    knownStatuses.push(statusOptions['Withdrawn']);
                }
                if(knownStatuses.length > 0){
                    projectFilters += `<condition attribute="dcp_publicstatus" operator="not-in">`;
                    knownStatuses.forEach( status => projectFilters += `<value>${status}</value>`);
                    projectFilters += `</condition>`;
                }
            }
            if(dcp_publicstatus.length > 0){
                projectFilters += `<condition attribute="dcp_publicstatus" operator="in">`;
                dcp_publicstatus.forEach( status => {
                    if(status === 'Filed') projectFilters += `<value>${statusOptions['Filed']}</value>`;
                    else if(status === 'In Public Review') projectFilters += `<value>${statusOptions['Certified']}</value>`;
                    else if(status === 'Completed'){
                        projectFilters += `<value>${statusOptions['Approved']}</value>`;
                        projectFilters += `<value>${statusOptions['Withdrawn']}</value>`;
                    }
                });
                projectFilters += `</condition>`;
            }
            projectFilters += `</filter>`;
        }
        if(applicant_name){
            linkFilters += `<link-entity name="dcp_projectapplicant" from="dcp_project" to="dcp_projectid" link-type="inner" alias="an">`;
            linkFilters += `<link-entity name="account" from="accountid" to="dcp_applicant_customer" link-type="inner" alias="af">`;
            linkFilters += `<filter type="and">`;
            linkFilters += `<condition attribute="name" operator="like" value="${escapeFetchParam("%" + applicant_name + "%")}"/>`;
            linkFilters += `</filter>`;
            linkFilters += `</link-entity>`;
            linkFilters += `</link-entity>`;
        }

        return [
            `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false" page="${page}" count="${itemsPerPage}" returntotalrecordcount="true">`,
                `<entity name="dcp_project">`,
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
                    `<attribute name="dcp_femafloodzonea"/>`,
                    `<attribute name="dcp_femafloodzonecoastala"/>`,
                    `<attribute name="dcp_femafloodzoneshadedx"/>`,
                    `<attribute name="dcp_femafloodzonev"/>`,
                    `<filter type="and">`,
                        projectFilters,
                    `</filter>`,
                    linkFilters,
                `</entity>`,
            `</fetch>`
        ].join('')
    },

    fetchProject: (projectName) => {
      const general_public = '717170003';

      return [
          `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="true" top="1">`,
              `<entity name="dcp_project">`,
                  `<attribute name="dcp_name"/>`,
                  `<attribute name="dcp_projectid"/>`,
                  `<attribute name="dcp_projectname"/>`,
                  `<attribute name="dcp_projectbrief"/>`,
                  `<attribute name="dcp_borough"/>`,
                  `<attribute name="dcp_communitydistricts"/>`,
                  `<attribute name="dcp_ulurp_nonulurp"/>`,
                  `<attribute name="dcp_leaddivision"/>`,
                  `<attribute name="dcp_ceqrtype"/>`,
                  `<attribute name="dcp_ceqrnumber"/>`,
                  `<attribute name="dcp_easeis"/>`,
                  `<attribute name="dcp_leadagencyforenvreview"/>`,
                  `<attribute name="dcp_alterationmapnumber"/>`,
                  `<attribute name="dcp_sisubdivision"/>`,
                  `<attribute name="dcp_sischoolseat"/>`,
                  `<attribute name="dcp_previousactiononsite"/>`,
                  `<attribute name="dcp_wrpnumber"/>`,
                  `<attribute name="dcp_nydospermitnumber"/>`,
                  `<attribute name="dcp_bsanumber"/>`,
                  `<attribute name="dcp_lpcnumber"/>`,
                  `<attribute name="dcp_decpermitnumber"/>`,
                  `<attribute name="dcp_femafloodzonea"/>`,
                  `<attribute name="dcp_femafloodzonecoastala"/>`,
                  `<attribute name="dcp_femafloodzonev"/>`,
                  `<attribute name="dcp_publicstatus"/>`,
                  `<attribute name="dcp_currentmilestone"/>`,
                  `<filter type="and">`,
                      `<condition attribute="dcp_name" operator="eq" value="${escapeFetchParam(projectName)}" />`,
                      `<condition attribute="dcp_visibility" operator="eq" value="${general_public}" />`,
                  `</filter>`,
              `</entity>`,
          `</fetch>`
        ].join('')
    },

    fetchBBL: (projectID) => [
        `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
            `<entity name="dcp_projectbbl">`,
                `<attribute name="dcp_bblnumber" />`,
                `<filter type="and">`,
                    `<condition attribute="dcp_project" operator="eq" value="${projectID}" />`,
                    `<condition attribute="dcp_bblnumber" operator="not-null" />`,
                    `<condition attribute="statuscode" operator="eq" value="1"/>`,
                `</filter>`,
            `</entity>`,
        `</fetch>`,
    ].join(''),

    fetchBBLForProjects: (projectIDs) => {
        let projectFilter = '';
        projectIDs.forEach( projectID => projectFilter += `<value>{${projectID}}</value>`);

        return [
            `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
                `<entity name="dcp_projectbbl">`,
                    `<attribute name="dcp_project" alias="projectid" />`,
                    `<attribute name="dcp_validatedblock" alias="blocks"/>`,
                    `<filter type="and">`,
                        `<condition attribute="dcp_project" operator="in">`,
                            projectFilter,
                        `</condition>`,
                    `</filter>`,
                `</entity>`,
            `</fetch>`
        ].join('')
    },

    fetchAction: (projectID) => {
        const mistake = '717170003';

        return [
            `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
                `<entity name="dcp_projectaction">`,
                    `<attribute name="dcp_name" />`,
                    `<attribute name="dcp_ulurpnumber" />`,
                    `<attribute name="dcp_prefix" />`,
                    `<attribute name="statuscode" />`,
                    `<attribute name="dcp_ccresolutionnumber" />`,
                    `<attribute name="dcp_zoningresolution" />`,
                    `<filter type="and">`,
                        `<condition attribute="dcp_project" operator="eq" value="${projectID}" />`,
                        `<condition attribute="statuscode" operator="ne" value="${mistake}" />`,
                    `</filter>`,
                    `<link-entity name="dcp_zoningresolution" from="dcp_zoningresolutionid" to="dcp_zoningresolution" alias="a" link-type="outer" >`,
                        `<attribute name="dcp_zoningresolution"/>`,
                    `</link-entity>`,
                `</entity>`,
            `</fetch>`
        ].join('')
    },

    fetchActionForProjects: (projectIDs) => {
        const mistake = '717170003';

        let projectFilter = '';
        projectIDs.forEach( projectID => projectFilter += `<value>{${projectID}}</value>`);

        return[
            `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
                `<entity name="dcp_projectaction">`,
                    `<attribute name="dcp_project" alias="projectid" />`,
                    `<attribute name="dcp_action"/>`,
                    `<attribute name="dcp_ulurpnumber"/>`,
                    `<filter type="and">`,
                        `<condition attribute="dcp_project" operator="in">`,
                            projectFilter,
                        `</condition>`,
                        `<condition attribute="statuscode" operator="ne" value="${mistake}" />`,
                    `</filter>`,
                    `<link-entity name="dcp_action" from="dcp_actionid" to="dcp_action" link-type="inner" alias="aa">`,
                        `<attribute name="dcp_name" alias="action_code"/>`,
                    `</link-entity>`,
                `</entity>`,
            `</fetch>`
        ].join('')
    },

    fetchMilestone: (projectID) => {
        const overridden = '717170001';

        return [
            `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
                `<entity name="dcp_projectmilestone">`,
                    `<attribute name="dcp_name"/>`,
                    `<attribute name="dcp_milestone" />`,
                    `<attribute name="dcp_plannedstartdate" />`,
                    `<attribute name="dcp_plannedcompletiondate" />`,
                    `<attribute name="dcp_actualstartdate" />`,
                    `<attribute name="dcp_actualenddate" />`,
                    `<attribute name="statuscode" />`,
                    `<attribute name="dcp_goalduration" />`,
                    `<attribute name="dcp_milestonesequence" />`,
                    `<link-entity name="dcp_milestone" from="dcp_milestoneid" to="dcp_milestone" link-type="outer" alias="ac" >`,
                        `<attribute name="dcp_sequence" />`,
                    `</link-entity>`,
                    `<link-entity name="dcp_milestoneoutcome" from="dcp_milestoneoutcomeid" to="dcp_milestoneoutcome" link-type="outer" alias="ad" >`,
                        `<attribute name="dcp_outcome" />`,
                    `</link-entity>`,
                    `<filter type="and">`,
                        `<condition attribute="dcp_project" operator="eq" value="${projectID}" />`,
                        `<condition attribute="statuscode" operator="ne" value="${overridden}" />`,
                    `</filter>`,
                `</entity>`,
            `</fetch>`
        ].join('')
    },

    fetchMilestoneForProjects: (projectIDs) => {
        const overridden = '717170001';
        let projectFilter = '';
        projectIDs.forEach( projectID => projectFilter += `<value>{${projectID}}</value>`);

        return [
            `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false" aggregate="true">`,
            `<entity name="dcp_projectmilestone">`,
            `<attribute name="dcp_project" alias="projectid" groupby="true"/>`,
            `<attribute name="dcp_actualenddate" alias="actualenddate" aggregate="max"/>`,
            `<filter type="and">`,
            `<condition attribute="dcp_project" operator="in">`,
                projectFilter,
            `</condition>`,
            `</filter>`,
            `<link-entity name="dcp_milestone" from="dcp_milestoneid" to="dcp_milestone" link-type="inner" alias="al">`,
                `<filter type="and">`,
                `<condition attribute="statuscode" operator="ne" value="${overridden}" />`,
                    `<filter type="or">`,
                    `<condition attribute="dcp_name" operator="eq" value="Land Use Fee Payment" />`,
                    `<condition attribute="dcp_name" operator="eq" value='Land Use Application Filed Review' />`,
                    `<condition attribute="dcp_name" operator="eq" value='CEQR Fee Payment' />`,
                    `<condition attribute="dcp_name" operator="eq" value='Filed EAS Review' />`,
                    `<condition attribute="dcp_name" operator="eq" value='EIS Draft Scope Review' />`,
                    `<condition attribute="dcp_name" operator="eq" value='EIS Public Scoping Meeting' />`,
                    `<condition attribute="dcp_name" operator="eq" value='Final Scope of Work Issued' />`,
                    `<condition attribute="dcp_name" operator="eq" value='NOC of Draft EIS Issued' />`,
                    `<condition attribute="dcp_name" operator="eq" value='DEIS Public Hearing Held' />`,
                    `<condition attribute="dcp_name" operator="eq" value='Review Session - Certified / Referred' />`,
                    `<condition attribute="dcp_name" operator="eq" value='Community Board Referral' />`,
                    `<condition attribute="dcp_name" operator="eq" value='Borough President Referral' />`,
                    `<condition attribute="dcp_name" operator="eq" value='Borough Board Referral' />`,
                    `<condition attribute="dcp_name" operator="eq" value='CPC Public Meeting - Vote' />`,
                    `<condition attribute="dcp_name" operator="eq" value='CPC Public Meeting - Public Hearing' />`,
                    `<condition attribute="dcp_name" operator="eq" value='City Council Review' />`,
                    `<condition attribute="dcp_name" operator="eq" value='Mayoral Veto' />`,
                    `<condition attribute="dcp_name" operator="eq" value='Final Letter Sent' />`,
                    `</filter>`,
                `</filter>`,
            `</link-entity>`,
            `</entity>`,
            `</fetch>`
        ].join('')
    },

    fetchKeywords: (projectID) => {
        const active = '0';

        return [
            `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
                `<entity name="dcp_projectkeywords">`,
                    `<attribute name="dcp_keyword" />`,
                    `<link-entity name="dcp_keyword" from="dcp_keywordid" to="dcp_keyword" link-type="outer" alias="ab" />`,
                    `<filter type="and">`,
                        `<condition attribute="dcp_project" operator="eq" value="${projectID}" />`,
                        `<condition attribute="statecode" operator="eq" value="${active}" />`,
                    `</filter>`,
                `</entity>`,
            `</fetch>`
        ].join('')
    },

    fetchApplicantTeam: (projectID) => [
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
        `<entity name="dcp_projectapplicant">`,
            `<attribute name="dcp_applicantrole"/>`,
            `<attribute name="dcp_applicant_customer"/>`,
            `<link-entity name="account" from="accountid" to="dcp_applicant_customer" link-type="inner" alias="ab"/>`,
            `<filter type="and">`,
                `<condition attribute="dcp_project" operator="eq" value="${projectID}" />`,
                `<condition attribute="statecode" operator="eq" value="0"/>`,
            `</filter>`,
        `</entity>`,
    `</fetch>`
    ].join(''),

    fetchApplicantTeamForProjects: (projectIDs) => {
        let projectFilter = '';
        projectIDs.forEach( projectID => projectFilter += `<value>{${projectID}}</value>`);

        return [
            `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
                `<entity name="dcp_projectapplicant">`,
                `<attribute name="dcp_project" alias="projectid" />`,
                `<attribute name="dcp_applicant_customer" />`,
                    `<filter type="and">`,
                        `<condition attribute="dcp_project" operator="in">`,
                            projectFilter,
                        `</condition>`,
                    `</filter>`,
                    `<filter type="or">`,
                        `<condition attribute="dcp_applicantrole" operator="eq" value="717170002" />`,
                        `<condition attribute="dcp_applicantrole" operator="eq" value="717170000" />`,
                    `</filter>`,
                `</entity>`,
            `</fetch>`
        ].join('')
    },

    fetchAddress: (projectID) => [
        `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">`,
            `<entity name="dcp_projectaddress">`,
                `<attribute name="dcp_validatedaddressnumber" />`,
                `<attribute name="dcp_validatedstreet" />`,
                `<attribute name="statuscode" />`,
                `<filter type="and">`,
                    `<condition attribute="dcp_project" operator="eq" value="${projectID}" />`,
                    `<condition attribute="dcp_validatedaddressnumber" operator="not-null" />`,
                    `<condition attribute="dcp_validatedstreet" operator="not-null" />`,
                    `<condition attribute="statuscode" operator="eq" value="1"/>`,
                `</filter>`,
            `</entity>`,
        `</fetch>`
    ].join('')
};

const escapeFetchParam = str => encodeURIComponent(crmWebAPI.escape(str));
