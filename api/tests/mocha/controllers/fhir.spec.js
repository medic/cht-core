const sinon = require('sinon');
const { expect } = require('chai');
const { InvalidArgumentError } = require('@medic/cht-datasource');
const auth = require('../../../src/auth');
const fhirService = require('../../../src/services/fhir');
const serverUtils = require('../../../src/server-utils');
const { PermissionError } = require('../../../src/errors');

const CANONICAL_BASE = 'http://example.org/cht/fhir';
const SERVICE_BASE = 'https://cht.example.org/api/v1/fhir';

const facadeConfig = (overrides = {}) => ({
  canonicalBase: CANONICAL_BASE,
  bindings: [
    {
      key: 'Patient/contact_type/person',
      resourceType: 'Patient',
      sourceKind: 'contact_type',
      sourceId: 'person',
      sourceFilter: null,
      elements: {},
      identifiers: [],
      observations: {},
    },
    {
      key: 'Encounter/form/app:pregnancy',
      resourceType: 'Encounter',
      sourceKind: 'form',
      sourceId: 'app:pregnancy',
      sourceFilter: null,
      elements: {},
      identifiers: [],
      observations: { 'app:pregnancy/u_lmp_date': {} },
    },
  ],
  ...overrides,
});

describe('FHIR Controller', () => {
  let controller;
  let req;
  let res;
  let assertPermissions;
  let getFacade;
  let isConfigured;
  let read;
  let search;

  before(() => {
    controller = require('../../../src/controllers/fhir');
  });

  beforeEach(() => {
    assertPermissions = sinon.stub(auth, 'assertPermissions').resolves();
    getFacade = sinon.stub(fhirService, 'getFacade').returns({ config: facadeConfig(), diagnostics: [] });
    isConfigured = sinon.stub(fhirService, 'isConfigured').returns(true);
    read = sinon.stub(fhirService, 'read');
    search = sinon.stub(fhirService, 'search');
    sinon.stub(serverUtils, 'error');
    req = {
      protocol: 'https',
      get: sinon.stub().returns(undefined),
      originalUrl: '/api/v1/fhir/Patient',
      params: {},
      query: {},
    };
    req.get.withArgs('host').returns('cht.example.org');
    res = {
      status: sinon.stub().returnsThis(),
      type: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
    };
  });

  afterEach(() => sinon.restore());

  const body = () => res.json.args[0][0];
  const status = () => (res.status.callCount ? res.status.args[0][0] : 200);

  describe('permission gating', () => {
    it('answers 403 as an OperationOutcome, not as a plain error body', async () => {
      assertPermissions.rejects(new PermissionError('Insufficient privileges'));
      await controller.v1.read(req, res);
      expect(status()).to.equal(403);
      expect(res.type.args[0]).to.deep.equal(['application/fhir+json']);
      expect(body()).to.deep.equal({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'forbidden', diagnostics: 'Insufficient privileges' }],
      });
    });

    it('answers 401 when the caller is not logged in', async () => {
      assertPermissions.rejects({ code: 401, message: 'Not logged in' });
      await controller.v1.search(req, res);
      expect(status()).to.equal(401);
      expect(body().issue[0].code).to.equal('login');
    });
  });

  describe('error mapping', () => {
    it('maps an invalid argument to 400', async () => {
      req.params = { resourceType: 'Patient', id: 'x' };
      read.rejects(new InvalidArgumentError('bad cursor'));
      await controller.v1.read(req, res);
      expect(status()).to.equal(400);
      expect(body().issue[0]).to.deep.equal({
        severity: 'error',
        code: 'invalid',
        diagnostics: 'bad cursor',
      });
    });

    it('hands a server error to serverUtils rather than leaking it', async () => {
      req.params = { resourceType: 'Patient', id: 'x' };
      read.rejects(new Error('boom'));
      await controller.v1.read(req, res);
      expect(serverUtils.error.callCount).to.equal(1);
      expect(res.json.callCount).to.equal(0);
    });
  });

  describe('configuration gating', () => {
    it('answers 404 when nothing is configured, because this is not a FHIR server', async () => {
      isConfigured.returns(false);
      await controller.v1.metadata(req, res);
      expect(status()).to.equal(404);
      expect(body().issue[0].diagnostics).to.contain('no FHIR mapping configured');
    });

    it('answers 503 pointing at the API logs when the mapping will not load', async () => {
      getFacade.returns({
        config: null,
        diagnostics: [{ severity: 'error', ruleId: 'canonical-base-missing', message: 'set a base', bindingKey: null }],
      });
      await controller.v1.search(req, res);
      expect(status()).to.equal(503);
      expect(body().issue).to.deep.equal([{
        severity: 'error',
        code: 'transient',
        diagnostics: 'The FHIR mapping for this server is not usable. See the API logs for why.',
      }]);
    });
  });

  describe('metadata', () => {
    it('returns a CapabilityStatement naming the served resource types', async () => {
      await controller.v1.metadata(req, res);
      expect(res.type.args[0]).to.deep.equal(['application/fhir+json']);
      expect(body()).to.deep.include({ resourceType: 'CapabilityStatement', fhirVersion: '4.0.1' });
      expect(body().implementation.url).to.equal(SERVICE_BASE);
      expect(body().rest[0].resource.map(resource => resource.type))
        .to.deep.equal(['Patient', 'Encounter', 'Observation']);
    });
  });

  describe('read', () => {
    beforeEach(() => {
      req.params = { resourceType: 'Patient', id: 'p1' };
      req.originalUrl = '/api/v1/fhir/Patient/p1';
    });

    it('returns the resource', async () => {
      read.resolves({ resourceType: 'Patient', id: 'p1' });
      await controller.v1.read(req, res);
      expect(read.args[0].slice(1)).to.deep.equal(['Patient', 'p1']);
      expect(body()).to.deep.equal({ resourceType: 'Patient', id: 'p1' });
    });

    it('answers 404 when nothing maps to the id', async () => {
      read.resolves(null);
      await controller.v1.read(req, res);
      expect(status()).to.equal(404);
      expect(body().issue[0].diagnostics).to.equal('Patient/p1 not found.');
    });

    it('answers 404 for a resource type the mapping does not configure', async () => {
      // Observation is a type the facade serves, but only where a binding
      // projects one; this mapping's Encounter projects none.
      const bindings = facadeConfig().bindings.map(binding => ({ ...binding, observations: {} }));
      getFacade.returns({ config: facadeConfig({ bindings }), diagnostics: [] });
      req.params = { resourceType: 'Observation', id: 'x' };
      await controller.v1.read(req, res);
      expect(status()).to.equal(404);
      expect(read.callCount).to.equal(0);
    });

    it('answers 404 for a resource type FHIR has but the facade does not', async () => {
      req.params = { resourceType: 'Medication', id: 'x' };
      await controller.v1.read(req, res);
      expect(status()).to.equal(404);
    });

    it('serves an Observation through the Encounter binding that projects it', async () => {
      req.params = { resourceType: 'Observation', id: 'r1.u-lmp-date' };
      read.resolves({ resourceType: 'Observation', id: 'r1.u-lmp-date' });
      await controller.v1.read(req, res);
      expect(status()).to.equal(200);
      expect(body().id).to.equal('r1.u-lmp-date');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      req.params = { resourceType: 'Patient' };
      req.originalUrl = '/api/v1/fhir/Patient';
    });

    it('returns a searchset Bundle with a self link', async () => {
      search.resolves({ resources: [{ resourceType: 'Patient', id: 'p1' }], cursor: null });
      await controller.v1.search(req, res);
      expect(body()).to.deep.equal({
        resourceType: 'Bundle',
        type: 'searchset',
        link: [{ relation: 'self', url: `${SERVICE_BASE}/Patient` }],
        entry: [{
          fullUrl: `${SERVICE_BASE}/Patient/p1`,
          resource: { resourceType: 'Patient', id: 'p1' },
          search: { mode: 'match' },
        }],
      });
    });

    it('builds a next link that keeps the search parameters', async () => {
      req.originalUrl = '/api/v1/fhir/Patient?name=mary&_count=2';
      req.query = { name: 'mary', _count: '2' };
      search.resolves({ resources: [], cursor: 'bookmark-2' });
      await controller.v1.search(req, res);
      const next = body().link.find(link => link.relation === 'next');
      expect(next.url).to.equal(`${SERVICE_BASE}/Patient?name=mary&_count=2&_cursor=bookmark-2`);
    });

    it('replaces an existing cursor rather than appending a second one', async () => {
      req.originalUrl = '/api/v1/fhir/Patient?_cursor=50';
      req.query = { _cursor: '50' };
      search.resolves({ resources: [], cursor: '100' });
      await controller.v1.search(req, res);
      const next = body().link.find(link => link.relation === 'next');
      expect(next.url).to.equal(`${SERVICE_BASE}/Patient?_cursor=100`);
    });

    it('omits the next link on the last page', async () => {
      search.resolves({ resources: [], cursor: null });
      await controller.v1.search(req, res);
      expect(body().link.map(link => link.relation)).to.deep.equal(['self']);
    });

    it('builds links with the scheme nginx forwarded, not the one api was reached on', async () => {
      req.protocol = 'http';
      req.get.withArgs('x-forwarded-proto').returns('https');
      req.originalUrl = '/api/v1/fhir/Patient?_count=1';
      req.query = { _count: '1' };
      search.resolves({ resources: [{ resourceType: 'Patient', id: 'p1' }], cursor: 'c2' });
      await controller.v1.search(req, res);
      expect(body().link).to.deep.equal([
        { relation: 'self', url: `${SERVICE_BASE}/Patient?_count=1` },
        { relation: 'next', url: `${SERVICE_BASE}/Patient?_count=1&_cursor=c2` },
      ]);
      expect(body().entry[0].fullUrl).to.equal(`${SERVICE_BASE}/Patient/p1`);
    });

    it('treats _id as a one-entry searchset, so total is knowable', async () => {
      req.originalUrl = '/api/v1/fhir/Patient?_id=p1';
      req.query = { _id: 'p1' };
      read.resolves({ resourceType: 'Patient', id: 'p1' });
      await controller.v1.search(req, res);
      expect(search.callCount).to.equal(0);
      expect(body()).to.deep.include({ total: 1 });
      expect(body().entry).to.have.length(1);
    });

    it('returns an empty searchset when _id matches nothing', async () => {
      req.query = { _id: 'p1' };
      read.resolves(null);
      await controller.v1.search(req, res);
      expect(body()).to.deep.include({ total: 0 });
      expect(body().entry).to.deep.equal([]);
    });

    it('rejects a search parameter the resource type does not support', async () => {
      req.query = { birthdate: '2000-01-01' };
      await controller.v1.search(req, res);
      expect(status()).to.equal(400);
      expect(body().issue[0].diagnostics).to.contain('does not support the search parameter birthdate');
      expect(body().issue[0].diagnostics).to.contain('Supported: _id, name.');
      expect(search.callCount).to.equal(0);
    });

    it('ignores the result parameters, which are not search parameters', async () => {
      req.query = { _count: '5', _format: 'json', _pretty: 'true', _cursor: 'abc' };
      search.resolves({ resources: [], cursor: null });
      await controller.v1.search(req, res);
      expect(search.args[0][2]).to.deep.equal({});
      expect(search.args[0][3]).to.equal('abc');
      expect(search.args[0][4]).to.equal(5);
    });

    it('rejects a _count that is not a positive integer', async () => {
      req.query = { _count: 'lots' };
      await controller.v1.search(req, res);
      expect(status()).to.equal(400);
      expect(body().issue[0].diagnostics).to.equal('_count must be a positive integer.');
    });

    it('takes the last value of a repeated parameter rather than guessing at AND', async () => {
      req.query = { name: ['mary', 'grace'] };
      search.resolves({ resources: [], cursor: null });
      await controller.v1.search(req, res);
      expect(search.args[0][2]).to.deep.equal({ name: 'grace' });
    });

    it('surfaces a planning refusal as a 400', async () => {
      req.query = { name: 'ma' };
      search.resolves({ error: 'The name search parameter needs at least 3 characters.' });
      await controller.v1.search(req, res);
      expect(status()).to.equal(400);
      expect(body().issue[0].diagnostics).to.equal('The name search parameter needs at least 3 characters.');
    });

    it('answers 404 for an unconfigured resource type', async () => {
      const bindings = facadeConfig().bindings.map(binding => ({ ...binding, observations: {} }));
      getFacade.returns({ config: facadeConfig({ bindings }), diagnostics: [] });
      req.params = { resourceType: 'Observation' };
      await controller.v1.search(req, res);
      expect(status()).to.equal(404);
      expect(search.callCount).to.equal(0);
    });

    it('searches Observations, which no binding owns directly', async () => {
      req.params = { resourceType: 'Observation' };
      req.originalUrl = '/api/v1/fhir/Observation?encounter=Encounter/r1';
      req.query = { encounter: 'Encounter/r1' };
      search.resolves({ resources: [{ resourceType: 'Observation', id: 'r1.u-lmp-date' }], cursor: null });
      await controller.v1.search(req, res);
      expect(status()).to.equal(200);
      expect(body().entry[0].fullUrl).to.equal(`${SERVICE_BASE}/Observation/r1.u-lmp-date`);
    });
  });
});
