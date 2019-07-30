/**
 * Helper function to set derived field `dcp_publicstatus_simp` from `dcp_publicstatus_formatted`
 *
 * @param {String} publicStatus The formatted dcp_publicstatus string
 * @param {String} The formatted dcp_publicstatus_simp string
 */
function getPublicStatusSimp(publicStatus) {
  switch (publicStatus) {
    case 'Filed':
      return 'Filed';
    case 'Certified':
      return 'In Public Review';
    case 'Approved':
    case 'Withdrawn':
      return 'Completed';
    default:
      return 'Unknown';
  }
}

module.exports = getPublicStatusSimp;
