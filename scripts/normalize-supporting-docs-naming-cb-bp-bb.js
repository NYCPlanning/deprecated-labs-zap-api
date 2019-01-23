// Comments from Community Boards, Borough President, and Borough Boards

const fs = require('fs');

const REGEX_LEGACY = /^([A-Z0-9]{6,7})_([A-Z0-9]{1})([A-Z0-9]{2})\.pdf$/;
const fileNames = fs.readdirSync('.');

const badFiles = [];

fileNames.forEach((fileName) => {
  const matchesNew = fileName.match(REGEX_LEGACY);

  if (matchesNew) {
    console.log(`File ${fileName} is valid.`); // eslint-disable-line
  } else {
    badFiles.push(fileName);
  }
});

console.log(`Files with inconsistent naming: ${badFiles.join(', ')}`); // eslint-disable-line
