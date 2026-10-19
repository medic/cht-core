import { expect } from 'chai';
import {
  FHIR_ID_PATTERN,
  FacadeConfigError,
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

const scopes = (raw: unknown) => loadConfig(raw).bindings.map(b => b.scope);
const bindingAt = (raw: unknown, scope: string) => loadConfig(raw).bindings.find(b => b.scope === scope);

/**
 * An Observation id is `<reportUuid>.<code>`, a FHIR id is at most 64
 * characters, and a CHT uuid takes up to 36 of them plus the dot.
 */
const OBSERVATION_CODE_MAX_LENGTH = 64 - 36 - 1;

describe('cht-fhir config', () => {
  describe('loadConfig', () => {
    it('loads the reference mapping', () => {
      const config = loadConfig(mapping());
      expect(config.canonicalBase).to.equal(CANONICAL_BASE);
      expect(config.bindings.map(b => b.scope)).to.deep.equal([PATIENT_SCOPE, ENCOUNTER_SCOPE]);
    });

    it('reads the contact type and form code as the binding source', () => {
      const { bindings } = loadConfig(mapping());
      expect(bindings.map(({ resourceType, sourceId }) => ({ resourceType, sourceId }))).to.deep.equal([
        { resourceType: 'Patient', sourceId: 'person' },
        { resourceType: 'Encounter', sourceId: FORM },
      ]);
    });

    it('refuses to serve without a canonicalBase, because it will not invent one', () => {
      for (const raw of [mapping({ canonicalBase: '  ' }), 'nonsense', null]) {
        expect(() => loadConfig(raw), JSON.stringify(raw)).to.throw(FacadeConfigError, /canonicalBase is required/);
      }
    });

    it('tolerates unknown keys', () => {
      const raw = mapping();
      raw.extras = {};
      raw.patient.extras = {};
      raw.patient.elements['Patient.gender'].extras = {};
      expect(scopes(raw)).to.deep.equal([PATIENT_SCOPE, ENCOUNTER_SCOPE]);
    });

    it('loads a hand-written binding that leaves out every optional block', () => {
      const raw = mapping();
      delete raw.patient.sourceFilter;
      delete raw.patient.identifiers;
      expect(bindingAt(raw, PATIENT_SCOPE)).to.deep.include({ sourceFilter: null, identifiers: [], observations: [] });
    });

    it('serves encounters alone, and a patient alone', () => {
      expect(scopes(mapping({ patient: undefined }))).to.deep.equal([ENCOUNTER_SCOPE]);
      expect(scopes(mapping({ encounters: undefined }))).to.deep.equal([PATIENT_SCOPE]);
    });

    it('serves one Encounter binding per form', () => {
      const raw = mapping();
      raw.encounters.delivery = encounterBinding();
      expect(scopes(raw)).to.deep.equal([PATIENT_SCOPE, ENCOUNTER_SCOPE, 'encounters.delivery']);
    });

    it('refuses a config with nothing bound', () => {
      expect(() => loadConfig({ canonicalBase: CANONICAL_BASE })).to.throw(FacadeConfigError, /Nothing is bound/);
    });

    it('rejects an expression source instead of evaluating it', () => {
      const raw = mapping();
      raw.encounters[FORM].elements['Encounter.type'] = { kind: 'expr', expr: 'doc.form.toUpperCase()' };
      expect(() => loadConfig(raw)).to.throw(
        FacadeConfigError,
        /^encounters\.pregnancy\.elements\.Encounter\.type: unsupported source kind "expr"/,
      );
    });

    it('rejects a patient with no contact type', () => {
      for (const patient of [{ elements: {} }, { contactType: ' ' }, 'not-an-object']) {
        expect(() => loadConfig(mapping({ patient })), JSON.stringify(patient))
          .to.throw(FacadeConfigError, /^patient: needs a contactType/);
      }
    });

    it('rejects an encounter binding that is not an object', () => {
      const raw = mapping();
      raw.encounters.delivery = 'not-an-object';
      expect(() => loadConfig(raw)).to.throw(FacadeConfigError, /^encounters\.delivery: must be an object/);
    });

    it('rejects an encounters block that is not keyed by form', () => {
      expect(() => loadConfig(mapping({ encounters: [encounterBinding()] })))
        .to.throw(FacadeConfigError, /encounters must be an object keyed by form code/);
    });

    it('accepts a structured sourceFilter', () => {
      const raw = mapping();
      raw.patient.sourceFilter = {
        source: { kind: 'doc', path: 'doc.role' },
        op: 'in',
        value: ['patient', 'client'],
      };
      expect(bindingAt(raw, PATIENT_SCOPE)?.sourceFilter?.value).to.deep.equal(['patient', 'client']);
    });

    it('drops a stray value from a value-free filter operator', () => {
      const raw = mapping();
      raw.patient.sourceFilter = {
        source: { kind: 'doc', path: 'doc.role' },
        op: 'not-exists',
        value: 'ignored',
      };
      expect(bindingAt(raw, PATIENT_SCOPE)?.sourceFilter)
        .to.deep.equal({ source: { kind: 'doc', path: 'doc.role' }, op: 'not-exists' });
    });

    it('rejects two observations with the same code', () => {
      const raw = mapping();
      raw.encounters[FORM].observations[1].code = { ...LMP_CODE, display: 'clash' };
      expect(() => loadConfig(raw)).to.throw(
        FacadeConfigError,
        /^encounters\.pregnancy\.observations\[1\]: code u-lmp-date is already used/,
      );
    });

    it('rejects a code that cannot appear in a FHIR id', () => {
      const raw = mapping();
      raw.encounters[FORM].observations[0].code.code = 'u_lmp_date';
      expect(() => loadConfig(raw)).to.throw(
        FacadeConfigError,
        /^encounters\.pregnancy\.observations\[0\]: code "u_lmp_date" cannot appear in a FHIR id/,
      );
    });

    // The code is id-safe on its own; it is the `<reportUuid>.` in front of it
    // that pushes the Observation's id past 64. Without this the Observation is
    // dropped per document at map time, with nothing at load to explain it.
    it('rejects an id-safe code that leaves no room for the report uuid', () => {
      const raw = mapping();
      const code = 'a'.repeat(OBSERVATION_CODE_MAX_LENGTH + 1);
      raw.encounters[FORM].observations[0].code.code = code;
      expect(FHIR_ID_PATTERN.test(code)).to.equal(true);
      expect(() => loadConfig(raw)).to.throw(FacadeConfigError, /is 28 characters/);
    });

    it('accepts a code that fits exactly', () => {
      const raw = mapping();
      raw.encounters[FORM].observations[0].code.code = 'a'.repeat(OBSERVATION_CODE_MAX_LENGTH);
      expect(() => loadConfig(raw)).to.not.throw();
    });

    it('rejects an element that is not in the catalog', () => {
      const raw = mapping();
      raw.patient.elements['Patient.maritalStatus'] = { kind: 'doc', path: 'doc.marital_status' };
      expect(() => loadConfig(raw))
        .to.throw(FacadeConfigError, /^patient: Patient\.maritalStatus is not an element of Patient/);
    });

    it('rejects a source kind the element does not accept', () => {
      const raw = mapping();
      raw.patient.elements['Patient.gender'] = { kind: 'const', value: 'female' };
      expect(() => loadConfig(raw))
        .to.throw(FacadeConfigError, /^patient: Patient\.gender does not accept a const source/);
    });

    it('rejects an unbound required element', () => {
      const raw = mapping();
      delete raw.encounters[FORM].elements['Encounter.class'];
      expect(() => loadConfig(raw))
        .to.throw(FacadeConfigError, /^encounters\.pregnancy: Encounter\.class is required/);
    });

    it('treats a non-object elements block as binding nothing', () => {
      // So the required-element check is what catches it on an Encounter.
      const raw = mapping();
      raw.encounters[FORM].elements = 'nope';
      expect(() => loadConfig(raw)).to.throw(FacadeConfigError, /Encounter\.status is required/);
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
  const withPatient = (patch: (binding: Record<string, any>) => void) => {
    const raw = mapping();
    patch(raw.patient);
    return () => loadConfig(raw);
  };
  const withEncounter = (patch: (binding: Record<string, any>) => void) => {
    const raw = mapping();
    patch(raw.encounters[FORM]);
    return () => loadConfig(raw);
  };

  it('rejects a malformed element source', () => {
    expect(withPatient(b => {
      b.elements['Patient.gender'] = 'not-an-object';
    })).to.throw(FacadeConfigError, /^patient\.elements\.Patient\.gender: source must be an object/);
    expect(withPatient(b => {
      b.elements['Patient.address.text'] = { kind: 'field', path: ' ' };
    })).to.throw(FacadeConfigError, /a field source needs a non-empty path/);
    expect(withEncounter(b => {
      b.elements['Encounter.status'] = { kind: 'const', value: 7 };
    })).to.throw(FacadeConfigError, /a const source needs a string value/);
    expect(withEncounter(b => {
      b.elements['Encounter.type'] = { kind: 'coding', system: 'http://x' };
    })).to.throw(FacadeConfigError, /a coding source needs system and code/);
  });

  it('rejects a malformed sourceFilter', () => {
    expect(withPatient(b => {
      b.sourceFilter = 7;
    })).to.throw(FacadeConfigError, /^patient: sourceFilter must be an object or null/);
    expect(withPatient(b => {
      b.sourceFilter = { source: { kind: 'doc', path: 'doc.role' }, op: 'matches', value: 'x' };
    })).to.throw(FacadeConfigError, /^patient: sourceFilter has unknown op "matches"/);
    expect(withPatient(b => {
      b.sourceFilter = { source: { kind: 'doc', path: 'doc.role' }, op: 'in', value: ['patient', 7] };
    })).to.throw(FacadeConfigError, /sourceFilter op "in" needs an array of strings/);
    expect(withPatient(b => {
      b.sourceFilter = { source: { kind: 'doc', path: 'doc.role' }, op: 'eq', value: 7 };
    })).to.throw(FacadeConfigError, /sourceFilter op "eq" needs a string value/);
    expect(withPatient(b => {
      b.sourceFilter = { source: 'nope', op: 'eq', value: 'x' };
    })).to.throw(FacadeConfigError, /^patient\.sourceFilter: source must be an object/);
  });

  it('rejects malformed identifiers', () => {
    expect(withPatient(b => {
      b.identifiers = { nope: true };
    })).to.throw(FacadeConfigError, /^patient: identifiers must be an array/);
    expect(withPatient(b => {
      b.identifiers = ['nope'];
    })).to.throw(FacadeConfigError, /^patient\.identifiers\[0\]: must be an object/);
    expect(withPatient(b => {
      delete b.identifiers[0].system;
    })).to.throw(FacadeConfigError, /^patient\.identifiers\[0\]: needs a system/);
  });

  it('drops an incomplete identifier type rather than failing', () => {
    const raw = mapping();
    raw.patient.identifiers[0].type = { code: 'MR' };
    expect(bindingAt(raw, PATIENT_SCOPE)?.identifiers[0].type).to.be.undefined;
  });

  it('drops an identifier use outside R4\'s required value set rather than failing', () => {
    const raw = mapping();
    raw.patient.identifiers[0].use = 'primary';
    expect(bindingAt(raw, PATIENT_SCOPE)?.identifiers[0].use).to.be.undefined;
  });

  it('rejects malformed observations', () => {
    expect(withEncounter(b => {
      b.observations = { weight: b.observations[1] };
    })).to.throw(FacadeConfigError, /^encounters\.pregnancy: observations must be an array/);
    expect(withEncounter(b => {
      b.observations[1] = 'nope';
    })).to.throw(FacadeConfigError, /^encounters\.pregnancy\.observations\[1\]: must be an object/);
    expect(withEncounter(b => {
      b.observations[1].code = { system: 'http://loinc.org' };
    })).to.throw(FacadeConfigError, /^encounters\.pregnancy\.observations\[1\]: code needs system and code/);
    expect(withEncounter(b => {
      delete b.observations[1].source;
    })).to.throw(FacadeConfigError, /^encounters\.pregnancy\.observations\[1\]: source must be an object/);
  });

  it('falls back to an auto value mode when the configured one is unknown', () => {
    const raw = mapping();
    raw.encounters[FORM].observations[1].valueMode = 'valueMonkey';
    delete raw.encounters[FORM].observations[1].unit.code;
    const observation = bindingAt(raw, ENCOUNTER_SCOPE)?.observations[1];
    expect(observation?.valueMode).to.equal('auto');
    // An incomplete unit is dropped rather than half-applied.
    expect(observation?.unit).to.be.undefined;
  });
});
