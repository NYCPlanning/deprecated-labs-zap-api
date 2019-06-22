const dedupeList = require('../dedupe-list');

function flattenProjectsRows(projectsRows) {
  const projectIds = dedupeList(projectsRows.map(row => row.dcp_name));
  return projectIds.map((projectId) => {
    const bbls = dedupeList(
      projectsRows
        .filter(row => row.dcp_name === projectId)
        .map(row => row['bbls.dcp_bblnumber']),
    );

    return { projectId, bbls };
  });
}

module.exports = { flattenProjectsRows };
