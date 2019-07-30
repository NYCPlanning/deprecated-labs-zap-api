const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(require('chai-things'));

const should = chai.should();

chai.use(chaiHttp);

const server = require('../../app');

describe('update-geometries route', () => {
  it('should respond with failure if id does not meet regex requirements', (done) => {
    chai.request(server)
      .get('/projects/update-geometries/P201RQ0293')
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
      .get('/projects/update-geometries/P1984Y0176')
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
      .get('/projects/update-geometries/P2017M0085')
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

// TODO
// assertions carried over from old util file
// 'should work without throwing error'
// 'returns message explaining that ZAP data does not have any matching BBLs'
// 'should explain that PLUTO does not contain matching BBLs for project'
// 'should explain that updated geoms for the given id'
