const cheerio = require('cheerio');

String.prototype.toProperCase = function () { // eslint-disable-line
  return this.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const parse = (body) => {
  const $ = cheerio.load(body);
  const projects = [];

  $('#DataGrid1').find('tr').each((i, row) => {
    if (i > 0) {
      const project = {};

      $(row).find('td').each((j, column) => {
        switch (j) {
          case 0:
            project.landUseAll = $(column).find('a').eq(0).text().trim();
            project.landUseId = project.landUseAll.split(' ')[1];
            project.landUseReceivedDate = $(column).find('a').eq(1).text().trim();
            break;

          case 1:
            project.ceqrNumber = $(column).find('a').eq(0).text().trim();
            project.ceqrReceivedDate = $(column).find('a').eq(1).text().trim();
            break;

          case 2:
            // split on more than one space
            project.lastMilestone = $(column).find('font').contents().eq(0).text().trim().toProperCase();
            project.lastMilestoneDate = $(column).find('font').contents().eq(2).text().trim();
            break;

          case 3:
            // skip the <br> by getting contents() at position 0 and 2
            project.projectName = $(column).find('font').contents().eq(0).text().trim().toProperCase();
            project.location = $(column).find('font').contents().eq(2).text().trim().toProperCase();
            break;

          case 4:
            project.cd = $(column).text().trim();
            break;

          default:

        }
      });
      projects.push(project);
    }
  });
  console.log(`Got ${projects.length} applications`); //eslint-disable-line

  return projects;
};

module.exports = parse;
