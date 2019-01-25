const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(require('chai-things'));

const should = chai.should();

chai.use(chaiHttp);

const server = require('../../app');

describe('GET /projects', () => {
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
});
