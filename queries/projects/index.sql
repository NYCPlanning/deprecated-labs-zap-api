SELECT
  dcp_name,
  dcp_projectname,
  dcp_projectbrief,
  dcp_certifiedreferred,
  dcp_projectid,
  cast(count(dcp_projectid) OVER() as integer) as total_projects
FROM dcp_project p
WHERE dcp_validatedcommunitydistricts ILIKE '%${communityDistrict:value}%'
  AND coalesce(dcp_publicstatus, 'Unknown') IN (${dcp_publicstatus:csv})
  AND coalesce(dcp_ceqrtype, 'Unknown') IN (${dcp_ceqrtype:csv})
  AND coalesce(dcp_ulurp_nonulurp, 'Unknown') IN (${dcp_ulurp_nonulurp:csv})
  AND dcp_publicstatus IS NOT NULL -- Anything with a null public status is excluded
ORDER BY dcp_name DESC
${paginate^}
