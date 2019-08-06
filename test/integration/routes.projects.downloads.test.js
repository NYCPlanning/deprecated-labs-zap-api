const chai = require('chai');
const chaiHttp = require('chai-http');

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

// support for assertions on arrays (apparently)
chai.use(require('chai-things'));

// prototype extension to typecheck values through chaining
chai.should();

// allows chai.request to be used
chai.use(chaiHttp);

const server = require('../../app');

describe('downloads functionality', () => {
  // stores a reference to a query id in the closure
  // which is needed for the api to respond to subsequent
  // requests for data
  let queryId;
  const oldDbClient = server.dbClient;

  beforeEach(async () => {
    server.dbClient = {
      async any() {
        return [{ ...PROJECT_STUB }];
      },
    };
  });

  beforeEach(async () => {
    const { body } = await chai.request(server)
      .get('/projects?dcp_publicstatus[]=Filed&dcp_publicstatus[]=In Public Review&page=1');

    const { queryId: newQueryId } = body.meta;

    queryId = newQueryId;
  });

  after(() => {
    server.dbClient = oldDbClient;
  });

  it('responds to requests for csv', async () => {
    const res = await chai.request(server)
      .get(`/projects.csv?queryId=${queryId}`);

    res.status.should.equal(200);
    res.type.should.equal('text/csv');
  });

  it('responds to requests for shapefile', async () => {
    const res = await chai.request(server)
      .get(`/projects.shp?queryId=${queryId}`);

    res.status.should.equal(200);
    res.type.should.equal('application/zip');
  });

  it('responds to requests for geojson', async () => {
    const res = await chai.request(server)
      .get(`/projects.geojson?queryId=${queryId}`);

    res.status.should.equal(200);
    res.type.should.equal('application/json');
  });

  it('handles zero record queries for csvs', async () => {
    const res = await chai.request(server)
      .get(`/projects.csv?queryId=${queryId}`);

    res.status.should.equal(200);
  });
});
