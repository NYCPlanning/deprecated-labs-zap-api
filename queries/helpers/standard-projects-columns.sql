,
dcp_projectname,
dcp_projectbrief,
dcp_publicstatus,
CASE
  WHEN dcp_publicstatus = 'Approved' THEN 'Complete'
  WHEN dcp_publicstatus = 'Withdrawn' THEN 'Complete'
  ELSE dcp_publicstatus
END,
dcp_certifiedreferred,
dcp_projectid,
dcp_femafloodzonea,
dcp_femafloodzonecoastala,
dcp_femafloodzoneshadedx,
dcp_femafloodzonev,
cast(count(dcp_projectid) OVER() as integer) as total_projects,
CASE WHEN c.geom IS NOT NULL THEN true ELSE false END AS has_centroid
