const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(require('chai-things'));

const should = chai.should();

chai.use(chaiHttp);

const server = require('../../app');

describe('downloads functionality', () => {
  it('responds to requests for csv', (done) => {
    chai.request(server)
      .get('/projects.csv?dcp_publicstatus[]=Filed&dcp_publicstatus[]=In Public Review&page=1')
      .end((err, res) => {
        should.not.exist(err);
        res.status.should.equal(200);
        res.type.should.equal('text/csv');

        done();
      });
  });
  it('responds to requests for shapefile', (done) => {
    chai.request(server)
      .get('/projects.shp?dcp_publicstatus[]=Filed&dcp_publicstatus[]=In Public Review&page=1')
      .end((err, res) => {
        should.not.exist(err);
        res.status.should.equal(200);
        res.type.should.equal('application/zip');

        done();
      });
  });
  it('responds to requests for geojson', (done) => {
    chai.request(server)
      .get('/projects.geojson?dcp_publicstatus[]=Filed&dcp_publicstatus[]=In Public Review&page=1')
      .end((err, res) => {
        should.not.exist(err);
        res.status.should.equal(200);
        res.type.should.equal('application/json');

        done();
      });
  });
  it('handles zero record queries for csvs', (done) => {
    chai.request(server)
      .get('/projects.csv?page=1&project_applicant_text=foobar')
      .end((err, res) => {
        should.not.exist(err);
        res.status.should.equal(204);

        done();
      });
  });
});
