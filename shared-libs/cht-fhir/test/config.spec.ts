import { expect } from 'chai';
import {
  FHIR_ID_PATTERN,
  loadConfig,
  observationId,
  parseObservationId,
} from '../src/index';
import {
  CANONICAL_BASE,
  ENCOUNTER_SCOPE,
  FORM,
  LMP_CODE,
  PATIENT_SCOPE,
  encounterBinding,
  mapping,
} from './fixtures';

const ruleIds = (diagnostics: readonly { ruleId: string }[]) => diagnostics.map(d => d.ruleId);
const errorsOf = (diagnostics: readonly { severity: string }[]) => diagnostics.filter(d => d.severity === 'error');
const servedScopes = (raw: unknown) => loadConfig(raw).config?.bindings.map(b => b.scope);

/**
 * An Observation id is `<reportUuid>.<code>`, a FHIR id is at most 64
 * characters, and a CHT uuid takes up to 36 of them plus the dot.
 */
const OBSERVATION_CODE_MAX_LENGTH = 64 - 36 - 1;

describe('cht-fhir config', () => {
  describe('loadConfig', () => {
    it('loads the reference mapping with no errors', () => {
      const { config, diagnostics } = loadConfig(mapping());
      expect(errorsOf(diagnostics)).to.deep.equal([]);
      expect(config?.canonicalBase).to.equal(CANONICAL_BASE);
      expect(config?.bindings.map(b => b.scope)).to.deep.equal([PATIENT_SCOPE, ENCOUNTER_SCOPE]);
    });

    it('reads the contact type and form code as the binding source', () => {
      const { config } = loadConfig(mapping());
      expect(config?.bindings.map(({ resourceType, sourceId }) => ({ resourceType, sourceId }))).to.deep.equal([
        { resourceType: 'Patient', sourceId: 'person' },
        { resourceType: 'Encounter', sourceId: FORM },
      ]);
    });

    it('refuses to serve without a canonicalBase, because it will not invent one', () => {
      for (const raw of [mapping({ canonicalBase: '  ' }), 'nonsense', null]) {
        const { config, diagnostics } = loadConfig(raw);
        expect(config, JSON.stringify(raw)).to.be.null;
        expect(ruleIds(diagnostics), JSON.stringify(raw)).to.deep.equal(['canonical-base-missing']);
      }
    });

    it('tolerates unknown keys', () => {
      const raw = mapping();
      raw.extras = {};
      raw.patient.extras = {};
      raw.patient.elements['Patient.gender'].extras = {};
      const { config, diagnostics } = loadConfig(raw);
      expect(errorsOf(diagnostics)).to.deep.equal([]);
      expect(config?.bindings).to.have.length(2);
    });

    it('loads a hand-written binding that leaves out every optional block', () => {
      const raw = mapping();
      delete raw.patient.sourceFilter;
      delete raw.patient.identifiers;
      const { config, diagnostics } = loadConfig(raw);
      expect(errorsOf(diagnostics)).to.deep.equal([]);
      expect(config?.bindings.find(b => b.scope === PATIENT_SCOPE))
        .to.deep.include({ sourceFilter: null, identifiers: [], observations: [] });
    });

    it('serves encounters alone, and a patient alone', () => {
      expect(servedScopes(mapping({ patient: undefined }))).to.deep.equal([ENCOUNTER_SCOPE]);
      expect(servedScopes(mapping({ encounters: undefined }))).to.deep.equal([PATIENT_SCOPE]);
    });

    it('serves one Encounter binding per form', () => {
      const raw = mapping();
      raw.encounters.delivery = encounterBinding();
      expect(servedScopes(raw)).to.deep.equal([PATIENT_SCOPE, ENCOUNTER_SCOPE, 'encounters.delivery']);
    });

    it('rejects an expression source instead of evaluating it, dropping only its binding', () => {
      const raw = mapping();
      raw.encounters[FORM].elements['Encounter.type'] = { kind: 'expr', expr: 'doc.form.toUpperCase()' };
      const { config, diagnostics } = loadConfig(raw);
      expect(diagnostics.find(d => d.ruleId === 'source-kind-unknown'))
        .to.deep.include({ severity: 'error', scope: ENCOUNTER_SCOPE });
      // Errors are scoped: the Patient binding still serves.
      expect(config?.bindings.map(b => b.scope)).to.deep.equal([PATIENT_SCOPE]);
    });

    it('reports a patient with no contact type and keeps serving the rest', () => {
      for (const patient of [{ elements: {} }, { contactType: ' ' }, 'not-an-object']) {
        const { config, diagnostics } = loadConfig(mapping({ patient }));
        expect(diagnostics.find(d => d.ruleId === 'binding-malformed'), JSON.stringify(patient))
          .to.deep.include({ severity: 'error', scope: PATIENT_SCOPE });
        expect(config?.bindings.map(b => b.scope)).to.deep.equal([ENCOUNTER_SCOPE]);
      }
    });

    it('reports an encounter binding that is not an object and keeps serving the rest', () => {
      const raw = mapping();
      raw.encounters.delivery = 'not-an-object';
      const { config, diagnostics } = loadConfig(raw);
      expect(diagnostics.find(d => d.ruleId === 'binding-malformed'))
        .to.deep.include({ severity: 'error', scope: 'encounters.delivery' });
      expect(config?.bindings.map(b => b.scope)).to.deep.equal([PATIENT_SCOPE, ENCOUNTER_SCOPE]);
    });

    it('reports an encounters block that is not keyed by form', () => {
      const { config, diagnostics } = loadConfig(mapping({ encounters: [encounterBinding()] }));
      expect(ruleIds(diagnostics)).to.include('encounters-malformed');
      expect(config?.bindings.map(b => b.scope)).to.deep.equal([PATIENT_SCOPE]);
    });

    it('accepts a structured sourceFilter', () => {
      const raw = mapping();
      raw.patient.sourceFilter = {
        source: { kind: 'doc', path: 'doc.role' },
        op: 'in',
        value: ['patient', 'client'],
      };
      const { config, diagnostics } = loadConfig(raw);
      expect(errorsOf(diagnostics)).to.deep.equal([]);
      expect(config?.bindings.find(b => b.scope === PATIENT_SCOPE)?.sourceFilter?.value)
        .to.deep.equal(['patient', 'client']);
    });

    it('drops a stray value from a value-free filter operator', () => {
      const raw = mapping();
      raw.patient.sourceFilter = {
        source: { kind: 'doc', path: 'doc.role' },
        op: 'not-exists',
        value: 'ignored',
      };
      const { config } = loadConfig(raw);
      expect(config?.bindings.find(b => b.scope === PATIENT_SCOPE)?.sourceFilter)
        .to.deep.equal({ source: { kind: 'doc', path: 'doc.role' }, op: 'not-exists' });
    });

    it('requires a source on an observation', () => {
      const raw = mapping();
      delete raw.encounters[FORM].observations[1].source;
      const { config, diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('source-malformed');
      expect(config?.bindings.map(b => b.scope)).to.deep.equal([PATIENT_SCOPE]);
    });

    it('rejects two observations with the same code', () => {
      const raw = mapping();
      raw.encounters[FORM].observations[1].code = { ...LMP_CODE, display: 'clash' };
      const { config, diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('observation-code-duplicate');
      expect(config?.bindings.map(b => b.scope)).to.deep.equal([PATIENT_SCOPE]);
    });

    it('rejects a code that cannot appear in a FHIR id', () => {
      const raw = mapping();
      raw.encounters[FORM].observations[0].code.code = 'u_lmp_date';
      const { diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('observation-code-not-id-safe');
    });

    // The code is id-safe on its own; it is the `<reportUuid>.` in front of it
    // that pushes the Observation's id past 64. Without this the Observation is
    // dropped per document at map time, with nothing at load to explain it.
    it('rejects an id-safe code that leaves no room for the report uuid', () => {
      const raw = mapping();
      const code = 'a'.repeat(OBSERVATION_CODE_MAX_LENGTH + 1);
      raw.encounters[FORM].observations[0].code.code = code;
      const { diagnostics } = loadConfig(raw);
      expect(FHIR_ID_PATTERN.test(code)).to.equal(true);
      expect(ruleIds(diagnostics)).to.include('observation-code-too-long');
      expect(ruleIds(diagnostics)).to.not.include('observation-code-not-id-safe');
    });

    it('accepts a code that fits exactly', () => {
      const raw = mapping();
      raw.encounters[FORM].observations[0].code.code = 'a'.repeat(OBSERVATION_CODE_MAX_LENGTH);
      const { diagnostics } = loadConfig(raw);
      expect(errorsOf(diagnostics)).to.deep.equal([]);
    });

    it('reports an element that is not in the catalog', () => {
      const raw = mapping();
      raw.patient.elements['Patient.maritalStatus'] = { kind: 'doc', path: 'doc.marital_status' };
      const { diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('element-unknown');
    });

    it('reports a source kind the element does not accept', () => {
      const raw = mapping();
      raw.patient.elements['Patient.gender'] = { kind: 'const', value: 'female' };
      const { diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('element-source-kind-rejected');
    });

    it('reports an unbound required element', () => {
      const raw = mapping();
      delete raw.encounters[FORM].elements['Encounter.class'];
      const { diagnostics } = loadConfig(raw);
      expect(ruleIds(diagnostics)).to.include('required-element-unbound');
    });

    it('warns, and still serves, when observations have no subject to attach to', () => {
      const raw = mapping();
      delete raw.encounters[FORM].elements['Encounter.subject'];
      const { config, diagnostics } = loadConfig(raw);
      expect(diagnostics.find(d => d.ruleId === 'observation-subject-missing'))
        .to.deep.include({ severity: 'warn', scope: ENCOUNTER_SCOPE });
      expect(config?.bindings).to.have.length(2);
    });

    it('reports nothing servable when no binding is left to serve', () => {
      const { config, diagnostics } = loadConfig({ canonicalBase: CANONICAL_BASE });
      expect(config).to.be.null;
      expect(ruleIds(diagnostics)).to.deep.equal(['no-servable-bindings']);
    });
  });

  describe('observation ids', () => {
    it('splits on the first dot, so a code containing one survives', () => {
      const id = observationId('aaaa-bbbb', 'Z34.9');
      expect(id).to.equal('aaaa-bbbb.Z34.9');
      expect(parseObservationId(id)).to.deep.equal({ reportUuid: 'aaaa-bbbb', code: 'Z34.9' });
    });

    it('rejects an id with no code or no uuid', () => {
      expect(parseObservationId('no-dot')).to.be.null;
      expect(parseObservationId('.leading')).to.be.null;
      expect(parseObservationId('trailing.')).to.be.null;
    });
  });
});

describe('cht-fhir config, malformed input', () => {
  // Every one of these must produce a diagnostic rather than an exception:
  // api reloads app_settings through config-watcher, which exits the process
  // when a load fails, so a mistyped mapping must never throw.
  const withPatient = (patch: (binding: Record<string, any>) => void) => {
    const raw = mapping();
    patch(raw.patient);
    return ruleIds(loadConfig(raw).diagnostics);
  };
  const withEncounter = (patch: (binding: Record<string, any>) => void) => {
    const raw = mapping();
    patch(raw.encounters[FORM]);
    return ruleIds(loadConfig(raw).diagnostics);
  };

  it('reports a malformed element source', () => {
    expect(withPatient(b => {
      b.elements['Patient.gender'] = 'not-an-object';
    })).to.include('source-malformed');
    expect(withPatient(b => {
      b.elements['Patient.gender'] = { kind: 'doc' };
    })).to.include('source-malformed');
    expect(withPatient(b => {
      b.elements['Patient.address.text'] = { kind: 'field', path: ' ' };
    })).to.include('source-malformed');
    expect(withEncounter(b => {
      b.elements['Encounter.status'] = { kind: 'const', value: 7 };
    })).to.include('source-malformed');
    expect(withEncounter(b => {
      b.elements['Encounter.type'] = { kind: 'coding', system: 'http://x' };
    })).to.include('source-malformed');
    expect(withPatient(b => {
      b.elements['Patient.gender'] = { kind: 'wat' };
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
    const raw = mapping();
    raw.patient.sourceFilter = { source: { kind: 'doc', path: 'doc.role' }, op: 'matches' };
    expect(servedScopes(raw)).to.deep.equal([ENCOUNTER_SCOPE]);
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
    const raw = mapping();
    raw.patient.identifiers[0].type = { code: 'MR' };
    const { config, diagnostics } = loadConfig(raw);
    expect(errorsOf(diagnostics)).to.deep.equal([]);
    expect(config?.bindings.find(b => b.scope === PATIENT_SCOPE)?.identifiers[0].type).to.be.undefined;
  });

  it('drops an identifier use outside R4\'s required value set rather than failing', () => {
    const raw = mapping();
    raw.patient.identifiers[0].use = 'primary';
    const { config, diagnostics } = loadConfig(raw);
    expect(errorsOf(diagnostics)).to.deep.equal([]);
    expect(config?.bindings.find(b => b.scope === PATIENT_SCOPE)?.identifiers[0].use).to.be.undefined;
  });

  it('reports malformed observations', () => {
    expect(withEncounter(b => {
      b.observations = { weight: b.observations[1] };
    })).to.include('observations-malformed');
    expect(withEncounter(b => {
      b.observations[1] = 'nope';
    })).to.include('observation-malformed');
    expect(withEncounter(b => {
      delete b.observations[1].code;
    })).to.include('observation-code-malformed');
    expect(withEncounter(b => {
      b.observations[1].code = { system: 'http://loinc.org' };
    })).to.include('observation-code-malformed');
    expect(withEncounter(b => {
      b.observations[1].source = { kind: 'expr', expr: 'x' };
    })).to.include('source-kind-unknown');
  });

  it('falls back to an auto value mode when the configured one is unknown', () => {
    const raw = mapping();
    raw.encounters[FORM].observations[1].valueMode = 'valueMonkey';
    delete raw.encounters[FORM].observations[1].unit.code;
    const { config } = loadConfig(raw);
    const observation = config?.bindings.find(b => b.scope === ENCOUNTER_SCOPE)?.observations[1];
    expect(observation?.valueMode).to.equal('auto');
    // An incomplete unit is dropped rather than half-applied.
    expect(observation?.unit).to.be.undefined;
  });
});
