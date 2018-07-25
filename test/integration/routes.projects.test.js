const chai = require('chai');
const chaiHttp = require('chai-http');


chai.should();
chai.use(require('chai-things'));

const should = chai.should();

chai.use(chaiHttp);

const server = require('../../app');

describe('GET /projects', () => {
  it('should respond only with projects that match the specified CD', (done) => {
    chai.request(server)
      .get('/projects?community-districts[]=BK01&page=1')
      .end((err, res) => {
        const { data } = res.body;

        should.not.exist(err);
        res.status.should.equal(200);
        res.type.should.equal('application/json');

        // app communityDistricts strings should include 'BK01'
        const communityDistricts = data.map(d => d.attributes.dcp_communitydistricts);
        communityDistricts.should.all.have.string('BK01');
        done();
      });
  });
});
