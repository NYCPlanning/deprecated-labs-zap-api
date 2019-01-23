// Letters to DOB/HPD

const fs = require('fs');

const REGEX_LEGACY = /^(DOB|HPD)([A-Z0-9]{6,7})[A-Z]{3}\.pdf$/;
const REGEX_NEW = /^[A-Z0-9]{6,7}_(DOB|HPD)\.pdf$/;
const TARGET_DIR = 'renamedFiles';
const fileNames = fs.readdirSync('.');
fs.mkdirSync(`./${TARGET_DIR}`);

const badFiles = [];

fileNames.forEach((fileName) => {
  const matchesNew = fileName.match(REGEX_NEW);
  const matchesLegacy = fileName.match(REGEX_LEGACY);

  let newFileName;

  if (matchesNew) {
    newFileName = fileName;
  }

  if (matchesLegacy) {
    newFileName = `${matchesLegacy[2]}_${matchesLegacy[1]}.pdf`;
  }

  if (matchesLegacy || matchesNew) {
    fs.copyFileSync(fileName, `${TARGET_DIR}/${newFileName}`);

    console.log(`Moved ${fileName} to ${TARGET_DIR}/${newFileName}`); // eslint-disable-line
  } else {
    badFiles.push(fileName);
  }
});

console.log(`Files with inconsistent naming: ${badFiles.join(', ')}`); // eslint-disable-line
