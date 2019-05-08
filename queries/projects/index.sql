SELECT
  ${standardColumns^}
FROM normalized_projects p
LEFT JOIN project_geoms c
  ON p.dcp_name = c.projectid
WHERE coalesce(dcp_publicstatus_simp, 'Unknown') IN (${dcp_publicstatus:csv})
  AND coalesce(dcp_ulurp_nonulurp, 'Unknown') IN (${dcp_ulurp_nonulurp:csv})
  AND dcp_visibility = 'General Public'
  ${dcp_femafloodzonevQuery^}
  ${dcp_femafloodzonecoastalaQuery^}
  ${dcp_femafloodzoneaQuery^}
  ${dcp_femafloodzoneshadedxQuery^}
  ${certDateQuery^}
  ${communityDistrictsQuery^}
  ${boroughsQuery^}
  ${actionTypesQuery^}
  ${projectApplicantTextQuery^}
  ${radiusDistanceQuery^}
  ${blockQuery^}
ORDER BY lastmilestonedate DESC NULLS LAST,
CASE WHEN dcp_publicstatus_simp = 'In Public Review' then 1
      WHEN dcp_publicstatus_simp = 'Filed' then 2
      WHEN dcp_publicstatus_simp = 'Completed' then 3
            ELSE 4
        END ASC
${paginate^}
