const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiThings = require('chai-things');
const jwt = require('jsonwebtoken');
const server = require('../../app');

const { NYCID_CONSOLE_PASSWORD } = process.env;

chai.use(chaiThings);
chai.should();
chai.use(chaiHttp);

describe('user login callback', () => {
  it('should sign-in a user with existing contact information', async () => {
    const NYCIDMockToken = jwt.sign({
      mail: 'rsinger@planning.nyc.gov',
      exp: 1565932329 * 1000,
    }, NYCID_CONSOLE_PASSWORD);

    const res = await chai.request(server)
      .get(`/login?accessToken=${NYCIDMockToken}`);

    res.status.should.equal(200);
  });

  // TODO: inject dependency and mock situation where DB doesn't find fakeuser
  it('should not sign-in a user who isn\'t in CRM', async () => {
    const NYCIDMockToken = jwt.sign({
      mail: 'fakeuser@fakemailaddress.fake',
      exp: 1565932329 * 1000,
    }, NYCID_CONSOLE_PASSWORD);

    const res = await chai.request(server)
      .get(`/login?accessToken=${NYCIDMockToken}`);

    res.status.should.equal(401);
  });
});
