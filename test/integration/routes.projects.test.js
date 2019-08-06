const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiThings = require('chai-things');

const manageStubs = require('../../test/helpers/manage-stubs');

const PROJECT_STUB = {
  dcp_name: '',
  dcp_ceqrnumber: '',
  dcp_ceqrtype: '',
  dcp_projectname: '',
  dcp_projectbrief: '',
  dcp_publicstatus_simp: '',
  dcp_borough: '',
  dcp_ulurp_nonulurp: '',
  dcp_communitydistricts: '',
  actiontypes: '',
  dcp_certifiedreferred: '',
  dcp_femafloodzonea: '',
  dcp_femafloodzonecoastala: '',
  dcp_femafloodzoneshadedx: '',
  dcp_femafloodzonev: '',
  applicants: '',
  lastmilestonedate: '',
  has_centroid: true,
  center: [0, 0],
  ulurpnumbers: '',
  geom: '{"type": "Polygon","coordinates": [[[-92.10937499999999,41.244772343082076],[-87.890625,41.244772343082076],[-87.890625,44.59046718130883],[-92.10937499999999,44.59046718130883],[-92.10937499999999,41.244772343082076]]]}',
};

chai.use(chaiThings);
chai.should();
chai.use(chaiHttp);

const { expect } = chai;

const server = require('../../app');

describe('projects route filters and returns data', () => {
  manageStubs();

  const oldDbClient = server.dbClient;

  beforeEach(async () => {
    server.dbClient = {
      async any() {
        return [{ ...PROJECT_STUB }];
      },
    };
  });

  afterEach(() => {
    server.dbClient = oldDbClient;
  });

  it('should respond only with projects that match the specified CD', async () => {
    server.dbClient = {
      async any() {
        return [{
          ...PROJECT_STUB,
          dcp_communitydistricts: 'BK01',
        }];
      },
    };

    const res = await chai.request(server)
      .get('/projects?community-districts[]=BK01&page=1');

    const { data } = res.body;

    res.status.should.equal(200);
    res.type.should.equal('application/json');

    // app communityDistricts strings should include 'BK01'
    const communityDistricts = data.map(d => d.attributes.dcp_communitydistricts);
    communityDistricts.should.all.have.string('BK01');
  });

  it('should provide valid metadata', async () => {
    const res = await chai.request(server)
      .get('/projects?community-districts[]=BK01&page=1');

    const { meta } = res.body;

    res.status.should.equal(200);
    res.type.should.equal('application/json');

    // app communityDistricts strings should include 'BK01'
    const {
      total,
      pageTotal,
      tiles,
      bounds,
      queryId,
    } = meta;

    expect(total).to.be.a('number');
    expect(pageTotal).to.be.a('number');
    expect(tiles).to.be.an('array');
    expect(bounds).to.be.an('array');
    expect(queryId).to.be.a('string');
  });

  it('handles pagination', async () => {
    // fetch the first page
    const page1 = await chai.request(server)
      .get('/projects');

    // extract the query id from that first page
    const { meta: { queryId } } = page1.body;

    // map out all the ids
    const firstIdSet = page1.body.data.map(project => project.id);

    // make another request for page 2, include the query id
    const page2 = await chai.request(server)
      .get(`/projects?page=2&queryId=${queryId}`);

    // map out the ids from that result set
    const secondIdSet = page2.body.data.map(project => project.id);

    page2.status.should.equal(200);

    // assert that none of the ids in the first set are included in the second
    // to provde that it paginates in some way
    firstIdSet.every(id => !secondIdSet.find(id2 => id2 === id)).should.equal(true);
  });
});
