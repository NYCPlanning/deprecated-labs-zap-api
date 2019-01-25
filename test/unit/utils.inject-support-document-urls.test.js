const nock = require('nock');
const injectSupportDocuments = require('../../utils/inject-supporting-document-urls');

describe('support documents', () => {
  it('should inject discovered files into the object', async () => {
    const project = {
      actions: [
        {
          dcp_ulurpnumber: 'C180229ZMK',
        },
        {
          dcp_ulurpnumber: 'N180230ZRK',
        },
      ],
      milestones: [
        {
          dcp_name: 'ZM-Prepare Filed Land Use Application',
          milestonename: 'Prepare Filed Land Use Application',
          dcp_plannedstartdate: '2018-01-18T05:00:00',
          dcp_plannedcompletiondate: '2018-01-28T05:00:00',
          dcp_actualstartdate: '2018-01-18T05:00:00',
          dcp_actualenddate: '2018-01-18T05:00:00',
          statuscode: 'Completed',
          dcp_milestonesequence: 26,
          outcome: null,
        },
        {
          dcp_name: 'ZM-Filed EAS Review',
          milestonename: 'Filed EAS Review',
          dcp_plannedstartdate: '2018-04-06T04:00:00',
          dcp_plannedcompletiondate: '2018-06-05T04:00:00',
          dcp_actualstartdate: '2018-04-06T04:00:00',
          dcp_actualenddate: '2018-04-06T04:00:00',
          statuscode: 'Completed',
          dcp_milestonesequence: 37,
          outcome: null,
        },
      ],
    };

    await injectSupportDocuments(project);

    // project.milestones.
  });
});
