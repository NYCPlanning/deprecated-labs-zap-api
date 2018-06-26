,
dcp_projectname,
dcp_projectbrief,
dcp_publicstatus_simp,
dcp_borough,
dcp_ulurp_nonulurp,
dcp_communitydistricts,
dcp_certifiedreferred,
dcp_projectid,
dcp_femafloodzonea,
dcp_femafloodzonecoastala,
dcp_femafloodzoneshadedx,
dcp_femafloodzonev,
cast(count(dcp_projectid) OVER() as integer) as total_projects,
CASE WHEN c.geom IS NOT NULL THEN true ELSE false END AS has_centroid,
(
  SELECT ARRAY_AGG(a.dcp_ulurpnumber)
  FROM dcp_projectaction a
  WHERE a.dcp_project = p.dcp_projectid
    AND a.statuscode <> 'Mistake'
    AND a.dcp_ulurpnumber IS NOT NULL
) AS ulurpnumbers
