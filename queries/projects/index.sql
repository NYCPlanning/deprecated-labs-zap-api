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
  ${projectApplicantTextQuery^}
  ${ulurpCeqrQuery^}
  ${blockQuery^}
ORDER BY CASE WHEN dcp_publicstatus_simp = 'In Public Review' then 1
              WHEN dcp_publicstatus_simp = 'Filed' then 2
              WHEN dcp_publicstatus_simp = 'Complete' then 3
              ELSE 4
         END ASC, dcp_projectname ASC
${paginate^}
