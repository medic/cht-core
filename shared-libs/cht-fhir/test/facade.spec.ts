import { expect } from 'chai';
import {
  type FacadeConfig,
  type ResourceBinding,
  DEFAULT_PAGE_SIZE,
  RESOURCE_TYPES,
  buildCapabilityStatement,
  findElementSpec,
  loadConfig,
  operationOutcome,
  planRead,
  planSearch,
  searchsetBundle,
  sourceMatchKey,
} from '../src/index';
import {
  CANONICAL_BASE,
  ENCOUNTER_KEY,
  PATIENT_KEY,
  encounterBinding,
  mapping,
  mappingWith,
} from './fixtures';

const SERVICE_BASE = 'https://cht.example.org/api/v1/fhir';
const NOW = '2026-09-07T00:00:00.000Z';

const load = (raw: unknown = mapping()) => {
  const { config } = loadConfig(raw);
  if (!config) {
    throw new Error('fixture failed to load');
  }
  return config;
};

const bindingOf = (config: FacadeConfig, key: string): ResourceBinding => {
  const binding = config.bindings.find(candidate => candidate.key === key);
  if (!binding) {
    throw new Error(`no binding ${key}`);
  }
  return binding;
};

/** The resource types a CapabilityStatement built from this config declares. */
const declaredTypes = (config: FacadeConfig) => {
  const statement = buildCapabilityStatement({ config, serviceBase: SERVICE_BASE, now: NOW });
  const rest = (statement.rest as Record<string, unknown>[])[0];
  return (rest.resource as Record<string, unknown>[]).map(resource => resource.type);
};

describe('cht-fhir catalog', () => {
  const apply = (resourceType: 'Patient' | 'Encounter', elementId: string) => {
    const spec = findElementSpec(resourceType, elementId);
    if (!spec) {
      throw new Error(`no element ${elementId}`);
    }
    return spec.apply;
  };

  it('finds a spec by id and reports an unknown one', () => {
    expect(findElementSpec('Patient', 'Patient.gender')?.id).to.equal('Patient.gender');
    expect(findElementSpec('Patient', 'Patient.nope')).to.equal(undefined);
    // Observation is projected, so nothing on it is bindable.
    expect(findElementSpec('Observation', 'Observation.code')).to.equal(undefined);
  });

  it('gives every element a unique id', () => {
    // `findElementSpec` returns the first match, so a duplicate would be unreachable.
    for (const [type, { elements }] of Object.entries(RESOURCE_TYPES)) {
      const ids = elements.map(spec => spec.id);
      expect(new Set(ids).size, type).to.equal(ids.length);
    }
  });

  it('supplies a display for an encounter class it knows, and passes the rest through', () => {
    const applied = (code: string) => {
      const draft: Record<string, unknown> = {};
      apply('Encounter', 'Encounter.class')(draft, code);
      return draft.class as Record<string, unknown>;
    };
    expect(applied('HH')).to.deep.equal({
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'HH',
      display: 'home health',
    });
    expect(applied('XX')).to.not.have.property('display');
  });

  it('claims the phone slice rather than the first contact point', () => {
    const draft: Record<string, unknown> = { telecom: [{ system: 'email', value: 'a@b' }] };
    apply('Patient', 'Patient.telecom.phone')(draft, '+254700000001');
    expect(draft.telecom).to.deep.equal([
      { system: 'email', value: 'a@b' },
      { system: 'phone', value: '+254700000001' },
    ]);
  });

  it('accumulates a repeatable element rather than overwriting it', () => {
    const reasonCode = apply('Encounter', 'Encounter.reasonCode');
    const draft: Record<string, unknown> = {};
    reasonCode(draft, 'first');
    reasonCode(draft, { system: 'http://snomed.info/sct', code: '185389009' });
    expect(draft.reasonCode).to.deep.equal([
      { text: 'first' },
      { coding: [{ system: 'http://snomed.info/sct', code: '185389009' }] },
    ]);

    // `given` repeats inside the one HumanName rather than adding a second name.
    const given = apply('Patient', 'Patient.name.given');
    const patient: Record<string, unknown> = {};
    given(patient, 'Ada');
    given(patient, 'Byron');
    expect(patient.name).to.deep.equal([{ given: ['Ada', 'Byron'] }]);
  });
});

