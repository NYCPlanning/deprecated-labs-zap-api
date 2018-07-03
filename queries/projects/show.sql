/* */

SELECT
  dcp_name,
  dcp_projectid,
  dcp_projectname,
  dcp_projectbrief,
  dcp_borough,
  dcp_communitydistricts,
  dcp_ulurp_nonulurp,
  dcp_leaddivision,
  account.name as dcp_applicant,
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
  CASE
    WHEN dcp_publicstatus = 'Filed' THEN 'Filed'
    WHEN dcp_publicstatus = 'Certified' THEN 'In Public Review'
    WHEN dcp_publicstatus = 'Approved' THEN 'Complete'
    WHEN dcp_publicstatus = 'Withdrawn' THEN 'Complete'
    ELSE 'Unknown'
  END AS dcp_publicstatus_simp,
 (
    SELECT json_agg(b.dcp_bblnumber)
    FROM dcp_projectbbl b
    WHERE b.dcp_project = p.dcp_projectid
    AND b.dcp_bblnumber IS NOT NULL
  ) AS bbls,

  (
    SELECT json_agg(json_build_object(
      'dcp_name', SUBSTRING(a.dcp_name FROM '-{1}\s*(.*)'), -- use regex to pull out action name -{1}(.*)
      'actioncode', SUBSTRING(a.dcp_name FROM '^(\w+)'),
      'dcp_ulurpnumber', a.dcp_ulurpnumber,
      'dcp_prefix', a.dcp_prefix,
      'statuscode', a.statuscode,
      'dcp_ccresolutionnumber', a.dcp_ccresolutionnumber,
      'dcp_zoningresolution', z.dcp_zoningresolution
    ))
    FROM dcp_projectaction a
    LEFT JOIN dcp_zoningresolution z ON a.dcp_zoningresolution = z.dcp_zoningresolutionid
    WHERE a.dcp_project = p.dcp_projectid
      AND a.statuscode <> 'Mistake'
  ) AS actions,

  (
    SELECT json_agg(json_build_object(
      'dcp_name', m.dcp_name,
      'milestonename', m.milestonename,
      'dcp_plannedstartdate', m.dcp_plannedstartdate,
      'dcp_plannedcompletiondate', m.dcp_plannedcompletiondate,
      'dcp_actualstartdate', m.dcp_actualstartdate,
      'dcp_actualenddate', m.dcp_actualenddate,
      'statuscode', m.statuscode,
      'dcp_milestonesequence', m.dcp_milestonesequence,
      'outcome', m.outcome
    ))
    FROM (
      SELECT
        mm.*,
        dcp_milestone.dcp_name AS milestonename,
        dcp_milestoneoutcome.dcp_name AS outcome
      FROM dcp_projectmilestone mm
      LEFT JOIN dcp_milestone
        ON mm.dcp_milestone = dcp_milestone.dcp_milestoneid
      LEFT JOIN dcp_milestoneoutcome
        ON mm.dcp_milestoneoutcome = dcp_milestoneoutcomeid
      WHERE mm.dcp_projectaction = (
		    SELECT dcp_projectactionid
        FROM dcp_projectaction
        WHERE dcp_project = p.dcp_projectid
        ORDER BY dcp_actionhierarchy ASC
        LIMIT 1
	    )
      ORDER BY mm.dcp_milestonesequence ASC
    ) m
    WHERE milestonename IN (
      'Land Use Fee Payment',
      'Land Use Application Filed Review',
      'CEQR Fee Payment',
      'Filed EAS Review',
      'EIS Draft Scope Review',
      'EIS Public Scoping Meeting',
      'Final Scope of Work Issued',
      'NOC of Draft EIS Issued',
      'DEIS Public Hearing Held',
      'FEIS Submitted and Review',
      'Review Session - Certified / Referred',
      'Community Board Referral',
      'Borough President Referral',
      'Borough Board Referral',
      'CPC Public Meeting - Vote',
      'CPC Public Meeting - Public Hearing',
      'City Council Review',
      'Mayoral Veto',
      'Final Letter Sent'
    )
    AND statuscode <> 'Overridden'
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
  AND dcp_visibility = 'General Public'
