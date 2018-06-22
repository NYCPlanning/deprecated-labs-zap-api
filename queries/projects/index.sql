SELECT
  dcp_name
  ${standardColumns^}
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
