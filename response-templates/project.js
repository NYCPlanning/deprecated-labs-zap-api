const projectTemplate = {
  fields: [
    'dcp_name',
    // 'dcp_projectid', // Not displayed but needed to join attributes from other tables
    'dcp_projectname',
    'dcp_projectbrief',
    'dcp_borough',
    'dcp_communitydistricts',
    'dcp_ulurp_nonulurp',
    // 'dcp_leaddivision', // Not being used
    'dcp_ceqrtype',
    'dcp_ceqrnumber',
    // 'dcp_easeis', // Not being used
    // 'dcp_leadagencyforenvreview', // Not being used
    // 'dcp_alterationmapnumber', // Not being used
    // 'dcp_sisubdivion', // Not being used
    // 'dcp_sischoolseat', // Not being used
    // 'dcp_previousactiononsite', // Not being used
    // 'dcp_wrpnumber', // Not being used
    // 'dcp_nydospermitnumber', // Not being used
    // 'dcp_bsanumber', // Not being used
    // 'dcp_lpcnumber', // Not being used
    // 'dcp_decpermitnumber', // Not being used
    'dcp_femafloodzonea', // I think this field isn't being populated anymore. Need to check.
    'dcp_femafloodzonecoastala', // I think this field isn't being populated anymore. Need to check.
    'dcp_femafloodzonev', // I think this field isn't being populated anymore. Need to check.
    'dcp_publicstatus_simp',
    'keywords',
    'bbls',
    'bbl_multipolygon',
    // 'bbl_featurecollection', // Not being used
  ],
  entities: ['actions', 'milestones', 'addresses', 'applicantteam'],
  entity_fields: {
    actions: [
      'dcp_name',
      // 'actioncode', // Not displayed
      // 'statuscode', // Not displayed
      'dcp_ulurpnumber',
      // 'dcp_prefix', // Not being used
      // 'dcp_ccresolutionnumber', // Not being used
      // 'dcp_zoningresolution', // Not being used
    ],
    milestones: [
      // 'dcp_name', // Not displayed
      // 'milestonename', // Not displayed
      // 'dcp_plannedstartdate', // Not displayed but used to calculate display_date and display_date_2
      // 'dcp_plannedcompletiondate', // Not displayed but used to calculate display_date and display_date_2
      // 'dcp_actualstartdate', // Not displayed but used to calculate display_date and display_date_2
      // 'dcp_actualenddate', // Not displayed but used to calculate display_date and display_date_2
      'statuscode',
      'outcome',
      // 'zap_id', // Not displayed but used to query for the milestones and recode the display_name
      // 'dcp_milstonesequence', // Not being used
      // 'display_sequence', // Not displayed but used to order the records
      'display_name',
      'display_date',
      'display_date_2', // Rename to display_date_end
      'display_description',
    ],
    addresses: [
      'dcp_validatedaddressnumber',
      'dcp_validatedstreet',
    ],
    applicantteam: [
      'role',
      'name',
    ],
  },
};

module.exports = projectTemplate;