describe('cht-fhir query planning', () => {
  describe('planRead', () => {
    it('reads a person for a Patient, and a report for anything projected from one', () => {
      expect(planRead('Patient', 'c1')).to.deep.equal({ kind: 'read', op: 'person', uuid: 'c1' });
      expect(planRead('Encounter', 'r1')).to.deep.equal({ kind: 'read', op: 'report', uuid: 'r1' });
      expect(planRead('Observation', 'r1')).to.deep.equal({ kind: 'read', op: 'report', uuid: 'r1' });
    });
  });

  describe('planSearch', () => {
    const config = load();
    const request = (params: Record<string, string>, cursor: string | null = null) => {
      return { params, cursor, limit: DEFAULT_PAGE_SIZE };
    };

    it('pages persons by the bound contact type', () => {
      expect(planSearch(config, 'Patient', request({}, 'c1'))).to.deep.equal({
        ok: true,
        plan: { kind: 'person-by-type', contactType: 'person', cursor: 'c1', limit: DEFAULT_PAGE_SIZE },
      });
    });

    it('searches a name through freetext, trimmed', () => {
      expect(planSearch(config, 'Patient', request({ name: '  mary  ' }))).to.deep.equal({
        ok: true,
        plan: {
          kind: 'contact-by-type-freetext',
          contactType: 'person',
          freetext: 'mary',
          cursor: null,
          limit: DEFAULT_PAGE_SIZE,
        },
      });
    });

    it('refuses a freetext search the datasource would reject, counting after the trim', () => {
      const refusal = { ok: false, message: 'The name search parameter needs at least 3 characters.' };
      expect(planSearch(config, 'Patient', request({ name: 'ma' }))).to.deep.equal(refusal);
      expect(planSearch(config, 'Patient', request({ name: '  ma  ' }))).to.deep.equal(refusal);
    });

    it('spans every bound form, by its bare code, in one report query', () => {
      const delivery = 'Encounter/form/app:delivery';
      const twoForms = load(mappingWith({ resources: { [delivery]: encounterBinding() } }));
      expect(planSearch(twoForms, 'Encounter', request({}))).to.deep.equal({
        ok: true,
        plan: { kind: 'report-by-forms', forms: ['pregnancy', 'delivery'], cursor: null, limit: DEFAULT_PAGE_SIZE },
      });
    });

    it('searches Observations only over the forms that project any', () => {
      const raw = mappingWith({
        resources: { 'Encounter/form/app:delivery': { ...encounterBinding(), observations: {} } },
      });
      const planned = planSearch(load(raw), 'Observation', request({}));
      expect(planned.ok && planned.plan).to.deep.include({ kind: 'report-by-forms', forms: ['pregnancy'] });
    });

    it('resolves an encounter parameter to a single report read, however the reference is spelled', () => {
      for (const encounter of ['Encounter/r1', 'r1', 'https://cht.example.org/api/v1/fhir/Encounter/r1']) {
        expect(planSearch(config, 'Observation', request({ encounter })), encounter).to.deep.equal({
          ok: true,
          plan: { kind: 'read', op: 'report', uuid: 'r1' },
        });
      }
    });
  });
});

