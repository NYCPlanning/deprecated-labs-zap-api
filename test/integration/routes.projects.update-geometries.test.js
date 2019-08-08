const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiThings = require('chai-things');
const manageHTTPStubs = require('../../test/helpers/manage-stubs');

const { USER_API_KEY } = process.env;

chai.use(chaiThings);
chai.should();
chai.use(chaiHttp);

const server = require('../../app');

describe('update-geometries route', () => {
  manageHTTPStubs();

  beforeEach(() => {
    // stub the database calls
    server.dbClient = {
      // noop
      none: async () => {},
    };
  });

  it('should respond with failure if project cannot be found', async () => {
    const { body, status, type } = await chai.request(server)
      .get(`/projects/update-geometries/P201RQ0293?API_KEY=${USER_API_KEY}`);
    console.log(body);

    status.should.equal(200);
    type.should.equal('application/json');

    // app response should include message
    body.message.should.equal('Project P201RQ0293 does not exist or does not have any associated bbls');
  });

  it('should respond success message if project is updated', async () => {
    const { body, status, type } = await chai.request(server)
      .get(`/projects/update-geometries/P2018R0026?API_KEY=${USER_API_KEY}`);

    status.should.equal(200);
    type.should.equal('application/json');

    // app response should include message
    body.message.should.equal('Successfully updated geometries for project P2018R0026');
  });
});
