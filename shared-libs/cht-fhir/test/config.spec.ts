import { expect } from 'chai';
import {
  type ObservationProjection,
  FHIR_ID_PATTERN,
  loadConfig,
  observationId,
  parseObservationId,
  resolveObservationCode,
} from '../src/index';
import {
  CANONICAL_BASE,
  ENCOUNTER_KEY,
  PATIENT_KEY,
  mapping,
  mappingWith,
  patientBinding,
} from './fixtures';

const ruleIds = (diagnostics: readonly { ruleId: string }[]) => diagnostics.map(d => d.ruleId);
const errorsOf = (diagnostics: readonly { severity: string }[]) => diagnostics.filter(d => d.severity === 'error');
const servedKeys = (raw: unknown) => loadConfig(raw).config?.bindings.map(b => b.key);

/**
 * An Observation id is `<reportUuid>.<code>`, a FHIR id is at most 64
 * characters, and a CHT uuid takes up to 36 of them plus the dot.
 */
const OBSERVATION_CODE_MAX_LENGTH = 64 - 36 - 1;

describe('cht-fhir config', () => {
  describe('binding keys', () => {
    it('keeps the colon in a namespaced form id', () => {
      const binding = loadConfig(mapping()).config?.bindings.find(b => b.key === ENCOUNTER_KEY);
      expect(binding).to.deep.include({ resourceType: 'Encounter', sourceKind: 'form', sourceId: 'app:pregnancy' });
    });

    it('decodes a percent-encoded slash and percent in a source id', () => {
      const key = 'Patient/contact_type/a%2Fb%25c';
      const { config } = loadConfig(mapping({ resources: { [key]: patientBinding() } }));
      expect(config?.bindings[0].sourceId).to.equal('a/b%c');
    });

    it('refuses a key it cannot decode, without throwing', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources['Bundle/form/x'] = {};
      raw.facade.resources['Patient/person'] = {};
      raw.facade.resources['Patient/telepathy/person'] = {};
      raw.facade.resources['Encounter/form/'] = {};
      const invalid = loadConfig(raw).diagnostics.filter(d => d.ruleId === 'binding-key-invalid');
      expect(invalid.map(d => d.bindingKey))
        .to.deep.equal(['Bundle/form/x', 'Patient/person', 'Patient/telepathy/person', 'Encounter/form/']);
    });
  });

  describe('loadConfig', () => {
    it('loads the reference mapping with no errors', () => {
      const { config, diagnostics } = loadConfig(mapping());
      expect(errorsOf(diagnostics)).to.deep.equal([]);
      expect(config?.canonicalBase).to.equal(CANONICAL_BASE);
      expect(config?.bindings.map(b => b.key)).to.have.members([PATIENT_KEY, ENCOUNTER_KEY]);
    });

    it('refuses to serve without a canonicalBase, because it will not invent one', () => {
      const { config, diagnostics } = loadConfig(mapping({ canonicalBase: '  ' }));
      expect(config).to.equal(null);
      expect(ruleIds(diagnostics)).to.deep.equal(['canonical-base-missing']);
    });

    it('reports a missing facade block, whatever shape the settings are', () => {
      for (const raw of [{ schemaVersion: 1 }, 'nonsense', null, { facade: { resources: [] } }]) {
        const { config, diagnostics } = loadConfig(raw);
        expect(config, JSON.stringify(raw)).to.equal(null);
        expect(ruleIds(diagnostics), JSON.stringify(raw)).to.deep.equal(['facade-missing']);
      }
    });

    it('tolerates the extras bags a real file carries', () => {
      const raw = mapping() as Record<string, any>;
      raw.extras = {};
      raw.facade.extras = {};
      raw.facade.resources[PATIENT_KEY].extras = {};
      raw.facade.resources[PATIENT_KEY].elements['Patient.gender'].extras = {};
      const { config, diagnostics } = loadConfig(raw);
      expect(errorsOf(diagnostics)).to.deep.equal([]);
      expect(config?.bindings).to.have.length(2);
    });

    it('loads a hand-written binding that leaves out every optional block', () => {
      const raw = mapping() as Record<string, any>;
      const patient = raw.facade.resources[PATIENT_KEY];
      delete patient.sourceFilter;
      delete patient.identifiers;
      delete patient.observations;
      const { config, diagnostics } = loadConfig(raw);
      expect(errorsOf(diagnostics)).to.deep.equal([]);
      expect(config?.bindings.find(b => b.key === PATIENT_KEY))
        .to.deep.include({ sourceFilter: null, identifiers: [], observations: {} });
    });

    it('rejects an expression source instead of evaluating it, dropping only its binding', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.type'].source = {
        kind: 'expr',
        expr: 'doc.form.toUpperCase()',
      };
      const { config, diagnostics } = loadConfig(raw);
      expect(diagnostics.find(d => d.ruleId === 'source-kind-unknown'))
        .to.deep.include({ severity: 'error', bindingKey: ENCOUNTER_KEY });
      // Errors are scoped: the Patient binding still serves.
      expect(config?.bindings.map(b => b.key)).to.deep.equal([PATIENT_KEY]);
    });

    it('reports a binding that is not an object and keeps serving the rest', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources['Patient/contact_type/other'] = 'not-an-object';
      const { config, diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('binding-malformed');
      expect(config?.bindings.map(b => b.key)).to.have.members([PATIENT_KEY, ENCOUNTER_KEY]);
    });

    it('accepts a structured sourceFilter', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[PATIENT_KEY].sourceFilter = {
        source: { kind: 'doc', path: 'doc.role' },
        op: 'in',
        value: ['patient', 'client'],
      };
      const { config, diagnostics } = loadConfig(raw);
      expect(errorsOf(diagnostics)).to.deep.equal([]);
      expect(config?.bindings.find(b => b.key === PATIENT_KEY)?.sourceFilter?.value)
        .to.deep.equal(['patient', 'client']);
    });

    it('drops a stray value from a value-free filter operator', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[PATIENT_KEY].sourceFilter = {
        source: { kind: 'doc', path: 'doc.role' },
        op: 'not-exists',
        value: 'ignored',
      };
      const { config } = loadConfig(raw);
      expect(config?.bindings.find(b => b.key === PATIENT_KEY)?.sourceFilter)
        .to.deep.equal({ source: { kind: 'doc', path: 'doc.role' }, op: 'not-exists' });
    });

    it('requires a source on an included observation', () => {
      const raw = mapping() as Record<string, any>;
      delete raw.facade.resources[ENCOUNTER_KEY].observations['app:pregnancy/weight_kg'].source;
      const { config, diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('source-malformed');
      expect(config?.bindings.map(b => b.key)).to.deep.equal([PATIENT_KEY]);
    });

    it('serves neither an excluded nor an orphaned observation, and does not validate them', () => {
      // The builder keeps both in the file. Neither has a source here, which
      // would be an error on an observation that is served.
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].observations['app:pregnancy/weight_kg'] = { include: false };
      raw.facade.resources[ENCOUNTER_KEY].observations['app:pregnancy/old_field'] = {
        include: true,
        status: 'orphaned',
        codeSource: 'question-mapping',
      };
      const { config, diagnostics } = loadConfig(raw);
      expect(errorsOf(diagnostics)).to.deep.equal([]);
      const encounter = config?.bindings.find(b => b.key === ENCOUNTER_KEY);
      expect(Object.keys(encounter?.observations ?? {})).to.deep.equal(['app:pregnancy/u_lmp_date']);
    });

    it('refuses an ad-hoc observation whose code was never minted', () => {
      const raw = mapping() as Record<string, any>;
      raw.adHocCodeSystem = null;
      const { config, diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('observation-adhoc-code-unminted');
      expect(config?.bindings.map(b => b.key)).to.deep.equal([PATIENT_KEY]);
    });

    it('warns but keeps serving when a question has no standard code', () => {
      const raw = mapping() as Record<string, any>;
      raw.questionMappings = {};
      const { config, diagnostics } = loadConfig(raw);
      expect(diagnostics.find(d => d.ruleId === 'observation-code-unmapped'))
        .to.deep.include({ severity: 'warn', bindingKey: ENCOUNTER_KEY });
      expect(config?.bindings).to.have.length(2);
    });

    it('treats a question mapping a reviewer skipped as unmapped', () => {
      const raw = mapping() as Record<string, any>;
      raw.questionMappings['app:pregnancy/weight_kg'].status = 'skipped';
      const { config, diagnostics } = loadConfig(raw);
      expect(config?.questionMappings).to.deep.equal({});
      expect(ruleIds(diagnostics)).to.include('observation-code-unmapped');
    });

    it('rejects two observations resolving to the same code', () => {
      const raw = mapping() as Record<string, any>;
      raw.adHocCodeSystem.codes['app:pregnancy/weight_kg'] = { code: 'u-lmp-date', display: 'clash' };
      raw.facade.resources[ENCOUNTER_KEY].observations['app:pregnancy/weight_kg'].codeSource = 'ad-hoc';
      const { config, diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('observation-code-duplicate');
      expect(config?.bindings.map(b => b.key)).to.deep.equal([PATIENT_KEY]);
    });

    it('rejects a code that cannot appear in a FHIR id', () => {
      const raw = mapping() as Record<string, any>;
      raw.adHocCodeSystem.codes['app:pregnancy/u_lmp_date'] = { code: 'u_lmp_date', display: 'LMP' };
      const { diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('observation-code-not-id-safe');
    });

    // The code is id-safe on its own; it is the `<reportUuid>.` in front of it
    // that pushes the Observation's id past 64. Without this the Observation is
    // dropped per document at map time, with nothing at load to explain it.
    it('rejects an id-safe code that leaves no room for the report uuid', () => {
      const raw = mapping() as Record<string, any>;
      const code = 'a'.repeat(OBSERVATION_CODE_MAX_LENGTH + 1);
      raw.adHocCodeSystem.codes['app:pregnancy/u_lmp_date'] = { code, display: 'LMP' };
      const { diagnostics } = loadConfig(raw);
      expect(FHIR_ID_PATTERN.test(code)).to.equal(true);
      expect(ruleIds(diagnostics)).to.include('observation-code-too-long');
      expect(ruleIds(diagnostics)).to.not.include('observation-code-not-id-safe');
    });

    it('accepts a code that fits exactly', () => {
      const raw = mapping() as Record<string, any>;
      raw.adHocCodeSystem.codes['app:pregnancy/u_lmp_date'] = {
        code: 'a'.repeat(OBSERVATION_CODE_MAX_LENGTH),
        display: 'LMP',
      };
      const { diagnostics } = loadConfig(raw);
      expect(errorsOf(diagnostics)).to.deep.equal([]);
    });

    it('skips a disabled or orphaned binding without erroring', () => {
      for (const status of ['disabled', 'orphaned']) {
        const raw = mapping() as Record<string, any>;
        raw.facade.resources[ENCOUNTER_KEY].status = status;
        const { config, diagnostics } = loadConfig(raw);
        expect(diagnostics.find(d => d.ruleId === 'binding-inactive'), status)
          .to.deep.include({ severity: 'info', bindingKey: ENCOUNTER_KEY });
        expect(config?.bindings.map(b => b.key), status).to.deep.equal([PATIENT_KEY]);
      }
    });

    it('reports an element that is not in the catalog', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[PATIENT_KEY].elements['Patient.maritalStatus'] = {
        source: { kind: 'doc', path: 'doc.marital_status' },
      };
      const { diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('element-unknown');
    });

    it('reports a source kind the element does not accept', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[PATIENT_KEY].elements['Patient.gender'].source = { kind: 'const', value: 'female' };
      const { diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('element-source-kind-rejected');
    });

    it('reports an unbound required element', () => {
      const raw = mapping() as Record<string, any>;
      delete raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.class'];
      const { diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('required-element-unbound');
    });

    it('refuses a resource type bound to the wrong kind of CHT source', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources['Patient/form/app:pregnancy'] = patientBinding();
      const mismatch = loadConfig(raw).diagnostics.find(d => d.ruleId === 'binding-source-kind-mismatch');
      expect(mismatch?.bindingKey).to.equal('Patient/form/app:pregnancy');
      expect(mismatch?.message).to.contain('bound to a contact_type');
    });

    it('refuses to bind Observation directly, since it is only ever projected', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources['Observation/form/app:pregnancy'] = { elements: {}, observations: {} };
      const mismatch = loadConfig(raw).diagnostics.find(d => d.ruleId === 'binding-source-kind-mismatch');
      expect(mismatch?.bindingKey).to.equal('Observation/form/app:pregnancy');
      expect(mismatch?.message).to.contain('projected from an Encounter');
    });

    it('lets only an Encounter project observations', () => {
      // A projected Observation's encounter is Encounter/<doc uuid>, which is
      // false when the document is a contact.
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[PATIENT_KEY].observations = {
        ...raw.facade.resources[ENCOUNTER_KEY].observations,
      };
      const { config, diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('observations-host-invalid');
      expect(config?.bindings.map(b => b.key)).to.deep.equal([ENCOUNTER_KEY]);
    });

    it('warns, and still serves, when observations have no subject to attach to', () => {
      const raw = mapping() as Record<string, any>;
      delete raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.subject'];
      const { config, diagnostics } = loadConfig(raw);
      expect(diagnostics.find(d => d.ruleId === 'observation-subject-missing'))
        .to.deep.include({ severity: 'warn', bindingKey: ENCOUNTER_KEY });
      expect(config?.bindings).to.have.length(2);
    });

    it('serves one Patient binding and refuses the rest', () => {
      // Datasource cursors from two contact types cannot be merged into one page.
      const second = 'Patient/contact_type/patient';
      const { config, diagnostics } = loadConfig(mappingWith({ resources: { [second]: patientBinding() } }));
      const duplicate = diagnostics.find(d => d.ruleId === 'patient-binding-duplicate');
      expect(duplicate?.bindingKey).to.equal(second);
      expect(duplicate?.message).to.contain(PATIENT_KEY);
      expect(config?.bindings.map(b => b.key)).to.deep.equal([PATIENT_KEY, ENCOUNTER_KEY]);
    });

    it('lets a second Patient binding serve when the first is broken anyway', () => {
      const second = 'Patient/contact_type/patient';
      const raw = mappingWith({ resources: { [second]: patientBinding() } }) as Record<string, any>;
      raw.facade.resources[PATIENT_KEY].elements['Patient.gender'].source = { kind: 'wat' };
      const { config, diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.not.include('patient-binding-duplicate');
      expect(config?.bindings.map(b => b.key)).to.deep.equal([ENCOUNTER_KEY, second]);
    });

    it('reports nothing servable when no binding is left to serve', () => {
      const { config, diagnostics } = loadConfig({
        facade: { canonicalBase: CANONICAL_BASE, resources: { 'Patient/contact_type/p': { status: 'disabled' } } },
      });
      expect(config).to.equal(null);
      expect(ruleIds(diagnostics)).to.include('no-servable-bindings');
    });
  });

  describe('observation ids', () => {
    it('splits on the first dot, so a code containing one survives', () => {
      const id = observationId('aaaa-bbbb', 'Z34.9');
      expect(id).to.equal('aaaa-bbbb.Z34.9');
      expect(parseObservationId(id)).to.deep.equal({ reportUuid: 'aaaa-bbbb', code: 'Z34.9' });
    });

    it('rejects an id with no code or no uuid', () => {
      expect(parseObservationId('no-dot')).to.equal(null);
      expect(parseObservationId('.leading')).to.equal(null);
      expect(parseObservationId('trailing.')).to.equal(null);
    });
  });

  describe('resolveObservationCode', () => {
    const codes = {
      questionMappings: { mapped: { system: 'http://loinc.org', code: '1234-5', display: 'Mapped' } },
      adHocCodeSystem: {
        canonical: 'http://example.org/CodeSystem/cht-fields',
        codes: { minted: { system: 'http://example.org/CodeSystem/cht-fields', code: 'minted' } },
      },
    };
    const projection = (codeSource: ObservationProjection['codeSource']): ObservationProjection => ({
      codeSource,
      valueMode: 'auto',
      source: { kind: 'field', path: 'x' },
    });

    it('reads a question mapping', () => {
      expect(resolveObservationCode('mapped', projection('question-mapping'), codes))
        .to.deep.equal(codes.questionMappings.mapped);
    });

    it('reads a minted ad-hoc code, and not a question mapping for the same key', () => {
      expect(resolveObservationCode('minted', projection('ad-hoc'), codes))
        .to.deep.equal(codes.adHocCodeSystem.codes.minted);
      expect(resolveObservationCode('mapped', projection('ad-hoc'), codes)).to.equal(null);
    });

    it('does not invent an unminted ad-hoc code', () => {
      expect(resolveObservationCode('absent', projection('ad-hoc'), codes)).to.equal(null);
      expect(resolveObservationCode('minted', projection('ad-hoc'), { ...codes, adHocCodeSystem: null }))
        .to.equal(null);
    });
  });
});

