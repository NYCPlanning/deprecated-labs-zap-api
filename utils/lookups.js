const VISIBILITY = {
  GENERAL_PUBLIC: 717170003,
};
const ULURP = {
  ULURP: 717170001,
  'Non-ULURP': 717170000,
};

const CEQRTYPE = {
  'Type II': 717170000,
  'Type I': 717170001,
  Unlisted: 717170002,
};

const STATUSCODE = {
  MISTAKE: 717170003,
  OVERRIDDEN: 717170001,
};

const STATECODE = {
  ACTIVE: '0',
};

const PUBLICSTATUS = {
  Filed: 717170000,
  Certified: 717170001,
  Approved: 717170002,
  Withdrawn: 717170003,
};

const BOROUGH = {
  Bronx: 717170000,
  Brooklyn: 717170002,
  Manhattan: 717170001,
  Queens: 717170003,
  'Staten Island': 717170004,
  Citywide: 717170005,
};

const APPLICANTROLE = {
  APPLICANT: 717170000,
  COAPPLICANT: 717170002,
};

const MILESTONE_NAMES = [
  'Land Use Fee Payment',
  'Land Use Application Filed Review',
  'CEQR Fee Payment',
  'Filed EAS Review',
  'EIS Draft Scope Review', 'EIS Public Scoping Meeting',
  'Final Scope of Work Issued',
  'NOC of Draft EIS Issued',
  'DEIS Public Hearing Held',
  'Review Session - Certified / Referred',
  'Community Board Referral',
  'Borough President Referral',
  'Borough Board Referral',
  'CPC Public Meeting - Vote',
  'CPC Public Meeting - Public Hearing',
  'City Council Review',
  'Mayoral Veto',
  'Final Letter Sent',
];

/**
 * Lookups are written to enable creation of FetchXML with correct conditions.
 * However, they're also needed to translate a few values from CRM response back into
 * human-readable format (because sadly the batch POST responses do not include this
 * information as the normal GET responses do). This function enables use of the same
 * lookup objects to do lookups in both directions, so multiple lookups do not have to
 * be maintained.
 *
 * @param {Object} lookup The lookup dict to get key from
 * @param {String\|int} value The value to get key for
 * @returns {String} The lookup object key for the specified value
 */
function keyForValue(lookup, value) {
  return Object.keys(lookup)[Object.values(lookup).indexOf(value)];
}

module.exports = {
  keyForValue,
  VISIBILITY,
  ULURP,
  CEQRTYPE,
  STATUSCODE,
  STATECODE,
  PUBLICSTATUS,
  BOROUGH,
  APPLICANTROLE,
  MILESTONE_NAMES,
};
