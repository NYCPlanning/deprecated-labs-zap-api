exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('project_geoms', {
    centroid_3857: { type: 'geometry(point)' },
    polygons_3857: { type: 'geometry(multipolygon)' },
  });
  pgm.createIndex(
    'project_geoms',
    'centroid_3857',
    {
      name: 'centroid_3857_index',
      method: 'gist',
    },
  );
  pgm.createIndex(
    'project_geoms',
    'polygons_3857',
    {
      name: 'polygons_3857_index',
      method: 'gist',
    },
  );
  pgm.createFunction(
    'trigger_centroid_transform',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
      BEGIN
        NEW.centroid_3857 = ST_Transform(OLD.centroid, 3857);
        RETURN NEW;
      END;
    `,
  );
  pgm.createFunction(
    'trigger_polygons_transform',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
      BEGIN
        NEW.polygons_3857 = ST_Transform(OLD.polygons, 3857);
        RETURN NEW;
      END;
    `,
  );
  pgm.createTrigger('project_geoms', 'update_centroid_transform', {
    when: 'AFTER',
    operation: ['INSERT', 'UPDATE'],
    function: 'trigger_centroid_transform',
    level: 'ROW',
  });
  pgm.createTrigger('project_geoms', 'update_polygons_transform', {
    when: 'AFTER',
    operation: ['INSERT', 'UPDATE'],
    function: 'trigger_polygons_transform',
    level: 'ROW',
  });
  pgm.sql(`
    UPDATE project_geoms
    SET
      centroid_3857=ST_Transform(centroid, 3857),
      polygons_3857=ST_Transform(polygons, 3857)
  `);
};