describe('cht-fhir config, malformed input', () => {
  // Every one of these must produce a diagnostic rather than an exception:
  // api reloads app_settings through config-watcher, which exits the process
  // when a load fails, so a mistyped mapping must never throw.
  const withPatient = (patch: (binding: Record<string, any>) => void) => {
    const raw = mapping() as Record<string, any>;
    patch(raw.facade.resources[PATIENT_KEY]);
    return ruleIds(loadConfig(raw).diagnostics);
  };
  const withEncounter = (patch: (binding: Record<string, any>) => void) => {
    const raw = mapping() as Record<string, any>;
    patch(raw.facade.resources[ENCOUNTER_KEY]);
    return ruleIds(loadConfig(raw).diagnostics);
  };

  it('reports a malformed element source', () => {
    expect(withPatient(b => {
      b.elements['Patient.gender'] = 'not-an-object';
    })).to.include('source-malformed');
    expect(withPatient(b => {
      b.elements['Patient.gender'].source = 'not-an-object';
    })).to.include('source-malformed');
    expect(withPatient(b => {
      b.elements['Patient.gender'].source = { kind: 'doc' };
    })).to.include('source-malformed');
    expect(withPatient(b => {
      b.elements['Patient.address.text'] = { source: { kind: 'field', path: ' ' } };
    })).to.include('source-malformed');
    expect(withEncounter(b => {
      b.elements['Encounter.status'].source = { kind: 'const', value: 7 };
    })).to.include('source-malformed');
    expect(withEncounter(b => {
      b.elements['Encounter.type'] = { source: { kind: 'coding', system: 'http://x' } };
    })).to.include('source-malformed');
    expect(withPatient(b => {
      b.elements['Patient.gender'].source = { kind: 'wat' };
    })).to.include('source-kind-unknown');
  });

  it('treats a non-object elements block as binding nothing', () => {
    // So the required-element check is what catches it on an Encounter.
    expect(withEncounter(b => {
      b.elements = 'nope';
    })).to.include('required-element-unbound');
  });

  it('reports a malformed sourceFilter', () => {
    expect(withPatient(b => {
      b.sourceFilter = 7;
    })).to.include('source-filter-malformed');
    expect(withPatient(b => {
      b.sourceFilter = { source: { kind: 'doc', path: 'doc.role' }, op: 'matches', value: 'x' };
    })).to.include('source-filter-op-unknown');
    expect(withPatient(b => {
      b.sourceFilter = { source: { kind: 'doc', path: 'doc.role' }, op: 'in', value: 'x' };
    })).to.include('source-filter-value-invalid');
    expect(withPatient(b => {
      b.sourceFilter = { source: { kind: 'doc', path: 'doc.role' }, op: 'in', value: ['patient', 7] };
    })).to.include('source-filter-value-invalid');
    expect(withPatient(b => {
      b.sourceFilter = { source: { kind: 'doc', path: 'doc.role' }, op: 'eq', value: 7 };
    })).to.include('source-filter-value-invalid');
    expect(withPatient(b => {
      b.sourceFilter = { source: 'nope', op: 'eq', value: 'x' };
    })).to.include('source-malformed');
  });

  it('refuses the binding rather than serving it unfiltered', () => {
    // Dropping a broken filter would widen the binding to every contact of
    // the type, health workers included.
    const raw = mapping() as Record<string, any>;
    raw.facade.resources[PATIENT_KEY].sourceFilter = { source: { kind: 'doc', path: 'doc.role' }, op: 'matches' };
    expect(servedKeys(raw)).to.deep.equal([ENCOUNTER_KEY]);
  });

  it('reports malformed identifiers', () => {
    expect(withPatient(b => {
      b.identifiers = { nope: true };
    })).to.include('identifiers-malformed');
    expect(withPatient(b => {
      b.identifiers = ['nope'];
    })).to.include('identifier-malformed');
    expect(withPatient(b => {
      delete b.identifiers[0].system;
    })).to.include('identifier-malformed');
    expect(withPatient(b => {
      b.identifiers[0].source = { kind: 'expr', expr: 'x' };
    })).to.include('source-kind-unknown');
  });

  it('drops an incomplete identifier type rather than failing', () => {
    const raw = mapping() as Record<string, any>;
    raw.facade.resources[PATIENT_KEY].identifiers[0].type = { code: 'MR' };
    const { config, diagnostics } = loadConfig(raw);
    expect(errorsOf(diagnostics)).to.deep.equal([]);
    expect(config?.bindings.find(b => b.key === PATIENT_KEY)?.identifiers[0].type).to.equal(undefined);
  });

  it('drops an identifier use outside R4\'s required value set rather than failing', () => {
    const raw = mapping() as Record<string, any>;
    raw.facade.resources[PATIENT_KEY].identifiers[0].use = 'primary';
    const { config, diagnostics } = loadConfig(raw);
    expect(errorsOf(diagnostics)).to.deep.equal([]);
    expect(config?.bindings.find(b => b.key === PATIENT_KEY)?.identifiers[0].use).to.equal(undefined);
  });

  it('reports malformed observations', () => {
    expect(withEncounter(b => {
      b.observations = ['nope'];
    })).to.include('observations-malformed');
    expect(withEncounter(b => {
      b.observations['app:pregnancy/weight_kg'] = 'nope';
    })).to.include('observation-malformed');
    expect(withEncounter(b => {
      b.observations['app:pregnancy/weight_kg'].codeSource = 'guesswork';
    })).to.include('observation-code-source-unknown');
    expect(withEncounter(b => {
      b.observations['app:pregnancy/weight_kg'].source = { kind: 'expr', expr: 'x' };
    })).to.include('source-kind-unknown');
  });

  it('falls back to an auto value mode when the configured one is unknown', () => {
    const raw = mapping() as Record<string, any>;
    raw.facade.resources[ENCOUNTER_KEY].observations['app:pregnancy/weight_kg'].valueMode = 'valueMonkey';
    delete raw.facade.resources[ENCOUNTER_KEY].observations['app:pregnancy/weight_kg'].unit.code;
    const { config } = loadConfig(raw);
    const observation = config?.bindings.find(b => b.key === ENCOUNTER_KEY)
      ?.observations['app:pregnancy/weight_kg'];
    expect(observation?.valueMode).to.equal('auto');
    // An incomplete unit is dropped rather than half-applied.
    expect(observation?.unit).to.equal(undefined);
  });

  it('drops unusable question mappings and ad-hoc codes', () => {
    const raw = mapping() as Record<string, any>;
    raw.questionMappings['bad-entry'] = 'nope';
    raw.questionMappings['no-code'] = { system: 'http://loinc.org' };
    raw.adHocCodeSystem.codes['bad-entry'] = 'nope';
    raw.adHocCodeSystem.codes['no-code'] = { display: 'x' };
    const { config } = loadConfig(raw);
    expect(Object.keys(config?.questionMappings ?? {})).to.deep.equal(['app:pregnancy/weight_kg']);
    expect(Object.keys(config?.adHocCodeSystem?.codes ?? {})).to.deep.equal(['app:pregnancy/u_lmp_date']);
  });

  it('puts every ad-hoc code under the code system canonical, whatever system the entry claims', () => {
    const raw = mapping() as Record<string, any>;
    raw.adHocCodeSystem.codes['app:pregnancy/u_lmp_date'].system = 'http://elsewhere.org';
    const { config } = loadConfig(raw);
    expect(config?.adHocCodeSystem?.codes['app:pregnancy/u_lmp_date'].system)
      .to.equal(`${CANONICAL_BASE}/CodeSystem/cht-fields`);
  });

  it('treats an ad-hoc code system with no canonical or codes as absent', () => {
    const raw = mapping() as Record<string, any>;
    delete raw.adHocCodeSystem.canonical;
    expect(ruleIds(loadConfig(raw).diagnostics)).to.include('observation-adhoc-code-unminted');
    const noCodes = mapping() as Record<string, any>;
    delete noCodes.adHocCodeSystem.codes;
    expect(ruleIds(loadConfig(noCodes).diagnostics)).to.include('observation-adhoc-code-unminted');
    const notAnObject = mapping() as Record<string, any>;
    notAnObject.adHocCodeSystem = 'nope';
    expect(ruleIds(loadConfig(notAnObject).diagnostics)).to.include('observation-adhoc-code-unminted');
  });

  it('treats a non-object questionMappings block as empty', () => {
    const raw = mapping() as Record<string, any>;
    raw.questionMappings = 'nope';
    expect(ruleIds(loadConfig(raw).diagnostics)).to.include('observation-code-unmapped');
  });
});
