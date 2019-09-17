CREATE INDEX contactid_idx
  ON contact (contactid);
CREATE INDEX emailaddress1_idx
  ON contact (emailaddress1);

CREATE INDEX dcp_projectid_idx
  ON dcp_project (dcp_projectid);

CREATE INDEX dcp_project_milestone_idx
  ON dcp_projectmilestone (dcp_project);
CREATE INDEX dcp_milestone_idx
  ON dcp_projectmilestone (dcp_milestone);

CREATE INDEX dcp_project_action_idx
  ON dcp_projectaction (dcp_project);
CREATE INDEX dcp_action_idx
  ON dcp_projectaction (dcp_action);
CREATE INDEX dcp_ulurpnumber_idx
  ON dcp_projectaction (dcp_ulurpnumber);

CREATE INDEX dcp_communityboarddispositionid_idx
  ON dcp_communityboarddisposition (dcp_communityboarddispositionid);
CREATE INDEX dcp_project_disposition_idx
  ON dcp_communityboarddisposition (dcp_project);
CREATE INDEX dcp_projectaction_idx
  ON dcp_communityboarddisposition (dcp_projectaction);
CREATE INDEX dcp_recommendationsubmittedby_idx
  ON dcp_communityboarddisposition (dcp_recommendationsubmittedby);

CREATE INDEX dcp_lupteammemberrole_idx
  ON dcp_projectlupteam (dcp_lupteammemberrole);
CREATE INDEX dcp_lupteammember_idx
  ON dcp_projectlupteam (dcp_lupteammember);
