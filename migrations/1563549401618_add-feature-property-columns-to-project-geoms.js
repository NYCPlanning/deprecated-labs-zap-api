exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns(
    'project_geoms',
    {
      projectname: { type: 'varchar(50)' },
      publicstatus_simp: { type: 'varchar(20)' },
      lastmilestonedate: { type: 'timestamp without time zone' },
    },
  );

  pgm.sql(`
    UPDATE project_geoms
    SET
      projectname = normalized_projects.dcp_projectname,
      publicstatus_simp = normalized_projects.dcp_publicstatus_simp,
      lastmilestonedate = normalized_projects.dcp_lastmilestonedate
    FROM normalized_projects
    WHERE project_geoms.projectid = normalized_projects.dcp_name
  `);
};
