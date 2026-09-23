const sinon = require('sinon');
const { expect } = require('chai');
const logger = require('@medic/logger');
const { Contact, Person, Qualifier, Report } = require('@medic/cht-datasource');
const dataContext = require('../../../src/services/data-context');
const config = require('../../../src/config');
const CANONICAL_BASE = 'http://example.org/cht/fhir';
const PATIENT_KEY = 'Patient/contact_type/person';
const ENCOUNTER_KEY = 'Encounter/form/app:pregnancy';
const PATIENT_UUID = '11111111-2222-3333-4444-555555555555';
const REPORT_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const mapping = () => ({
  questionMappings: {
    'app:pregnancy/weight_kg': {
      code: '29463-7',
      display: 'Body weight',
      system: 'http://loinc.org',
      status: 'confirmed',
    },
  },
  adHocCodeSystem: {
    canonical: `${CANONICAL_BASE}/CodeSystem/cht-fields`,
    codes: { 'app:pregnancy/u_lmp_date': { code: 'u-lmp-date', display: 'LMP date' } },
  },
  facade: {
    canonicalBase: CANONICAL_BASE,
    resources: {
      [PATIENT_KEY]: {
        resourceType: 'Patient',
        source: { kind: 'contact_type', id: 'person' },
        sourceFilter: null,
        elements: {
          'Patient.name.text': { source: { kind: 'doc', path: 'doc.name' } },
          'Patient.gender': { source: { kind: 'doc', path: 'doc.sex' } },
        },
        identifiers: [],
        observations: {},
      },
      [ENCOUNTER_KEY]: {
        resourceType: 'Encounter',
        source: { kind: 'form', id: 'app:pregnancy' },
        sourceFilter: null,
        elements: {
          'Encounter.status': { source: { kind: 'const', value: 'finished' } },
          'Encounter.class': { source: { kind: 'const', value: 'HH' } },
          'Encounter.period.start': { source: { kind: 'doc', path: 'doc.reported_date' } },
          'Encounter.subject': { source: { kind: 'doc', path: 'doc.fields.patient_uuid' } },
        },
        identifiers: [],
        observations: {
          'app:pregnancy/weight_kg': {
            codeSource: 'question-mapping',
            include: true,
            valueMode: 'valueQuantity',
            source: { kind: 'field', path: 'vitals.weight_kg' },
          },
        },
      },
    },
  },
});

const personDoc = () => ({
  _id: PATIENT_UUID,
  _rev: '1-a',
  type: 'person',
  name: 'Mary Smith',
  sex: 'female',
  patient_id: '10072',
});

const reportDoc = () => ({
  _id: REPORT_UUID,
  _rev: '1-b',
  type: 'data_record',
  form: 'pregnancy',
  reported_date: 1700000000000,
  fields: { patient_uuid: PATIENT_UUID, vitals: { weight_kg: '62.5' } },
});

