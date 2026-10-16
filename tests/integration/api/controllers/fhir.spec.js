const { expect } = require('chai');
const uuid = require('uuid').v7;
const { CONTACT_TYPES, USER_ROLES } = require('@medic/constants');
const utils = require('@utils');
const personFactory = require('@factories/cht/contacts/person');
const placeFactory = require('@factories/cht/contacts/place');
const reportFactory = require('@factories/cht/reports/generic-report');
const userFactory = require('@factories/cht/users/users');

/**
 * These cover what the unit tests structurally cannot: the facade against a
 * real instance and a real cht-datasource. Specifically that a contact-type
 * page and a form page return documents rather than counts, that a cursor
 * round-trips through a `next` link, and that the permission checks hold.
 */
describe('FHIR facade API', () => {
  const BASE = '/api/v1/fhir';
  const CANONICAL_BASE = 'http://example.org/cht/fhir';
  // The permission is granted to both roles; only the user also given the
  // online role (USER_ROLES.ONLINE) is online, which isolates "online without
  // the permission" from "has the permission but is offline".
  const ONLINE_ROLE = 'data_entry';
  const OFFLINE_ROLE = 'chw';

  const placeMap = utils.deepFreeze(placeFactory.generateHierarchy());
  const place1 = utils.deepFreeze(placeMap.get(CONTACT_TYPES.HEALTH_CENTER));
  const place2 = utils.deepFreeze(placeMap.get('district_hospital'));
  const place0 = utils.deepFreeze({
    ...placeMap.get(CONTACT_TYPES.CLINIC),
    parent: { _id: place1._id, parent: { _id: place2._id } },
  });
  const parent = utils.deepFreeze({
    _id: place0._id,
    parent: { _id: place1._id, parent: { _id: place2._id } },
  });

  const chw = utils.deepFreeze(personFactory.build({ name: 'CHW Jane', role: 'chw', parent }));
  const patientId = uuid();
  const patient = utils.deepFreeze(personFactory.build({
    name: 'Mary Smith',
    sex: 'female',
    // Deliberately unpadded: CHT writes this shape and FHIR rejects it.
    date_of_birth: '1991-11-6',
    phone: '+254700000000',
    patient_id: patientId,
    role: 'patient',
    parent,
  }));
  const otherPatient = utils.deepFreeze(personFactory.build({
    name: 'Peter Jones',
    sex: 'male',
    patient_id: uuid(),
    role: 'patient',
    parent,
  }));

  // The factory writes the patient's uuid to `fields.patient_uuid`.
  const buildPregnancy = (weight) => utils.deepFreeze(reportFactory.report().build(
    { form: 'pregnancy' },
    { patient, submitter: chw, fields: { vitals: { weight_kg: weight } } },
  ));
  const report0 = buildPregnancy('62.5');
  const report1 = buildPregnancy('63.5');
  const unmappedReport = utils.deepFreeze(reportFactory.report().build(
    { form: 'death_report' },
    { patient, submitter: chw },
  ));

  const fhirUser = utils.deepFreeze(userFactory.build({
    username: 'online-fhir',
    place: place1._id,
    contact: { _id: 'fixture:user:online-fhir', name: 'FHIR User' },
    roles: [USER_ROLES.ONLINE, ONLINE_ROLE],
  }));
  const noPermsUser = utils.deepFreeze(userFactory.build({
    username: 'online-no-fhir',
    place: place1._id,
    contact: { _id: 'fixture:user:online-no-fhir', name: 'No FHIR User' },
    roles: [USER_ROLES.ONLINE],
  }));
  const offlineUser = utils.deepFreeze(userFactory.build({
    username: 'offline-fhir',
    place: place0._id,
    contact: { _id: 'fixture:user:offline-fhir', name: 'Offline User' },
    roles: [OFFLINE_ROLE],
  }));

  const mapping = {
    facade: {
      canonicalBase: CANONICAL_BASE,
      resources: {
        'Patient/contact_type/person': {
          sourceFilter: { source: { kind: 'doc', path: 'doc.role' }, op: 'eq', value: 'patient' },
          elements: {
            'Patient.name.text': { source: { kind: 'doc', path: 'doc.name' } },
            'Patient.gender': { source: { kind: 'doc', path: 'doc.sex' } },
            'Patient.birthDate': { source: { kind: 'doc', path: 'doc.date_of_birth' } },
            'Patient.telecom.phone': { source: { kind: 'doc', path: 'doc.phone' } },
          },
          identifiers: [{
            system: '{base}/identifier/patient-id',
            use: 'official',
            source: { kind: 'doc', path: 'doc.patient_id' },
          }],
        },
        'Encounter/form/app:pregnancy': {
          elements: {
            'Encounter.status': { source: { kind: 'const', value: 'finished' } },
            'Encounter.class': { source: { kind: 'const', value: 'HH' } },
            'Encounter.period.start': { source: { kind: 'doc', path: 'doc.reported_date' } },
            'Encounter.subject': { source: { kind: 'doc', path: 'doc.fields.patient_uuid' } },
            'Encounter.participant.individual': { source: { kind: 'doc', path: 'doc.contact._id' } },
          },
          observations: {
            'app:pregnancy/weight_kg': {
              include: true,
              codeSource: 'question-mapping',
              valueMode: 'valueQuantity',
              unit: { system: 'http://unitsofmeasure.org', code: 'kg', display: 'kg' },
              source: { kind: 'field', path: 'vitals.weight_kg' },
            },
          },
        },
      },
    },
    questionMappings: {
      'app:pregnancy/weight_kg': { system: 'http://loinc.org', code: '29463-7', display: 'Body weight' },
    },
  };

  /**
   * The facade answers `application/fhir+json`, which `utils.request` does not
   * parse, so every response is parsed here — after checking the content type,
   * which is part of the contract for errors as much as for resources.
   */
  const fhirRequest = async (path, { qs, user = fhirUser, noAuth = false } = {}) => {
    const response = await utils.request({
      path: `${BASE}${path}`,
      qs,
      noAuth,
      auth: { username: user.username, password: user.password },
      resolveWithFullResponse: true,
    });
    expect(response.headers.get('content-type')).to.match(/^application\/fhir\+json/);
    return { status: response.status, body: JSON.parse(response.body) };
  };

  const get = async (path, qs) => {
    const { status, body } = await fhirRequest(path, { qs });
    expect(status, JSON.stringify(body)).to.equal(200);
    return body;
  };

  /** Asserts an OperationOutcome response and returns its diagnostics. */
  const expectOutcome = ({ status, body }, expectedStatus, code) => {
    expect(status, JSON.stringify(body)).to.equal(expectedStatus);
    expect(body.resourceType).to.equal('OperationOutcome');
    expect(body.issue).to.have.length(1);
    expect(body.issue[0]).to.include({ severity: 'error', code });
    return body.issue[0].diagnostics;
  };

  before(async () => {
    await utils.saveDocs([place0, place1, place2, chw, patient, otherPatient]);
    await utils.saveDocs([report0, report1, unmappedReport]);
    await utils.createUsers([fhirUser, noPermsUser, offlineUser]);
    await utils.updatePermissions(
      [ONLINE_ROLE, OFFLINE_ROLE],
      ['can_access_fhir_api'],
      [],
      { ignoreReload: true },
    );
    await utils.updateSettings({ fhir: mapping }, { ignoreReload: true });
  });

  after(async () => {
    await utils.revertSettings(true);
    await utils.revertDb([], true);
    await utils.deleteUsers([fhirUser, noPermsUser, offlineUser]);
  });

  describe('authorization', () => {
    it('refuses an unauthenticated request', async () => {
      expectOutcome(await fhirRequest(`/Patient/${patient._id}`, { noAuth: true }), 401, 'login');
      expectOutcome(await fhirRequest('/Encounter', { noAuth: true }), 401, 'login');
    });

    [
      ['an online user without the permission', noPermsUser],
      ['an offline user even with the permission', offlineUser],
    ].forEach(([description, user]) => {
      it(`refuses ${description}`, async () => {
        for (const path of ['/metadata', `/Patient/${patient._id}`, '/Encounter']) {
          const diagnostics = expectOutcome(await fhirRequest(path, { user }), 403, 'forbidden');
          expect(diagnostics).to.equal('Insufficient privileges');
        }
      });
    });
  });

  describe('GET /metadata', () => {
    it('declares the configured resource types and their search parameters', async () => {
      const statement = await get('/metadata');
      expect(statement.resourceType).to.equal('CapabilityStatement');
      expect(statement.fhirVersion).to.equal('4.0.1');
      expect(statement.url).to.equal(`${CANONICAL_BASE}/CapabilityStatement/cht-facade`);
      const [rest] = statement.rest;
      const searchParams = Object.fromEntries(rest.resource.map(resource => [
        resource.type,
        resource.searchParam.map(param => param.name),
      ]));
      expect(searchParams).to.deep.equal({
        Patient: ['_id', 'name'],
        Encounter: ['_id'],
        Observation: ['_id', 'encounter'],
      });
      expect(rest.resource.map(resource => resource.type)).to.deep.equal(['Patient', 'Encounter', 'Observation']);
    });
  });

  describe('GET /Patient', () => {
    it('reads a patient, padding the date and lowercasing the gender', async () => {
      const resource = await get(`/Patient/${patient._id}`);
      expect(resource).to.deep.include({
        resourceType: 'Patient',
        id: patient._id,
        gender: 'female',
        birthDate: '1991-11-06',
      });
      expect(resource.name).to.deep.equal([{ text: 'Mary Smith' }]);
      expect(resource.telecom).to.deep.equal([{ system: 'phone', value: '+254700000000' }]);
      expect(resource.identifier).to.deep.equal([{
        system: `${CANONICAL_BASE}/identifier/patient-id`,
        value: patientId,
        use: 'official',
      }]);
    });

    it('refuses a contact the source filter excludes', async () => {
      // The CHW is a person but not a patient, so the filter must reject it.
      const diagnostics = expectOutcome(await fhirRequest(`/Patient/${chw._id}`), 404, 'not-found');
      expect(diagnostics).to.equal(`Patient/${chw._id} not found.`);
    });

    it('pages the contact type, returning documents rather than a count', async () => {
      const bundle = await get('/Patient');
      expect(bundle.resourceType).to.equal('Bundle');
      expect(bundle.type).to.equal('searchset');
      const ids = bundle.entry.map(entry => entry.resource.id);
      expect(ids).to.include(patient._id);
      expect(ids).to.include(otherPatient._id);
      expect(ids).to.not.include(chw._id);
      expect(bundle.entry[0].search).to.deep.equal({ mode: 'match' });
      expect(bundle.entry[0].fullUrl).to.contain(`/api/v1/fhir/Patient/${bundle.entry[0].resource.id}`);
    });

    it('finds a patient by _id as a one-entry searchset', async () => {
      const bundle = await get('/Patient', { _id: patient._id });
      expect(bundle.total).to.equal(1);
      expect(bundle.entry.map(entry => entry.resource.id)).to.deep.equal([patient._id]);
    });

    it('pages with an opaque cursor carried in the next link', async () => {
      // The source filter is applied to each page after it is fetched, so a
      // page may come back short of `_count`. Follow the links to the end
      // rather than counting entries on any one page.
      const seen = [];
      let pages = 0;
      let qs = { _count: 1 };
      while (qs) {
        const bundle = await get('/Patient', qs);
        pages++;
        expect(bundle.entry.length).to.be.at.most(1);
        seen.push(...bundle.entry.map(entry => entry.resource.id));
        const next = bundle.link.find(link => link.relation === 'next');
        qs = next && Object.fromEntries(new URL(next.url).searchParams);
      }
      expect(pages).to.be.greaterThan(1);
      expect(seen).to.include.members([patient._id, otherPatient._id]);
      expect(seen).to.not.include(chw._id);
      expect(new Set(seen).size).to.equal(seen.length);
    });

    it('finds a patient by name through the freetext index', async () => {
      const bundle = await get('/Patient', { name: 'Mary' });
      expect(bundle.entry.map(entry => entry.resource.id)).to.deep.equal([patient._id]);
    });

    it('rejects a freetext search the index cannot serve', async () => {
      const diagnostics = expectOutcome(await fhirRequest('/Patient', { qs: { name: 'Ma' } }), 400, 'invalid');
      expect(diagnostics).to.equal('The name search parameter needs at least 3 characters.');
    });

    it('rejects an unsupported search parameter', async () => {
      const response = await fhirRequest('/Patient', { qs: { birthdate: '1991-11-06' } });
      expect(expectOutcome(response, 400, 'invalid')).to.equal(
        'Patient does not support the search parameter birthdate. Supported: _id, name.',
      );
    });
  });

  describe('GET /Encounter', () => {
    it('reads a report as an Encounter', async () => {
      const resource = await get(`/Encounter/${report0._id}`);
      expect(resource).to.deep.include({ resourceType: 'Encounter', id: report0._id, status: 'finished' });
      expect(resource.class).to.deep.equal({
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'HH',
        display: 'home health',
      });
      expect(resource.subject).to.deep.equal({ reference: `Patient/${patient._id}` });
      expect(resource.participant).to.deep.equal([{ individual: { reference: `Practitioner/${chw._id}` } }]);
      expect(resource.period).to.deep.equal({ start: new Date(report0.reported_date).toISOString() });
    });

    it('refuses a report whose form is not bound', async () => {
      expectOutcome(await fhirRequest(`/Encounter/${unmappedReport._id}`), 404, 'not-found');
    });

    it('pages the bound forms, returning documents rather than a count', async () => {
      const bundle = await get('/Encounter');
      const ids = bundle.entry.map(entry => entry.resource.id);
      expect(ids).to.have.members([report0._id, report1._id]);
      expect(ids).to.not.include(unmappedReport._id);
    });
  });

  describe('GET /Observation', () => {
    const observationId = () => `${report0._id}.29463-7`;

    it('projects a report field into an Observation', async () => {
      const bundle = await get('/Observation', { encounter: `Encounter/${report0._id}` });
      expect(bundle.entry).to.have.length(1);
      const resource = bundle.entry[0].resource;
      expect(resource).to.deep.include({
        resourceType: 'Observation',
        id: observationId(),
        status: 'final',
      });
      expect(resource.category[0].coding).to.deep.equal([{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'survey',
        display: 'Survey',
      }]);
      expect(resource.code.coding).to.deep.equal([{
        system: 'http://loinc.org',
        code: '29463-7',
        display: 'Body weight',
      }]);
      expect(resource.subject).to.deep.equal({ reference: `Patient/${patient._id}` });
      expect(resource.encounter).to.deep.equal({ reference: `Encounter/${report0._id}` });
      // The stored string '62.5' has to arrive as a number.
      expect(resource.valueQuantity).to.deep.equal({
        value: 62.5,
        unit: 'kg',
        system: 'http://unitsofmeasure.org',
        code: 'kg',
      });
    });

    it('reads back the same Observation by its synthesised id', async () => {
      const resource = await get(`/Observation/${observationId()}`);
      expect(resource.id).to.equal(observationId());
      expect(resource.valueQuantity.value).to.equal(62.5);
    });

    it('answers 404 for an id naming no projected code', async () => {
      expectOutcome(await fhirRequest(`/Observation/${report0._id}.8480-6`), 404, 'not-found');
    });
  });

  describe('resource types the facade does not serve', () => {
    it('answers 404 rather than pretending to serve them', async () => {
      // A real FHIR resource type the facade has no catalog for at all.
      const search = expectOutcome(await fhirRequest('/Condition'), 404, 'not-found');
      expect(search).to.equal('Condition is not configured on this server.');
      expectOutcome(await fhirRequest(`/Condition/${patient._id}`), 404, 'not-found');
    });
  });

  // Last, because these replace the mapping every test above reads.
  describe('without a usable mapping', () => {
    it('answers 503 for a mapping that will not load, pointing at the API logs', async () => {
      await utils.updateSettings({ fhir: { facade: { resources: {} } } }, { ignoreReload: true });
      for (const path of ['/metadata', `/Patient/${patient._id}`]) {
        const diagnostics = expectOutcome(await fhirRequest(path), 503, 'transient');
        expect(diagnostics).to.equal('The FHIR mapping for this server is not usable. See the API logs for why.');
      }
    });

    it('answers 404 when no mapping is configured', async () => {
      // Not `revertSettings`: that would also revert the permission this user needs.
      await utils.updateSettings({ fhir: null }, { ignoreReload: true });
      for (const path of ['/metadata', '/Patient']) {
        const diagnostics = expectOutcome(await fhirRequest(path), 404, 'not-found');
        expect(diagnostics).to.equal(
          'This server has no FHIR mapping configured, so the FHIR facade is not enabled.',
        );
      }
    });
  });
});
