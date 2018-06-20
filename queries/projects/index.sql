SELECT
  dcp_name,
  dcp_projectname,
  dcp_projectbrief,
  dcp_publicstatus,
  dcp_certifiedreferred,
  dcp_projectid,
  dcp_femafloodzonea,
  dcp_femafloodzonecoastala,
  dcp_femafloodzoneshadedx,
  dcp_femafloodzonev,
  cast(count(dcp_projectid) OVER() as integer) as total_projects
FROM dcp_project p
WHERE coalesce(dcp_publicstatus, 'Unknown') IN (${dcp_publicstatus:csv})
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
