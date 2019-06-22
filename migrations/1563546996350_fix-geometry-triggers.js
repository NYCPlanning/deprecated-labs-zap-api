exports.shorthands = undefined;

exports.up = (pgm) => {
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
        NEW.centroid_3857 = ST_Transform(NEW.centroid, 3857);
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
        NEW.polygons_3857 = ST_Transform(NEW.polygons, 3857);
        RETURN NEW;
      END;
    `,
  );
};
