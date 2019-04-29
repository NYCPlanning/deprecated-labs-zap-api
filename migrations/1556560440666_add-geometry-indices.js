exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createIndex(
    'project_geoms',
    'geography(polygons)',
    {
      name: 'polygons_index',
      method: 'gist',
    },
  );

  pgm.createIndex(
    'project_geoms',
    'geography(centroid)',
    {
      name: 'centroid_index',
      method: 'gist',
    },
  );
};
