SELECT 
  dcp_name,
  dcp_projectname,
  dcp_projectbrief,
  dcp_certifiedreferred,
  dcp_projectid
FROM dcp_project p
WHERE dcp_validatedcommunitydistricts ILIKE '%${communityDistrict:value}%'
ORDER BY dcp_name DESC
LIMIT ${itemsPerPage:value} OFFSET ${offset:value}