describe('FHIR service', () => {
  const sandbox = sinon.createSandbox();
  const personGet = sandbox.stub();
  const reportGet = sandbox.stub();
  const personPage = sandbox.stub();
  const contactPage = sandbox.stub();
  const contactUuidsPage = sandbox.stub();
  const reportPage = sandbox.stub();
  const reportUuidsPage = sandbox.stub();

  let service;
  let settings;

  before(() => {
    // The service binds lazily, so requiring it issues no query and the
    // per-test `dataContext.bind` stub below is what it ends up using.
    service = require('../../../src/services/fhir');
  });

  beforeEach(() => {
    const bind = sinon.stub(dataContext, 'bind');
    bind.withArgs(Person.v1.get).returns(personGet);
    bind.withArgs(Report.v1.get).returns(reportGet);
    bind.withArgs(Person.v1.getPage).returns(personPage);
    bind.withArgs(Contact.v1.getPage).returns(contactPage);
    bind.withArgs(Contact.v1.getUuidsPage).returns(contactUuidsPage);
    bind.withArgs(Report.v1.getPage).returns(reportPage);
    bind.withArgs(Report.v1.getUuidsPage).returns(reportUuidsPage);
    settings = { fhir: mapping() };
    sinon.stub(config, 'get').callsFake(key => (key ? settings[key] : settings));
    sinon.stub(logger, 'error');
    sinon.stub(logger, 'warn');
    sinon.stub(logger, 'debug');
  });

  afterEach(() => {
    sinon.restore();
    sandbox.reset();
  });

  /** A second form served as an Encounter, so a plan spans more than one. */
  const withSecondEncounterForm = () => {
    settings.fhir.facade.resources['Encounter/form/app:delivery'] = {
      ...mapping().facade.resources[ENCOUNTER_KEY],
      source: { kind: 'form', id: 'app:delivery' },
    };
  };

  const facade = () => {
    const { config: loaded } = service.getFacade();
    expect(loaded, 'fixture failed to load').to.not.equal(null);
    return loaded;
  };

  describe('getFacade', () => {
    it('loads the configured mapping', () => {
      expect(facade().bindings.map(binding => binding.key)).to.have.members([PATIENT_KEY, ENCOUNTER_KEY]);
    });

    it('re-parses only when the settings object changes', () => {
      const first = service.getFacade();
      expect(service.getFacade()).to.equal(first);
      settings = { fhir: mapping() };
      expect(service.getFacade()).to.not.equal(first);
    });

    it('reports a mapping that cannot serve', () => {
      settings = { fhir: { facade: { canonicalBase: null, resources: {} } } };
      const { config: loaded, diagnostics } = service.getFacade();
      expect(loaded).to.equal(null);
      expect(diagnostics.map(diagnostic => diagnostic.ruleId)).to.include('canonical-base-missing');
    });

    it('logs the diagnostics once per settings change, at their severity', () => {
      settings = { fhir: { facade: { canonicalBase: null, resources: {} } } };
      service.getFacade();
      service.getFacade();
      expect(logger.error.args).to.have.length(1);
      expect(logger.error.args[0][0]).to.match(/^FHIR facade config: canonical-base-missing: /);

      settings = { fhir: mapping() };
      settings.fhir.facade.resources[PATIENT_KEY].status = 'disabled';
      service.getFacade();
      expect(logger.error.callCount).to.equal(1);
      expect(logger.debug.args).to.deep.equal([[
        `FHIR facade config: binding-inactive: Binding is disabled and will not be served. (${PATIENT_KEY})`,
      ]]);
    });

    it('distinguishes an absent mapping from a broken one', () => {
      settings = {};
      expect(service.isConfigured()).to.equal(false);
      settings = { fhir: 'nonsense' };
      expect(service.isConfigured()).to.equal(true);
      expect(service.getFacade().config).to.equal(null);
    });
  });

  describe('parseLimit', () => {
    it('defaults, caps and rejects', () => {
      expect(service.parseLimit(undefined)).to.equal(50);
      expect(service.parseLimit('')).to.equal(50);
      expect(service.parseLimit('10')).to.equal(10);
      // Capped rather than refused, so a large _count degrades instead of failing.
      expect(service.parseLimit('100000')).to.equal(500);
      expect(service.parseLimit('0')).to.equal(null);
      expect(service.parseLimit('nope')).to.equal(null);
    });
  });

  describe('read', () => {
    it('reads a Patient through the person datasource', async () => {
      personGet.resolves(personDoc());
      const resource = await service.read(facade(), 'Patient', PATIENT_UUID);
      expect(personGet.args).to.deep.equal([[Qualifier.byUuid(PATIENT_UUID)]]);
      expect(resource).to.deep.include({ resourceType: 'Patient', id: PATIENT_UUID, gender: 'female' });
    });

    it('refuses a document of the wrong contact type', async () => {
      personGet.resolves({ ...personDoc(), type: 'contact', contact_type: 'chw' });
      expect(await service.read(facade(), 'Patient', PATIENT_UUID)).to.equal(null);
    });

    it('returns null when the document does not exist', async () => {
      personGet.resolves(null);
      expect(await service.read(facade(), 'Patient', PATIENT_UUID)).to.equal(null);
    });

    it('serves a report claimed by the second of two Encounter bindings', async () => {
      withSecondEncounterForm();
      reportGet.resolves({ ...reportDoc(), form: 'delivery' });
      const resource = await service.read(facade(), 'Encounter', REPORT_UUID);
      expect(reportGet.callCount).to.equal(1);
      expect(resource).to.deep.include({ resourceType: 'Encounter', id: REPORT_UUID });
    });

    it('refuses a report whose form is not bound to the Encounter', async () => {
      reportGet.resolves({ ...reportDoc(), form: 'death_report' });
      expect(await service.read(facade(), 'Encounter', REPORT_UUID)).to.equal(null);
    });

    it('applies a source filter on read', async () => {
      settings.fhir.facade.resources[PATIENT_KEY].sourceFilter = {
        source: { kind: 'doc', path: 'doc.role' },
        op: 'eq',
        value: 'patient',
      };
      personGet.resolves(personDoc());
      expect(await service.read(facade(), 'Patient', PATIENT_UUID)).to.equal(null);
      personGet.resolves({ ...personDoc(), role: 'patient' });
      expect(await service.read(facade(), 'Patient', PATIENT_UUID)).to.deep.include({ id: PATIENT_UUID });
    });

    it('reads one Observation out of a report', async () => {
      reportGet.resolves(reportDoc());
      const resource = await service.read(facade(), 'Observation', `${REPORT_UUID}.29463-7`);
      expect(reportGet.args).to.deep.equal([[Qualifier.byUuid(REPORT_UUID)]]);
      expect(resource).to.deep.include({
        resourceType: 'Observation',
        id: `${REPORT_UUID}.29463-7`,
        encounter: { reference: `Encounter/${REPORT_UUID}` },
        subject: { reference: `Patient/${PATIENT_UUID}` },
      });
    });

    it('returns null for an Observation id that names no projected code', async () => {
      reportGet.resolves(reportDoc());
      expect(await service.read(facade(), 'Observation', `${REPORT_UUID}.8480-6`)).to.equal(null);
    });

    it('returns null for an unparseable Observation id or a missing report', async () => {
      expect(await service.read(facade(), 'Observation', 'no-dot')).to.equal(null);
      expect(reportGet.callCount).to.equal(0);
      reportGet.resolves(null);
      expect(await service.read(facade(), 'Observation', `${REPORT_UUID}.29463-7`)).to.equal(null);
    });
  });

  describe('search', () => {
    it('pages Patients through the person datasource', async () => {
      personPage.resolves({ data: [personDoc()], cursor: '50' });
      const result = await service.search(facade(), 'Patient', {}, null, 50);
      expect(personPage.args).to.deep.equal([[Qualifier.byContactType('person'), null, 50]]);
      expect(result.resources.map(resource => resource.id)).to.deep.equal([PATIENT_UUID]);
      expect(result.cursor).to.equal('50');
    });

    it('fetches report ids then documents, because getPage takes ids only', async () => {
      reportUuidsPage.resolves({ data: [REPORT_UUID], cursor: null });
      reportPage.resolves({ data: [reportDoc()], cursor: null });
      const result = await service.search(facade(), 'Encounter', {}, null, 50);
      expect(reportUuidsPage.args).to.deep.equal([[Qualifier.byForms(['pregnancy']), null, 50]]);
      expect(reportPage.args).to.deep.equal([[Qualifier.byIds([REPORT_UUID]), null, 1]]);
      expect(result.resources).to.have.length(1);
      expect(result.resources[0]).to.deep.include({
        resourceType: 'Encounter',
        id: REPORT_UUID,
        meta: {
          versionId: '1-b',
          lastUpdated: '2023-11-14T22:13:20.000Z',
        },
        status: 'finished',
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'HH', display: 'home health' },
        subject: { reference: `Patient/${PATIENT_UUID}` },
      });
    });

    it('stops without a document fetch when no ids came back', async () => {
      reportUuidsPage.resolves({ data: [], cursor: null });
      const result = await service.search(facade(), 'Encounter', {}, null, 50);
      expect(reportPage.callCount).to.equal(0);
      expect(result).to.deep.equal({ resources: [], cursor: null });
    });

    it('searches names through freetext then fetches the contacts', async () => {
      contactUuidsPage.resolves({ data: [PATIENT_UUID], cursor: 'bookmark-2' });
      contactPage.resolves({ data: [personDoc()], cursor: null });
      const result = await service.search(facade(), 'Patient', { name: ' mary ' }, null, 50);
      expect(contactUuidsPage.args).to.deep.equal([[
        Qualifier.and(Qualifier.byFreetext('mary'), Qualifier.byContactType('person')),
        null,
        50,
      ]]);
      expect(contactPage.args).to.deep.equal([[Qualifier.byIds([PATIENT_UUID]), null, 1]]);
      expect(result.resources.map(resource => resource.id)).to.deep.equal([PATIENT_UUID]);
    });

    it('rejects a freetext search the index cannot serve', async () => {
      const result = await service.search(facade(), 'Patient', { name: 'ma' }, null, 50);
      expect(result).to.deep.equal({ error: 'The name search parameter needs at least 3 characters.' });
      expect(contactUuidsPage.callCount).to.equal(0);
    });

    it('reads one report when an encounter parameter is given', async () => {
      reportGet.resolves(reportDoc());
      const result = await service.search(facade(), 'Observation', { encounter: `Encounter/${REPORT_UUID}` }, null, 50);
      expect(reportGet.args).to.deep.equal([[Qualifier.byUuid(REPORT_UUID)]]);
      expect(reportUuidsPage.callCount).to.equal(0);
      expect(result.resources.map(resource => resource.id)).to.deep.equal([`${REPORT_UUID}.29463-7`]);
      expect(result.cursor).to.equal(null);
    });

    it('runs a shared plan once, so two Encounter bindings do not double results', async () => {
      withSecondEncounterForm();
      reportUuidsPage.resolves({ data: [REPORT_UUID], cursor: null });
      reportPage.resolves({ data: [reportDoc()], cursor: null });

      const result = await service.search(facade(), 'Encounter', {}, null, 50);
      expect(reportUuidsPage.args).to.deep.equal([[Qualifier.byForms(['pregnancy', 'delivery']), null, 50]]);
      expect(result.resources.map(resource => resource.id)).to.deep.equal([REPORT_UUID]);
    });

    it('projects each Observation once across two Encounter bindings', async () => {
      withSecondEncounterForm();
      reportUuidsPage.resolves({ data: [REPORT_UUID], cursor: null });
      reportPage.resolves({ data: [reportDoc()], cursor: null });
      const result = await service.search(facade(), 'Observation', {}, null, 50);
      expect(reportUuidsPage.args).to.deep.equal([[Qualifier.byForms(['pregnancy', 'delivery']), null, 50]]);
      expect(result.resources.map(resource => resource.id)).to.deep.equal([`${REPORT_UUID}.29463-7`]);
    });

    it('drops a fetched document that no binding claims', async () => {
      reportUuidsPage.resolves({ data: [REPORT_UUID, 'other'], cursor: null });
      reportPage.resolves({
        data: [reportDoc(), { ...reportDoc(), _id: 'other', form: 'death_report' }],
        cursor: null,
      });
      const result = await service.search(facade(), 'Encounter', {}, null, 50);
      expect(result.resources.map(resource => resource.id)).to.deep.equal([REPORT_UUID]);
    });
  });
});
