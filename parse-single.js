const cheerio = require('cheerio');

String.prototype.toProperCase = function () { // eslint-disable-line
  return this.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const parseSingle = (body) => {
  const $ = cheerio.load(body);
  const projects = [];
  const project = {};

  project.landUseAll = $('#txtULURPNO').text();
  project.landUseId = project.landUseAll.split(' ')[1];
  project.ceqrNumber = $('#linkCEQRNo').text();
  project.projectName = $('#txtProjName').text();
  project.location = $('#gridLocation').find('.TEXT_BLACK_10').text();

  projects.push(project);
  return projects;
};

module.exports = parseSingle;
