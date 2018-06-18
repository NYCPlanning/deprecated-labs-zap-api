SELECT 
  dcp_name,
  dcp_projectname,
  dcp_projectbrief,
  dcp_certifiedreferred,
  dcp_projectid,
  count(dcp_projectid) OVER() as total_projects
FROM dcp_project p
WHERE dcp_validatedcommunitydistricts ILIKE '%${communityDistrict:value}%' 
  AND coalesce(dcp_publicstatus, 'Unknown') IN (${dcp_publicstatus:csv})
ORDER BY dcp_name DESC
${paginate^}
