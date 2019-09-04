const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(require('chai-things'));

const should = chai.should();

chai.use(chaiHttp);

const server = require('../../app');

const { USER_API_KEY } = process.env;

describe('update-geometries route', () => {
  it('should respond with failure if id does not meet regex requirements', (done) => {
    chai.request(server)
      .get(`/projects/update-geometries/P201RQ0293?API_KEY=${USER_API_KEY}`)
      .end((err, res) => {
        should.not.exist(err);
        res.status.should.equal(200);
        res.type.should.equal('application/json');

        // app response should include message
        res.body.message.should.equal('Invalid project id');
        done();
      });
  });

  it('should respond failure message if project does not have BBLs', (done) => {
    chai.request(server)
      .get(`/projects/update-geometries/P1984Y0176?API_KEY=${USER_API_KEY}`)
      .end((err, res) => {
        should.not.exist(err);
        res.status.should.equal(200);
        res.type.should.equal('application/json');

        // app response should include message
        res.body.response.message.should.equal('ZAP data does not list any BBLs for project P1984Y0176');
        done();
      });
  });

  it('should respond success message if project is updated', (done) => {
    chai.request(server)
      .get(`/projects/update-geometries/P2017M0085?API_KEY=${USER_API_KEY}`)
      .end((err, res) => {
        should.not.exist(err);
        res.status.should.equal(200);
        res.type.should.equal('application/json');

        // app response should include message
        res.body.response.message.should.equal('Updated geometries for project P2017M0085');
        done();
      });
  });
});
