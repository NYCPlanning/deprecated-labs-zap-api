const projectTemplate = {
  fields: [
    'dcp_name',
    'dcp_projectname',
    'dcp_projectbrief',
    'dcp_borough',
    'dcp_communitydistricts',
    'dcp_ulurp_nonulurp',
    'dcp_ceqrtype',
    'dcp_ceqrnumber',
    'dcp_femafloodzonea',
    'dcp_femafloodzonecoastala',
    'dcp_femafloodzonev',
    'dcp_publicstatus_simp',
    'keywords',
    'bbls',
    'bbl_multipolygon',
    'bbl_featurecollection',
  ],
  entities: ['actions', 'milestones', 'addresses', 'applicantteam'],
  entity_fields: {
    actions: [
      'dcp_name',
      'statuscode',
      'dcp_ulurpnumber',
    ],
    milestones: [
      'statuscode',
      'outcome',
      'display_name',
      'display_date',
      'display_date_2',
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
