-- first, get the list of assigned projects, roles, and statuses for the specific LUP contact
WITH lups_project_assignments AS (
  SELECT DISTINCT
    CASE
      WHEN mm.statuscode = 'In Progress' THEN 'to-review'
      WHEN mm.statuscode = 'Not Started' THEN 'upcoming'
      WHEN mm.statuscode IN ('Completed', 'Overridden') AND p.dcp_publicstatus NOT IN ('Approved', 'Withdrawn') THEN 'reviewed'
      WHEN mm.statuscode IN ('Completed', 'Overridden') AND p.dcp_publicstatus IN ('Approved', 'Withdrawn') THEN 'archive'
    END AS dashboard_tab,
    lup.dcp_project AS project_id,
    lup.dcp_project AS dcp_name,
    lup.dcp_name AS lup_name,
    lup.dcp_lupteammemberrole AS lup_role,
    p.dcp_publicstatus,
    p.dcp_projectname,
    p.dcp_projectbrief,
    p.dcp_name,
    p.dcp_ulurp_nonulurp,
    mm.dcp_actualstartdate AS actualstartdate,
    mm.dcp_actualenddate AS actualenddate,
    mm.dcp_plannedstartdate AS plannedstartdate,
    mm.dcp_plannedcompletiondate AS plannedcompletiondate
  FROM
    dcp_projectlupteam AS lup
  INNER JOIN -- inner because not all projects should be visible to users based on visibility field in "where" clause
    dcp_project AS p ON lup.dcp_project = p.dcp_projectid
  INNER JOIN -- inner because we only want certain milestones with the status included in the "where" clause
    dcp_projectmilestone AS mm ON lup.dcp_project = mm.dcp_project
  WHERE
    lup.dcp_lupteammember = '${id:value}' -- plugs in contactid
    AND p.dcp_visibility = 'General Public'
    AND (
      (mm.dcp_milestone = '923beec4-dad0-e711-8116-1458d04e2fb8' AND lup.dcp_lupteammemberrole = 'CB')
      OR (mm.dcp_milestone = '943beec4-dad0-e711-8116-1458d04e2fb8' AND lup.dcp_lupteammemberrole = 'BP')
      OR (mm.dcp_milestone = '963beec4-dad0-e711-8116-1458d04e2fb8' AND lup.dcp_lupteammemberrole = 'BB')
    )
)

