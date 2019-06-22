/**
 * Helper function to extract and format paging cookie from CRM fetchXML GET response.
 * You are not dreaming! It's true! The cookie must be extracted from an XML string,
 * then DOUBLELY decoded, then special characters must be re-encoded to HTML-safe versions.
 * A usable API product? Methinks not...
 *
 * @param {Object} res The CRM fetchXML GET response
 * @returns {String} The HTML-escaped paging cookie
 */

function getEscapedPagingCookie(res) {
  const {
    '@Microsoft.Dynamics.CRM.fetchxmlpagingcookie': pagingCookie,
  } = res;

  const cookie = pagingCookie.match('pagingcookie="([-A-Za-z0-9%_]*)"')[1];
  return decodeURIComponent(decodeURIComponent(cookie))
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { getEscapedPagingCookie };
