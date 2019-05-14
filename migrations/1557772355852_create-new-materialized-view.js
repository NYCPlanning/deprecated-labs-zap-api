exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropMaterializedView('normalized_projects');
  pgm.createMaterializedView('normalized_projects',
    {},
    `
    SELECT dcp_project.*,
      CASE
        WHEN dcp_project.dcp_publicstatus = 'Filed' THEN 'Filed'
        WHEN dcp_project.dcp_publicstatus = 'Certified' THEN 'In Public Review'
        WHEN dcp_project.dcp_publicstatus = 'Approved' THEN 'Completed'
        WHEN dcp_project.dcp_publicstatus = 'Withdrawn' THEN 'Completed'
        ELSE 'Unknown'
      END AS dcp_publicstatus_simp,
      STRING_AGG(DISTINCT SUBSTRING(actions.dcp_name FROM '^(\\w+)'), ';') AS actiontypes,
      STRING_AGG(DISTINCT actions.dcp_ulurpnumber, ';') AS ulurpnumbers,
      STRING_AGG(DISTINCT dcp_projectbbl.dcp_validatedblock, ';') AS blocks,
      STRING_AGG(DISTINCT dcp_projectbbl.dcp_bblnumber, ';') as bbls,
      STRING_AGG(DISTINCT applicantteams.name, ';') AS applicants,
      STRING_AGG(DISTINCT keywords.dcp_keyword, ';') AS keywords,
      lastmilestonedates.lastmilestonedate
    FROM dcp_project
    LEFT JOIN (
      SELECT *
      FROM dcp_projectaction
      WHERE statuscode <> 'Mistake'
      AND SUBSTRING(dcp_name FROM '^(\\w+)') IN (
        'BD',
        'BF',
        'CM',
        'CP',
        'DL',
        'DM',
        'EB',
        'EC',
        'EE',
        'EF',
        'EM',
        'EN',
        'EU',
        'GF',
        'HA',
        'HC',
        'HD',
        'HF',
        'HG',
        'HI',
        'HK',
        'HL',
        'HM',
        'HN',
        'HO',
        'HP',
        'HR',
        'HS',
        'HU',
        'HZ',
        'LD',
        'MA',
        'MC',
        'MD',
        'ME',
        'MF',
        'ML',
        'MM',
        'MP',
        'MY',
        'NP',
        'PA',
        'PC',
        'PD',
        'PE',
        'PI',
        'PL',
        'PM',
        'PN',
        'PO',
        'PP',
        'PQ',
        'PR',
        'PS',
        'PX',
        'RA',
        'RC',
        'RS',
        'SC',
        'TC',
        'TL',
        'UC',
        'VT',
        'ZA',
        'ZC',
        'ZD',
        'ZJ',
        'ZL',
        'ZM',
        'ZP',
        'ZR',
        'ZS',
        'ZX',
        'ZZ'
      )
    ) actions
      ON actions.dcp_project = dcp_project.dcp_projectid
    LEFT JOIN dcp_projectbbl
      ON dcp_projectbbl.dcp_project = dcp_project.dcp_projectid
    LEFT JOIN (
      SELECT dcp_project, CASE WHEN pa.dcp_name IS NOT NULL THEN pa.dcp_name ELSE account.name END as name
      FROM dcp_projectapplicant pa
      LEFT JOIN account
      ON account.accountid = pa.dcp_applicant_customer
      WHERE dcp_applicantrole IN ('Applicant', 'Co-Applicant')
      AND pa.statuscode = 'Active'
      ORDER BY dcp_applicantrole ASC
    ) applicantteams
      ON applicantteams.dcp_project = dcp_project.dcp_projectid
    LEFT JOIN (
        SELECT dcp_project, dcp_keyword.dcp_keyword
        FROM dcp_projectkeywords
        LEFT JOIN dcp_keyword
        ON dcp_projectkeywords.dcp_keyword = dcp_keyword.dcp_keywordid
    ) keywords
    ON keywords.dcp_project = dcp_project.dcp_projectid
    LEFT JOIN (
      SELECT dcp_project, MAX(dcp_actualenddate) as lastmilestonedate FROM (
        SELECT dcp_project, dcp_milestone.dcp_name, dcp_actualenddate, dcp_milestone.dcp_milestoneid FROM dcp_projectmilestone mm
          LEFT JOIN dcp_milestone
             ON mm.dcp_milestone = dcp_milestone.dcp_milestoneid
          WHERE dcp_milestone.dcp_milestoneid IN (
            '683beec4-dad0-e711-8116-1458d04e2fb8',
            '6c3beec4-dad0-e711-8116-1458d04e2fb8',
            '743beec4-dad0-e711-8116-1458d04e2fb8',
            '783beec4-dad0-e711-8116-1458d04e2fb8',
            '7c3beec4-dad0-e711-8116-1458d04e2fb8',
            '7e3beec4-dad0-e711-8116-1458d04e2fb8',
            '823beec4-dad0-e711-8116-1458d04e2fb8',
            '843beec4-dad0-e711-8116-1458d04e2fb8',
            '863beec4-dad0-e711-8116-1458d04e2fb8',
            '8e3beec4-dad0-e711-8116-1458d04e2fb8',
            '923beec4-dad0-e711-8116-1458d04e2fb8',
            '943beec4-dad0-e711-8116-1458d04e2fb8',
            '963beec4-dad0-e711-8116-1458d04e2fb8',
            'a43beec4-dad0-e711-8116-1458d04e2fb8',
            '9e3beec4-dad0-e711-8116-1458d04e2fb8',
            'a63beec4-dad0-e711-8116-1458d04e2fb8',
            'a83beec4-dad0-e711-8116-1458d04e2fb8',
            'aa3beec4-dad0-e711-8116-1458d04e2fb8'
          )
          AND mm.statuscode <> 'Overridden'
        AND mm.dcp_actualenddate::date <= CURRENT_DATE
        )x GROUP BY dcp_project
    ) lastmilestonedates
      ON lastmilestonedates.dcp_project = dcp_project.dcp_projectid
  GROUP BY dcp_project.dcp_projectid, dcp_project.dcp_publicstatus, lastmilestonedates.lastmilestonedate
  `);
};
