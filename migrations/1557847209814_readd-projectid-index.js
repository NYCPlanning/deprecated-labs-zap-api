exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createIndex(
    'normalized_projects',
    'dcp_name',
    {
      name: 'dcp_name_index',
      method: 'btree',
    },
  );
};