-- using the list of projects assigned to that contact, get additional attributes at the project level
SELECT
  lup.*,
  (
    SELECT json_agg(
      json_build_object(
        'role', pa.dcp_applicantrole,
        'name', CASE WHEN pa.dcp_name IS NOT NULL THEN pa.dcp_name ELSE account.name END
      )
    )
    FROM (
      SELECT *
      FROM dcp_projectapplicant
      WHERE dcp_project = p.dcp_projectid
        AND dcp_applicantrole IN ('Applicant', 'Co-Applicant')
        AND statuscode = 'Active'
      ORDER BY dcp_applicantrole ASC
    ) pa
    LEFT JOIN account
      ON account.accountid = pa.dcp_applicant_customer
  ) AS project_applicantteam,
  (
    SELECT json_agg(
      json_build_object(
        'disposition_id', disp.dcp_communityboarddispositionid,
        'action_id', disp.dcp_projectaction,
        'action_name', pact.dcp_name,
        'action_ulurp_number', pact.dcp_ulurpnumber,
        'lup_role', disp.dcp_representing,
        'hearing_date', disp.dcp_dateofpublichearing,
        'hearing_location', disp.dcp_publichearinglocation,
        'vote_date', disp.dcp_dateofvote,
        'vote_location', disp.dcp_votelocation,
        -- 'vote_infavor', disp.dcp_votinginfavorrecommendation,
        -- 'vote_against', disp.dcp_votingagainstrecommendation,
        -- 'vote_abstained', disp.dcp_votingabstainingonrecommendation,
        -- 'vote_total_appointed', disp.dcp_totalmembersappointedtotheboard,
        'vote_quorum', disp.dcp_wasaquorumpresent,
        'rec_bb', disp.dcp_boroughboardrecommendation,
        'rec_cb', disp.dcp_communityboardrecommendation,
        'rec_bp', disp.dcp_boroughpresidentrecommendation
        -- 'rec_comment', disp.dcp_consideration
      )
    )
    FROM dcp_communityboarddisposition AS disp
    LEFT JOIN dcp_projectaction AS pact ON disp.dcp_projectaction = pact.dcp_action
    WHERE
      disp.dcp_project = p.dcp_projectid
      AND disp.dcp_recommendationsubmittedby = '${id:value}' -- plugs in contactid
  ) AS project_dispositions,
  (
    SELECT json_agg(json_build_object(
      'dcp_name', m.dcp_name,
      'milestonename', m.milestonename,
      'dcp_plannedstartdate', m.dcp_plannedstartdate,
      'dcp_plannedcompletiondate', m.dcp_plannedcompletiondate,
      'dcp_actualstartdate', m.dcp_actualstartdate,
      'dcp_actualenddate', m.dcp_actualenddate,
      'statuscode', m.statuscode,
      'outcome', m.outcome,
      'dcp_milestone', m.dcp_milestone,
      'dcp_milestonesequence', m.dcp_milestonesequence,
      'display_sequence', m.display_sequence,
      'display_name', m.display_name,
      'display_date', m.display_date,
      'display_date_2', m.display_date_2
    ))
    FROM (
      SELECT
        mm.*,
        dcp_milestone.dcp_name AS milestonename,
        dcp_milestoneoutcome.dcp_name AS outcome,
        (CASE
          WHEN mm.dcp_milestone = '780593bb-ecc2-e811-8156-1458d04d0698' THEN 58
          ELSE mm.dcp_milestonesequence
        END) AS display_sequence,
        -- The sequence number is being overidden for this 'CPC Review of Modification Scope' milestone because we want it to be inserted by date between the related city council review milestones
        (CASE
          WHEN mm.dcp_milestone = '963beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Borough Board Review'
          WHEN mm.dcp_milestone = '943beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Borough President Review'
          WHEN mm.dcp_milestone = '763beec4-dad0-e711-8116-1458d04e2fb8' THEN 'CEQR Fee Paid'
          WHEN mm.dcp_milestone = 'a63beec4-dad0-e711-8116-1458d04e2fb8' THEN 'City Council Review'
          WHEN mm.dcp_milestone = '923beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Community Board Review'
          WHEN mm.dcp_milestone = '9e3beec4-dad0-e711-8116-1458d04e2fb8' THEN 'City Planning Commission Review'
          WHEN mm.dcp_milestone = 'a43beec4-dad0-e711-8116-1458d04e2fb8' THEN 'City Planning Commission Vote'
          WHEN mm.dcp_milestone = '863beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Draft Environmental Impact Statement Public Hearing'
          WHEN mm.dcp_milestone = '7c3beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Draft Scope of Work for Environmental Impact Statement Received'
          WHEN mm.dcp_milestone = '7e3beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Environmental Impact Statement Public Scoping Meeting'
          WHEN mm.dcp_milestone = '883beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Final Environmental Impact Statement Submitted'
          WHEN mm.dcp_milestone = '783beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Environmental Assessment Statement Filed'
          WHEN mm.dcp_milestone = 'aa3beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Approval Letter Sent to Responsible Agency'
          WHEN mm.dcp_milestone = '823beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Final Scope of Work for Environmental Impact Statement Issued'
          WHEN mm.dcp_milestone = '663beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Land Use Application Filed'
          WHEN mm.dcp_milestone = '6a3beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Land Use Fee Paid'
          WHEN mm.dcp_milestone = 'a83beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Mayoral Review'
          WHEN mm.dcp_milestone = '843beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Draft Environmental Impact Statement Completed'
          WHEN mm.dcp_milestone = '8e3beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Application Reviewed at City Planning Commission Review Session'
          WHEN mm.dcp_milestone = '780593bb-ecc2-e811-8156-1458d04d0698' THEN 'CPC Review of Council Modification'
          WHEN mm.dcp_milestone = '483beec4-dad0-e711-8116-1458d04e2fb8' THEN 'DEIS Scope of Work Released'
          WHEN mm.dcp_milestone = '4a3beec4-dad0-e711-8116-1458d04e2fb8' THEN 'Scoping Meeting'
        END) AS display_name,
        (CASE
          WHEN mm.dcp_milestone = '963beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualstartdate
          WHEN mm.dcp_milestone = '943beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualstartdate
          WHEN mm.dcp_milestone = '763beec4-dad0-e711-8116-1458d04e2fb8' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = 'a63beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualstartdate
          WHEN mm.dcp_milestone = '923beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualstartdate
          WHEN mm.dcp_milestone = '9e3beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualstartdate
          WHEN mm.dcp_milestone = 'a43beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = '863beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = '7c3beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualstartdate
          WHEN mm.dcp_milestone = '7e3beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = '883beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualstartdate
          WHEN mm.dcp_milestone = '783beec4-dad0-e711-8116-1458d04e2fb8' THEN mm.dcp_actualstartdate
          WHEN mm.dcp_milestone = 'aa3beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = '823beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = '663beec4-dad0-e711-8116-1458d04e2fb8' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = '6a3beec4-dad0-e711-8116-1458d04e2fb8' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = 'a83beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualstartdate
          WHEN mm.dcp_milestone = '843beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = '8e3beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = '780593bb-ecc2-e811-8156-1458d04d0698' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = '483beec4-dad0-e711-8116-1458d04e2fb8' THEN mm.dcp_actualenddate
          WHEN mm.dcp_milestone = '4a3beec4-dad0-e711-8116-1458d04e2fb8' THEN mm.dcp_actualenddate
          ELSE NULL
        END) AS display_date,
        -- If the project is not yet in public review, we don't want to display dates for certain milestones
        (CASE
          WHEN mm.dcp_milestone = '963beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN COALESCE(mm.dcp_actualenddate, mm.dcp_plannedcompletiondate)
          WHEN mm.dcp_milestone = '943beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN COALESCE(mm.dcp_actualenddate, mm.dcp_plannedcompletiondate)
          WHEN mm.dcp_milestone = '763beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = 'a63beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN COALESCE(mm.dcp_actualenddate, mm.dcp_plannedcompletiondate)
          WHEN mm.dcp_milestone = '923beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN COALESCE(mm.dcp_actualenddate, mm.dcp_plannedcompletiondate)
          WHEN mm.dcp_milestone = '9e3beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN COALESCE(mm.dcp_actualenddate, mm.dcp_plannedcompletiondate)
          WHEN mm.dcp_milestone = 'a43beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = '863beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = '7c3beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = '7e3beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = '883beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = '783beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = 'aa3beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = '823beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = '663beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = '6a3beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = 'a83beec4-dad0-e711-8116-1458d04e2fb8' AND p.dcp_publicstatus <> 'Filed' THEN COALESCE(mm.dcp_actualenddate, mm.dcp_plannedcompletiondate)
          WHEN mm.dcp_milestone = '843beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = '8e3beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = '780593bb-ecc2-e811-8156-1458d04d0698' THEN NULL
          WHEN mm.dcp_milestone = '483beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          WHEN mm.dcp_milestone = '4a3beec4-dad0-e711-8116-1458d04e2fb8' THEN NULL
          ELSE NULL
        END) AS display_date_2
        -- display_date_2 is only populated for milestones that have date ranges. It captures the end of the date range. If the milestone is in-progress and dcp_actualenddate hasn't been populated yet, we use the planned end date instead.
      FROM dcp_projectmilestone mm
      LEFT JOIN dcp_milestone
        ON mm.dcp_milestone = dcp_milestone.dcp_milestoneid
      LEFT JOIN dcp_milestoneoutcome
        ON mm.dcp_milestoneoutcome = dcp_milestoneoutcomeid
      -- create new column to indicate whether a project has an action that matches "Study" ID --
      -- which is used to optionally include milestones only displayed for projects with Study actions --
      LEFT JOIN (
        SELECT true AS has_study_action,
                dcp_project
        FROM dcp_projectaction
        WHERE dcp_projectaction.dcp_project = p.dcp_projectid
        AND dcp_projectaction.dcp_action = '526ede3a-dad0-e711-8125-1458d04e2f18'
      ) studyaction
      ON mm.dcp_project = studyaction.dcp_project
      WHERE
        mm.dcp_project = p.dcp_projectid
        AND mm.statuscode <> 'Overridden'
        AND (
            dcp_milestone.dcp_milestoneid IN (
              '963beec4-dad0-e711-8116-1458d04e2fb8', --Borough Board Referral--
              '943beec4-dad0-e711-8116-1458d04e2fb8', --Borough President Referral--
              '763beec4-dad0-e711-8116-1458d04e2fb8', --Prepare CEQR Fee Payment--
              'a63beec4-dad0-e711-8116-1458d04e2fb8', --City Council Review--
              '923beec4-dad0-e711-8116-1458d04e2fb8', --Community Board Referral--
              '9e3beec4-dad0-e711-8116-1458d04e2fb8', --CPC Public Meeting - Public Hearing--
              'a43beec4-dad0-e711-8116-1458d04e2fb8', --CPC Public Meeting - Vote--
              '863beec4-dad0-e711-8116-1458d04e2fb8', --DEIS Public Hearing Held--
              '7c3beec4-dad0-e711-8116-1458d04e2fb8', --Review Filed EAS and EIS Draft Scope of Work--
              '7e3beec4-dad0-e711-8116-1458d04e2fb8', --DEIS Public Scoping Meeting--
              '883beec4-dad0-e711-8116-1458d04e2fb8', --Prepare and Review FEIS--
              '783beec4-dad0-e711-8116-1458d04e2fb8', --Review Filed EAS--
              'aa3beec4-dad0-e711-8116-1458d04e2fb8', --Final Letter Sent--
              '823beec4-dad0-e711-8116-1458d04e2fb8', --Issue Final Scope of Work--
              '663beec4-dad0-e711-8116-1458d04e2fb8', --Prepare Filed Land Use Application--
              '6a3beec4-dad0-e711-8116-1458d04e2fb8', --Prepare Filed Land Use Fee Payment--
              'a83beec4-dad0-e711-8116-1458d04e2fb8', --Mayoral Veto--
              '843beec4-dad0-e711-8116-1458d04e2fb8', --DEIS Notice of Completion Issued--
              '8e3beec4-dad0-e711-8116-1458d04e2fb8', --Review Session - Certified / Referred--
              '780593bb-ecc2-e811-8156-1458d04d0698' --CPC Review of Modification Scope--
            )
            OR (
              studyaction.has_study_action -- project has Study action --
              AND dcp_milestone.dcp_milestoneid IN ( -- milestone is a study action milestone --
                '483beec4-dad0-e711-8116-1458d04e2fb8', --DEIS Scope of Work Released--
                '4a3beec4-dad0-e711-8116-1458d04e2fb8' --Scoping Hearing--
              )
            )
          )
      ORDER BY
        display_sequence,
        display_date
    ) AS m
  ) AS project_milestones
FROM lups_project_assignments AS lup
LEFT JOIN
  dcp_project AS p ON p.dcp_projectid = lup.project_id
WHERE dashboard_tab = '${status:value}'
