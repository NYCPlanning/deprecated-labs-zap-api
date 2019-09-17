exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createIndex(
    'contact',
    'contactid',
    {
      name: 'contactid_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'contact',
    'emailaddress1',
    {
      name: 'emailaddress1_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_project',
    'dcp_projectid',
    {
      name: 'dcp_projectid_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_projectmilestone',
    'dcp_project',
    {
      name: 'dcp_project_milestone_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_projectmilestone',
    'dcp_milestone',
    {
      name: 'dcp_milestone_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_projectaction',
    'dcp_project',
    {
      name: 'dcp_project_action_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_projectaction',
    'dcp_action',
    {
      name: 'dcp_action_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_projectaction',
    'dcp_ulurpnumber',
    {
      name: 'dcp_ulurpnumber_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_communityboarddisposition',
    'dcp_communityboarddispositionid',
    {
      name: 'dcp_communityboarddispositionid_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_communityboarddisposition',
    'dcp_project',
    {
      name: 'dcp_project_disposition_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_communityboarddisposition',
    'dcp_projectaction',
    {
      name: 'dcp_projectaction_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_communityboarddisposition',
    'dcp_recommendationsubmittedby',
    {
      name: 'dcp_recommendationsubmittedby_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_projectlupteam',
    'dcp_lupteammemberrole',
    {
      name: 'dcp_lupteammemberrole_idx',
      method: 'btree',
    },
  );

  pgm.createIndex(
    'dcp_projectlupteam',
    'dcp_lupteammember',
    {
      name: 'dcp_lupteammember_idx',
      method: 'btree',
    },
  );
};
