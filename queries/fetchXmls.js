/*eslint-disable */

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
        } = queryParams;

        let filters ='';
            if(dcp_femafloodzonea) filters += `<condition attribute="dcp_femafloodzonea" operator="eq" value="true" />`;
            if(dcp_femafloodzonecoastala) filters += `<condition attribute="dcp_femafloodzonecoastala" operator="eq" value="true" />`;
            if(dcp_femafloodzoneshadedx) filters += `<condition attribute="dcp_femafloodzoneshadedx" operator="eq" value="true" />`;
            if(dcp_femafloodzonev) filters += `<condition attribute="dcp_femafloodzonev" operator="eq" value="true" />`;

            if(filters !== '') filters = `<filter type="and">${filters}</filter>`;

        //  for reference

        // const certDateQuery = (!!dcp_certifiedreferred[0] && !!dcp_certifiedreferred[1]) ? pgp.as.format('AND dcp_certifiedreferred BETWEEN to_timestamp($1) AND to_timestamp($2)', dcp_certifiedreferred) : '';
        // const communityDistrictsQuery = communityDistricts[0] ? pgp.as.format('AND dcp_communitydistricts ilike any (array[$1:csv])', [communityDistricts.map(district => `%${district}%`)]) : '';
        // const boroughsQuery = boroughs[0] ? pgp.as.format('AND dcp_borough ilike any (array[$1:csv])', [boroughs.map(borough => `%${borough}%`)]) : '';
        // const actionTypesQuery = actionTypes[0] ? pgp.as.format('AND actiontypes ilike any (array[$1:csv])', [actionTypes.map(actionType => `%${actionType}%`)]) : '';
        // const projectApplicantTextQuery = project_applicant_text ? pgp.as.format("AND ((dcp_projectbrief ilike '%$1:value%') OR (p.dcp_projectname ilike '%$1:value%') OR (applicants ilike '%$1:value%') OR (ulurpnumbers ILIKE '%$1:value%') OR (dcp_ceqrnumber ILIKE '%$1:value%') OR (bbls ILIKE '%$1:value%') OR (keywords ILIKE '%$1:value%'))", [project_applicant_text]) : '';
        // const blockQuery = block ? pgp.as.format("AND (blocks ilike '%$1:value%')", [block]) : '';

        return [
            `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false" page="${50}" count="${itemsPerPage}">`,
                `<entity name="dcp_project">`,
                    `<attribute name="dcp_name"/>`,
                    `<attribute name="dcp_ceqrnumber"/>`,
                    `<attribute name="dcp_ceqrtype"/>`,
                    `<attribute name="dcp_projectname"/>`,
                    `<attribute name="dcp_projectbrief"/>`,
                    `<attribute name="dcp_borough"/>`,
                    `<attribute name="dcp_ulurp_nonulurp"/>`,
                    `<attribute name="dcp_communitydistricts"/>`,

                    // actiontypes

                    `<attribute name="dcp_certifiedreferred"/>`,
                    `<attribute name="dcp_femafloodzonea"/>`,
                    `<attribute name="dcp_femafloodzonecoastala"/>`,
                    `<attribute name="dcp_femafloodzoneshadedx"/>`,
                    `<attribute name="dcp_femafloodzonev"/>`,
                    //  applicants
                    //  lastmilestonedate
                    //  count of projectid as total projects
                    //  centroid
                    //  center
                    //  ulurpnumbers
                    `<link-entity name="dcp_projectaction" from="dcp_project" to="dcp_projectid" link-type="outer" alias="ag"/>`,
                    `<link-entity name="dcp_projectmilestone" from="dcp_project" to="dcp_projectid" link-type="outer" alias="ah">`,
                        `<link-entity name="dcp_milestone" from="dcp_milestoneid" to="dcp_milestone" link-type="outer" alias="ai"/>`,
                    `</link-entity>`,
                    filters,    //  filters is string with all filter condition tags
                `</entity>`,
            `</fetch>`
        ].join('')
    },
//`<condition attribute="statuscode" operator="ne" value="${overridden}" />`,
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
                      `<condition attribute="dcp_name" operator="eq" value="${projectName}" />`,
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

                    // `<attribute name="dcp_nextlumilestone" />`,
                    // `<attribute name="dcp_nextceqrmilestone" />`,
                    // `<attribute name="statecode" />`,
                    // `<attribute name="dcp_actualduration" />`,
                    // `<attribute name="dcp_milestonetype" />`,
                    // `<attribute name="dcp_project" />`,
                    // `<attribute name="ownerid" />`,
                    // `<attribute name="dcp_projectmilestoneid" />`,
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
    ].join(''),
};


//  name value for testing
//  projectname => P1984Y0176    OR     P2013K0364
//  projectID => d850d35b-1433-e811-812a-1458d04d06c8
