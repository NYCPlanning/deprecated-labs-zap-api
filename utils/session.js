/**
 * Constants and enums for sessions
 */
const USER_ROLES_ENUM = {
  COMMUNITY_BOARD: 'CB',
  BOROUGH_PRESIDENT: 'BP',
  UNKNOWN: '',
};

function getUserRole(role) {
  const ALLOWED_ENUM_VALUES = Object.values(USER_ROLES_ENUM);
  if (ALLOWED_ENUM_VALUES.includes(role)) {
    return role;
  }

  return USER_ROLES_ENUM.UNKNOWN;
}

/**
 * Functions to help validate sessions
 */
function isCurrentUser(contactId, session) {
  if (!session.contactId) return false;
  if (session.contactId !== contactId) return false;

  return true;
}


module.exports = {
  USER_ROLES_ENUM,
  getUserRole,
  isCurrentUser,
};
