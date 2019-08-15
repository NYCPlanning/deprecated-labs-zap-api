const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiThings = require('chai-things');
const jwt = require('jsonwebtoken');
const server = require('../../app');
const manageStubs = require('../../test/helpers/manage-stubs');

const { CRM_SIGNING_SECRET } = process.env;

chai.use(chaiThings);
chai.should();
chai.use(chaiHttp);

describe('user authorized projects', () => {
  manageStubs();

  it('should return a projects assigned to an authenticated user', async () => {
    const newToken = jwt.sign({
      contactId: '51231D14-693E-E811-8133-1458D04D06C0',
      // contactRole: '', // TODO
    }, CRM_SIGNING_SECRET);

    const res = await chai.request(server)
      .get('/users/51231D14-693E-E811-8133-1458D04D06C0/projects')
      .set('Cookie', `token=${newToken}`);

    res.status.should.equal(200);
  });

  it('should return an error for unauth\'d user', async () => {
    const res = await chai.request(server)
      .get('/users/51231D14-693E-E811-8133-1458D04D06C0/projects');

    res.status.should.equal(401);
  });

  it('users may not view projects for another user', async () => {
    const newToken = jwt.sign({
      contactId: '2A231D14-693E-E811-8133-1458D04D06C0',
      // contactRole: '', // TODO
    }, CRM_SIGNING_SECRET);

    const res = await chai.request(server)
      .get('/users/51231D14-693E-E811-8133-1458D04D06C0/projects')
      .set('Cookie', `token=${newToken}`);

    res.status.should.equal(401);
  });

  it('auth\'d users may view filters of their projects to-review', async () => {
    const newToken = jwt.sign({
      contactId: '51231D14-693E-E811-8133-1458D04D06C0',
      // contactRole: '', // TODO
    }, CRM_SIGNING_SECRET);

    const res = await chai.request(server)
      .get('/users/51231D14-693E-E811-8133-1458D04D06C0/projects?projectState=to-review')
      .set('Cookie', `token=${newToken}`);

    res.status.should.equal(200);
  });

  it('auth\'d users may view filters of their upcoming projects', async () => {
    const newToken = jwt.sign({
      contactId: '51231D14-693E-E811-8133-1458D04D06C0',
      // contactRole: '', // TODO
    }, CRM_SIGNING_SECRET);

    const res = await chai.request(server)
      .get('/users/51231D14-693E-E811-8133-1458D04D06C0/projects?projectState=upcoming')
      .set('Cookie', `token=${newToken}`);

    res.status.should.equal(200);
  });

  it('auth\'d users may view filters of their archived projects', async () => {
    const newToken = jwt.sign({
      contactId: '51231D14-693E-E811-8133-1458D04D06C0',
      // contactRole: '', // TODO
    }, CRM_SIGNING_SECRET);

    const res = await chai.request(server)
      .get('/users/51231D14-693E-E811-8133-1458D04D06C0/projects?projectState=archived')
      .set('Cookie', `token=${newToken}`);

    res.status.should.equal(200);
  });
});
