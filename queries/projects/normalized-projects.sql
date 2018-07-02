-- this is the base query used for filtering

CREATE MATERIALIZED VIEW normalized_projects AS
  SELECT dcp_project.*,
    coalesce(account.name, 'Unknown Applicant') AS dcp_applicant,
    CASE
      WHEN dcp_project.dcp_publicstatus = 'Filed' THEN 'Filed'
      WHEN dcp_project.dcp_publicstatus = 'Certified' THEN 'In Public Review'
      WHEN dcp_project.dcp_publicstatus = 'Approved' THEN 'Complete'
      WHEN dcp_project.dcp_publicstatus = 'Withdrawn' THEN 'Complete'
      ELSE 'Unknown'
    END AS dcp_publicstatus_simp,
    STRING_AGG(SUBSTRING(dcp_projectaction.dcp_name FROM '^(\w+)'), ';') AS actiontypes,
    STRING_AGG(dcp_projectaction.dcp_ulurpnumber, ';') AS ulurpnumbers,
    STRING_AGG(dcp_projectbbl.dcp_validatedblock, ';') AS blocks
  FROM dcp_project
  LEFT JOIN account
    ON dcp_project.dcp_applicant_customer = account.accountid
  INNER JOIN dcp_projectaction
    ON dcp_projectaction.dcp_project = dcp_project.dcp_projectid
  INNER JOIN dcp_projectbbl
    ON dcp_projectbbl.dcp_project = dcp_project.dcp_projectid
  WHERE dcp_projectaction.statuscode <> 'Mistake'
  GROUP BY dcp_project.dcp_projectid, account.name, dcp_project.dcp_publicstatus
