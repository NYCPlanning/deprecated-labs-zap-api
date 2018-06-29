SELECT
  ${standardColumns^}
FROM normalized_projects p
LEFT JOIN project_centroids c
  ON p.dcp_name = c.projectid
WHERE coalesce(dcp_publicstatus_simp, 'Unknown') IN (${dcp_publicstatus:csv})
  AND coalesce(dcp_ceqrtype, 'Unknown') IN (${dcp_ceqrtype:csv})
  AND coalesce(dcp_ulurp_nonulurp, 'Unknown') IN (${dcp_ulurp_nonulurp:csv})
  AND coalesce(dcp_ulurp_nonulurp, 'Unknown') IN (${dcp_ulurp_nonulurp:csv})
  AND dcp_visibility = 'General Public'
  ${dcp_femafloodzonevQuery^}
  ${dcp_femafloodzonecoastalaQuery^}
  ${dcp_femafloodzoneaQuery^}
  ${dcp_femafloodzoneshadedxQuery^}
  ${communityDistrictsQuery^}
  ${boroughsQuery^}
  ${actionTypesQuery^}
  ${textQuery^}
  ${blockQuery^}
ORDER BY dcp_name DESC
${paginate^}
