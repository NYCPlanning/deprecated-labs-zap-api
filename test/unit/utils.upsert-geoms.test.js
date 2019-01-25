const chai = require('chai');
const nock = require('nock');
const upsertGeoms = require('../../utils/upsert-geoms');

chai.should();

describe('Upsert Geometries utility', () => {
  beforeEach(() => {
    this.scope = nock('https://planninglabs.carto.com/api/v2/sql')
      .post('');
  });

  it('should work without throwing error', async () => {
    try {
      const db = {
        async one() {
          return ['12347435'];
        },
        async none() { return null; },
      };

      const response = await upsertGeoms('123467XXX', db);

      response.status.should.equal('failure');
    } catch (e) {
      throw new Error(e);
    }
  });

  it('returns message explaining that ZAP data does not have any matching BBLs', async () => {
    try {
      const db = {
        async one() {
          return { bbls: null };
        },
        async none() { return null; },
      };

      const response = await upsertGeoms('123467XXX', db);

      response.message.should.equal('ZAP data does not list any BBLs for project 123467XXX');
    } catch (e) {
      throw new Error(e);
    }
  });

  it('should explain that PLUTO does not contain matching BBLs for project', async () => {
    this.scope
      .reply(200, {
        rows: [],
      });

    try {
      const db = {
        async one() {
          return { bbls: ['3128931283129839894293'] };
        },
        async none() { return null; },
      };

      const response = await upsertGeoms('123467XXX', db);

      response.message.should.equal('MapPLUTO does not contain matching BBLs for project 123467XXX');
    } catch (e) {
      throw new Error(e);
    }
  });

  it('should explain that updated geoms for the given id', async () => {
    this.scope
      .reply(200, {
        rows: [{
          polygons: 'foo',
          centroid: 'bar',
          mappluto_v: '18v2',
        }],
      });

    try {
      const db = {
        async one() {
          return { bbls: ['1009177501'] };
        },
        async none() { return null; },
      };

      const response = await upsertGeoms('123467XXX', db);

      response.message.should.equal('Updated geometries for project 123467XXX');
    } catch (e) {
      throw new Error(e);
    }
  });

  it('should catch exceptions for database queries and carto', async () => {
    try {
      const db = {
        async one() {
          throw new Error('peanut butter!');
        },
        async none() { return null; },
      };

      const response = await upsertGeoms('123467XXX', db);

      response.error.should.equal('Error: peanut butter!');
    } catch (e) {
      throw new Error(e);
    }
  });
});
