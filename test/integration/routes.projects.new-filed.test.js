const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(require('chai-things'));

chai.use(chaiHttp);

const should = chai.should();

const server = require('../../app');
// const upsertGeoms = require('../../utils/upsert-geoms');

describe('new-filed route', () => {
  it('should respond with message object', (done) => {
    chai.request(server)
      .get('/projects/new-filed')
      .end((err, res) => {
        res.type.should.equal('application/json');

        // check that an object message is returned with these properties
        res.body.should.have.keys('success', 'failure', 'failureMessages', 'error', 'errorMessages');
        if (res.body.errorMessages.length === 0) res.status.should.equal(200);

        done();
      });
  }).timeout(500000);
});
