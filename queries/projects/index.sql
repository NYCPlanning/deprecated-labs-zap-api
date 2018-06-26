WITH normalized_projects AS (
  SELECT *,
    CASE
      WHEN dcp_project.dcp_publicstatus = 'Approved' THEN 'Complete'
      WHEN dcp_project.dcp_publicstatus = 'Withdrawn' THEN 'Complete'
      ELSE dcp_project.dcp_publicstatus
    END AS dcp_publicstatus_simp
  FROM dcp_project
)

SELECT
  dcp_name
  ${standardColumns^}
FROM normalized_projects p
LEFT JOIN project_centroids c
  ON p.dcp_name = c.projectid
WHERE coalesce(dcp_publicstatus_simp, 'Unknown') IN (${dcp_publicstatus:csv})
  AND coalesce(dcp_ceqrtype, 'Unknown') IN (${dcp_ceqrtype:csv})
  AND coalesce(dcp_ulurp_nonulurp, 'Unknown') IN (${dcp_ulurp_nonulurp:csv})
  AND coalesce(dcp_ulurp_nonulurp, 'Unknown') IN (${dcp_ulurp_nonulurp:csv})
  ${dcp_femafloodzoneaQuery^}
  ${dcp_femafloodzonecoastalaQuery^}
  ${dcp_femafloodzoneshadedxQuery^}
  ${dcp_femafloodzonevQuery^}
  AND dcp_visibility = 'General Public'
  ${communityDistrictsQuery^}
ORDER BY dcp_name DESC
${paginate^}
