const chai = require('chai');
const nock = require('nock');
const injectSupportDocuments = require('../../utils/project/inject-supporting-document-urls');
const generateXMLDoc = require('../helpers/generate-s3-xml-doc');

const should = chai.should();

describe('support documents', () => {
  beforeEach(() => {
    this.nockScope = nock('https://labs-zap-supporting-documents.sfo2.digitaloceanspaces.com')
      .get('/')
      .query(true);
  });

  it('should inject discovered files into the object', async () => {
    const localScope = this.nockScope
      .times(4)
      .reply(200, generateXMLDoc(['comments/180302_Z99.pdf', 'comments/180302_Z99.pdf']));

    const project = {
      actions: [
        { dcp_ulurpnumber: 'C180229ZMK' },
        { dcp_ulurpnumber: 'N180230ZRK' },
      ],
      milestones: [
        { milestonename: 'Community Board Referral' },
        { milestonename: 'Borough President Referral' },
      ],
    };

    localScope.isDone().should.be.equal(false);
    await injectSupportDocuments(project);

    should.exist(project.milestones[0].milestoneLinks);
    localScope.isDone().should.be.equal(true);
  });

  it('should skip an empty response from s3', async () => {
    const localScope = this.nockScope
      .times(4)
      .reply(200, generateXMLDoc());

    const project = {
      actions: [
        { dcp_ulurpnumber: 'C180229ZMK' },
        { dcp_ulurpnumber: 'N180230ZRK' },
      ],
      milestones: [
        { milestonename: 'Community Board Referral' },
        { milestonename: 'Borough President Referral' },
      ],
    };

    localScope.isDone().should.be.equal(false);
    await injectSupportDocuments(project);

    should.not.exist(project.milestones[0].milestoneLinks);
    localScope.isDone().should.be.equal(true);
  });

  it('should inject matches for Community Boards', async () => {
    const localScope = this.nockScope
      .times(2)
      .reply(200, (uri) => {
        if (uri.includes('comments')) {
          return generateXMLDoc(['comments/180302_Z99.pdf', 'comments/180302_Z99.pdf']);
        }

        return generateXMLDoc();
      });


    const project = {
      actions: [
        { dcp_ulurpnumber: 'C180229ZMK' },
      ],
      milestones: [
        { milestonename: 'Community Board Referral' },
        { milestonename: 'Borough President Referral' },
      ],
    };

    localScope.isDone().should.be.equal(false);
    await injectSupportDocuments(project);

    localScope.isDone().should.be.equal(true);
    project.milestones[0].milestoneLinks.length.should.equal(2);
  });

  it('should inject matches for all known types', async () => {
    const localScope = this.nockScope
      .times(2)
      .reply(200, (uri) => {
        if (uri.includes('comments')) {
          return generateXMLDoc([
            'comments/180302_Z99.pdf',
            'comments/180302_ZBP.pdf',
            'comments/180302_ZBB.pdf',
          ]);
        }

        if (uri.includes('letters')) {
          return generateXMLDoc([
            'letters-dob-hpd/180302_DOB.pdf',
            'letters-dob-hpd/180302_HPD.pdf',
          ]);
        }

        return generateXMLDoc();
      });


    const project = {
      actions: [
        { dcp_ulurpnumber: 'C180302ZMK' },
      ],
      milestones: [
        { milestonename: 'Community Board Referral' },
        { milestonename: 'Borough President Referral' },
        { milestonename: 'Borough Board Referral' },
        { milestonename: 'Final Letter Sent' },
      ],
    };

    localScope.isDone().should.be.equal(false);
    await injectSupportDocuments(project);

    localScope.isDone().should.be.equal(true);
    project.milestones[0].milestoneLinks.length.should.equal(1);
    project.milestones[1].milestoneLinks.length.should.equal(1);
    project.milestones[2].milestoneLinks.length.should.equal(1);
    project.milestones[3].milestoneLinks.length.should.equal(2);
  });
});
