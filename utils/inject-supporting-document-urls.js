const fetch = require('node-fetch');
const { parseString } = require('xml2js');
const { promisify } = require('util');

const parseStringAsync = promisify(parseString);

const S3_BUCKET_HOST = 'https://labs-zap-supporting-documents.sfo2.digitaloceanspaces.com';
const MILESTONE_TYPES = {
  'Community Board Referral': /.*_[A-Z]{1}[0-9]{2}/,
  'Borough President Referral': /.*_[A-Z]{1}BP/,
  'Borough Board Referral': /.*_[A-Z]{1}BB/,
  'Final Letter Sent': /.*_(HPD|DOB)/,
};

async function injectSupportDocumentURLs(project) {
// only projects with actions have supporting documents
  if (!project.actions) {
    return;
  }

  // extract trimmed ULURP number
  const ulurpNumbers = project.actions
    .filter(({ dcp_ulurpnumber }) => dcp_ulurpnumber) // filter out nulls
    .map(({ dcp_ulurpnumber }) => dcp_ulurpnumber.match(/[A-Z]?([A-Z0-9]{6,7})[A-Z]{3}/))
    .map(ulurpNumber => (ulurpNumber || [])[1]);

  // hit s3 object listing for all ULURP number & doc-type combination
  const searchResults = await Promise.all([
    ...ulurpNumbers
      .map(ulurlp => fetch(`${S3_BUCKET_HOST}/?prefix=comments/${ulurlp}`)
        .then(blob => blob.text())
        .then(text => parseStringAsync(text))),
    ...ulurpNumbers
      .map(ulurlp => fetch(`${S3_BUCKET_HOST}/?prefix=letters-dob-hpd/${ulurlp}`)
        .then(blob => blob.text())
        .then(text => parseStringAsync(text))),
  ]);

  // extract relevant contents, filter undefineds, and flatten
  const allSupportingDocs = searchResults
    .map(result => result['ListBucketResult']['Contents']) // eslint-disable-line
    .filter(Boolean)
    .reduce((acc, curr) => acc.concat(curr), []);

  project.milestones.forEach((milestone) => {
    const { milestonename } = milestone;
    const regex = MILESTONE_TYPES[milestonename];

    if (regex) {
      const foundDocuments = allSupportingDocs.filter(({ Key: key }) => {
        const [filename] = key;

        return filename.match(regex);
      });

      if (foundDocuments.length) {
        milestone.milestoneLinks = foundDocuments.map((doc) => {
          const { Key: [filename] } = doc;

          return {
            filename: filename.split('/')[1],
            url: `${S3_BUCKET_HOST}/${filename}`,
          };
        });
      }
    }
  });
}

module.exports = injectSupportDocumentURLs;
