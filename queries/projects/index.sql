WITH normalized_projects AS (
  SELECT dcp_project.*,
    coalesce(account.name, 'Unknown Applicant') AS dcp_applicant,
    CASE
      WHEN dcp_project.dcp_publicstatus = 'Approved' THEN 'Complete'
      WHEN dcp_project.dcp_publicstatus = 'Withdrawn' THEN 'Complete'
      WHEN dcp_project.dcp_publicstatus = 'Certified' THEN 'In Public Review'
      ELSE dcp_project.dcp_publicstatus
    END AS dcp_publicstatus_simp,
    STRING_AGG(SUBSTRING(dcp_projectaction.dcp_name FROM '^(\w+)'), ';') AS actiontypes
  FROM dcp_project
  LEFT JOIN account
    ON dcp_project.dcp_applicant_customer = account.accountid
  INNER JOIN dcp_projectaction
    ON dcp_projectaction.dcp_project = dcp_project.dcp_projectid
  WHERE dcp_projectaction.statuscode <> 'Mistake'
  GROUP BY dcp_project.dcp_projectid, account.name, dcp_project.dcp_publicstatus
)

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
  ${actionTypesQuery^}
  ${textQuery^}
ORDER BY CASE WHEN dcp_publicstatus_simp = 'Filed' then 1
              WHEN dcp_publicstatus_simp = 'In Public Review' then 2
              WHEN dcp_publicstatus_simp = 'Complete' then 3
              ELSE 4
         END ASC, dcp_projectname ASC
${paginate^}