describe('cht-fhir conformance', () => {
  const config = load();

  it('declares the resource types actually served, Observation included', () => {
    expect(declaredTypes(config)).to.deep.equal(['Patient', 'Encounter', 'Observation']);
  });

  it('omits Observation when no binding projects any', () => {
    const raw = mapping() as Record<string, any>;
    raw.facade.resources[ENCOUNTER_KEY].observations = {};
    expect(declaredTypes(load(raw))).to.deep.equal(['Patient', 'Encounter']);
  });

  it('omits a resource type nothing binds', () => {
    const encounterOnly = load(mapping({ resources: { [ENCOUNTER_KEY]: encounterBinding() } }));
    expect(declaredTypes(encounterOnly)).to.deep.equal(['Encounter', 'Observation']);
  });

  it('orders the resource types from the people outwards, whatever order they were bound in', () => {
    const reversed = mapping() as Record<string, any>;
    reversed.facade.resources = {
      [ENCOUNTER_KEY]: reversed.facade.resources[ENCOUNTER_KEY],
      [PATIENT_KEY]: reversed.facade.resources[PATIENT_KEY],
    };
    expect(declaredTypes(load(reversed))).to.deep.equal(['Patient', 'Encounter', 'Observation']);
  });

  describe('CapabilityStatement', () => {
    const statement = buildCapabilityStatement({
      config,
      serviceBase: SERVICE_BASE,
      now: NOW,
      softwareVersion: '5.3.0',
    });

    it('offers read and search on each type, with the search parameters the catalog implements', () => {
      const rest = (statement.rest as Record<string, unknown>[])[0];
      for (const resource of rest.resource as Record<string, any>[]) {
        expect(resource.interaction, resource.type).to.deep.equal([{ code: 'read' }, { code: 'search-type' }]);
      }
      const names = Object.fromEntries((rest.resource as Record<string, any>[])
        .map(resource => [resource.type, resource.searchParam.map((param: { name: string }) => param.name)]));
      expect(names).to.deep.equal({
        Patient: ['_id', 'name'],
        Encounter: ['_id'],
        Observation: ['_id', 'encounter'],
      });
    });

    it('canonicalises itself against the configured base, not the request host', () => {
      expect(statement.url).to.equal(`${CANONICAL_BASE}/CapabilityStatement/cht-facade`);
      expect(statement.implementation).to.deep.equal({ description: 'CHT FHIR Facade', url: SERVICE_BASE });
      const slashed = buildCapabilityStatement({
        config: { ...config, canonicalBase: `${CANONICAL_BASE}//` },
        serviceBase: SERVICE_BASE,
        now: NOW,
      });
      expect(slashed.url).to.equal(`${CANONICAL_BASE}/CapabilityStatement/cht-facade`);
    });

    it('names the software version only when it is known', () => {
      expect(statement.software).to.deep.equal({ name: 'CHT Core', version: '5.3.0' });
      const bare = buildCapabilityStatement({ config, serviceBase: SERVICE_BASE, now: NOW });
      expect(bare.software).to.deep.equal({ name: 'CHT Core' });
    });
  });

  describe('searchsetBundle', () => {
    const resources = [
      { resourceType: 'Patient', id: 'p1' },
      { resourceType: 'Patient', id: 'p2' },
    ];

    it('builds fullUrls against the service base and marks entries as matches', () => {
      const bundle = searchsetBundle(resources, SERVICE_BASE, [
        { relation: 'self', url: `${SERVICE_BASE}/Patient` },
      ]);
      expect(bundle.resourceType).to.equal('Bundle');
      expect(bundle.type).to.equal('searchset');
      expect(bundle.entry).to.deep.equal([
        { fullUrl: `${SERVICE_BASE}/Patient/p1`, resource: resources[0], search: { mode: 'match' } },
        { fullUrl: `${SERVICE_BASE}/Patient/p2`, resource: resources[1], search: { mode: 'match' } },
      ]);
    });

    it('omits total unless the caller genuinely knows it', () => {
      // A view page cannot report a match count, and a client acts on total.
      expect(searchsetBundle(resources, SERVICE_BASE, [])).to.not.have.property('total');
      expect(searchsetBundle(resources, SERVICE_BASE, [], 2)).to.have.property('total', 2);
    });
  });

  describe('operationOutcome', () => {
    it('builds a single-issue outcome at error severity', () => {
      expect(operationOutcome('not-found', 'Patient/x not found')).to.deep.equal({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient/x not found' }],
      });
    });
  });
});

describe('cht-fhir sourceMatchKey', () => {
  const config = load();

  it('strips the namespace prefix a form binding key carries', () => {
    // A report's `form` is the bare code, not the tool's `app:pregnancy`.
    expect(sourceMatchKey(bindingOf(config, ENCOUNTER_KEY))).to.equal('pregnancy');
    const bare = load(mapping({ resources: { 'Encounter/form/delivery': encounterBinding() } }));
    expect(sourceMatchKey(bare.bindings[0])).to.equal('delivery');
  });

  it('uses a contact type id verbatim', () => {
    expect(sourceMatchKey(bindingOf(config, PATIENT_KEY))).to.equal('person');
  });
});
