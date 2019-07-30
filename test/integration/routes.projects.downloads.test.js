const chai = require('chai');
const chaiHttp = require('chai-http');
const manageStubs = require('../../test/helpers/manage-stubs');

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

  // load static fixtures
  // static fixtures are organized by each test file
  // for updates we should record all the series of requests and
  // write them to the file
  manageStubs();

  beforeEach(async () => {
    const { body } = await chai.request(server)
      .get('/projects?dcp_publicstatus[]=Filed&dcp_publicstatus[]=In Public Review&page=1');

    const { queryId: newQueryId } = body.meta;

    queryId = newQueryId;
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
