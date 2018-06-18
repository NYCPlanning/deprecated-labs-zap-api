/* */

SELECT
  dcp_name,
  dcp_projectid,
  dcp_projectname,
  dcp_projectbrief,
  dcp_borough,
  dcp_ulurp_nonulurp,
  dcp_leaddivision,
  account.name as dcp_applicant_customer,
  dcp_ceqrtype,
  dcp_ceqrnumber,
  dcp_easeis,
  dcp_leadagencyforenvreview,
  dcp_alterationmapnumber,
  dcp_sischoolseat,
  dcp_sisubdivision,
  dcp_previousactiononsite,
  dcp_wrpnumber,
  dcp_nydospermitnumber,
  dcp_bsanumber,
  dcp_lpcnumber,
  dcp_decpermitnumber,
  dcp_femafloodzonea,
  dcp_femafloodzonecoastala,
  dcp_femafloodzonecoastala,
  dcp_femafloodzonev,
  dcp_publicstatus,
 (
    SELECT json_agg(b.dcp_bblnumber)
    FROM dcp_projectbbl b
    WHERE b.dcp_project = p.dcp_projectid
  ) AS bbls,
  (
    SELECT json_agg(json_build_object(
      'dcp_name', a.dcp_name,
      'dcp_ulurpnumber', a.dcp_ulurpnumber,
      'dcp_prefix', a.dcp_prefix,
      'statuscode', a.statuscode
    ))
    FROM dcp_projectaction a
    WHERE a.dcp_project = p.dcp_projectid
      AND a.statuscode <> 'Mistake'
  ) AS actions,
  (
    SELECT json_agg(json_build_object(
      'dcp_name', m.dcp_name,
      'dcp_plannedstartdate', m.dcp_plannedstartdate,
      'dcp_plannedcompletiondate', m.dcp_plannedcompletiondate,
      'statuscode', m.statuscode,
      'dcp_milestonesequence', m.dcp_milestonesequence
    ))
    FROM (
      SELECT *
      FROM dcp_projectmilestone mm
      WHERE mm.dcp_project = p.dcp_projectid
      ORDER BY mm.dcp_milestonesequence ASC
    ) m
  ) AS milestones,
  (
    SELECT json_agg(dcp_keyword.dcp_keyword)
    FROM dcp_projectkeywords k
    LEFT JOIN dcp_keyword ON k.dcp_keyword = dcp_keyword.dcp_keywordid
    WHERE k.dcp_project = p.dcp_projectid
  ) AS keywords,
  (
    SELECT json_agg(json_build_object(
      'dcp_validatedaddressnumber', a.dcp_validatedaddressnumber,
      'dcp_validatedstreet', a.dcp_validatedstreet
    ))
    FROM dcp_projectaddress a
    WHERE a.dcp_project = p.dcp_projectid
      AND (dcp_validatedaddressnumber IS NOT NULL AND dcp_validatedstreet IS NOT NULL)
  ) AS addresses
FROM dcp_project p
LEFT JOIN account ON p.dcp_applicant_customer = account.accountid
WHERE dcp_name = '${id:value}'
