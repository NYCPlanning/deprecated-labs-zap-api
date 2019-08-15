const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiThings = require('chai-things');
const jwt = require('jsonwebtoken');
const server = require('../../app');
const manageStubs = require('../../test/helpers/manage-stubs');

const { NYCID_CONSOLE_PASSWORD } = process.env;

chai.use(chaiThings);
chai.should();
chai.use(chaiHttp);

describe('user login callback', () => {
  manageStubs();

  it('should sign-in a user with existing contact information', async () => {
    const NYCIDMockToken = jwt.sign({
      mail: 'WGardner@planning.nyc.gov',
      exp: 1565932329,
    }, NYCID_CONSOLE_PASSWORD);

    const res = await chai.request(server)
      .get(`/login?accessToken=${NYCIDMockToken}`);

    res.status.should.equal(200);
  });

  it('should not sign-in a user who isn\'t in CRM', async () => {
    const NYCIDMockToken = jwt.sign({
      mail: 'fakeuser@fakemailaddress.fake',
      expiresOn: '-1',
    }, NYCID_CONSOLE_PASSWORD);

    const res = await chai.request(server)
      .get(`/login?accessToken=${NYCIDMockToken}`);

    res.status.should.equal(401);
  });
});
