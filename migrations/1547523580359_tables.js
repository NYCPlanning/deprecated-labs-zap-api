exports.up = (pgm) => {
  pgm.createTable('project_geoms', {
    projectid: {
      type: 'varchar(10)',
      notNull: true,
      unique: true,
      primaryKey: true,

    },
    centroid: { type: 'geometry(point)' },
    polygons: { type: 'geometry(multipolygon)' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    mappluto_v: {
      type: 'text',
    },
  });

  pgm.createFunction(
    'trigger_set_timestamp',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
    `,
  );

  pgm.createTrigger(
    'project_geoms',
    'set_timestamp',
    {
      when: 'before',
      operation: 'update',
      function: 'trigger_set_timestamp',
      level: 'ROW',
    },
  );
};
