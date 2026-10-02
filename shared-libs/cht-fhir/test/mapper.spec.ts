import { expect } from 'chai';
import {
  type FacadeConfig,
  type ResourceBinding,
  bindingMatchesDoc,
  coerceBoolean,
  coerceDate,
  coerceDateTime,
  coerceNumber,
  loadConfig,
  mapDocument,
  matchesSourceFilter,
  projectObservations,
  resolveSource,
} from '../src/index';
import {
  CANONICAL_BASE,
  ENCOUNTER_KEY,
  PATIENT_KEY,
  encounterBinding,
  mapping,
  patientBinding,
  personDoc,
  reportDoc,
} from './fixtures';

const REPORT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const PATIENT_ID = '11111111-2222-3333-4444-555555555555';
/** `reportDoc().reported_date`, as a FHIR instant. */
const REPORTED = '2023-11-14T22:13:20.000Z';
const SURVEY = [{
  coding: [{
    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
    code: 'survey',
    display: 'Survey',
  }],
  text: 'Survey',
}];

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

/** Map `doc` through the binding at `key`, collecting warnings. */
const mapWith = (raw: unknown, key: string, doc: Record<string, unknown>) => {
  const config = load(raw);
  const warnings: string[] = [];
  const resource = mapDocument(bindingOf(config, key), doc, { config, warn: message => warnings.push(message) });
  return { resource, warnings: warnings.join(' ') };
};

/** Project `doc`'s observations through the Encounter binding, collecting warnings. */
const projectWith = (raw: unknown, doc: Record<string, unknown>) => {
  const config = load(raw);
  const warnings: string[] = [];
  const observations = projectObservations(
    bindingOf(config, ENCOUNTER_KEY),
    doc,
    { config, warn: message => warnings.push(message) },
  );
  return { observations, warnings: warnings.join(' ') };
};

describe('cht-fhir mapper', () => {
  describe('coercion', () => {
    it('zero-pads a CHT date, which FHIR would otherwise reject', () => {
      expect(coerceDate('1991-11-6')).to.equal('1991-11-06');
      expect(coerceDate('1991-11-06')).to.equal('1991-11-06');
    });

    it('converts epoch milliseconds', () => {
      expect(coerceDate(1700000000000)).to.equal('2023-11-14');
      expect(coerceDateTime(1700000000000)).to.equal(REPORTED);
      expect(coerceDate(new Date(0))).to.equal('1970-01-01');
      expect(coerceDateTime(new Date(0))).to.equal('1970-01-01T00:00:00.000Z');
    });

    it('does not shift a date-only value with the server timezone', () => {
      // Round-tripping '1991-11-6' through Date parses it as LOCAL midnight,
      // so a UTC re-format lands on the 5th anywhere east of Greenwich.
      const tz = process.env.TZ;
      process.env.TZ = 'Africa/Nairobi';
      try {
        expect(coerceDate('1991-11-6')).to.equal('1991-11-06');
        expect(coerceDateTime('1991-11-6')).to.equal('1991-11-06');
        expect(coerceDate('1991-11-06T00:00:00.000Z')).to.equal('1991-11-06');
      } finally {
        if (tz === undefined) {
          delete process.env.TZ;
        } else {
          process.env.TZ = tz;
        }
      }
    });

    it('rejects a date the calendar does not have', () => {
      expect(coerceDate('1991-13-01')).to.equal(null);
      expect(coerceDate('1991-02-31')).to.equal(null);
      expect(coerceDateTime('1991-02-31')).to.equal(null);
    });

    it('passes a date-only value through as a dateTime rather than inventing midnight', () => {
      expect(coerceDateTime('2026-01-15')).to.equal('2026-01-15');
    });

    it('returns null for a value that is not a date', () => {
      expect(coerceDate('not a date')).to.equal(null);
      expect(coerceDateTime('not a date')).to.equal(null);
      expect(coerceDate(undefined)).to.equal(null);
    });

    it('reads the booleans XForms actually writes', () => {
      expect(coerceBoolean('yes')).to.equal(true);
      expect(coerceBoolean('NO')).to.equal(false);
      expect(coerceBoolean('1')).to.equal(true);
      expect(coerceBoolean('0')).to.equal(false);
      expect(coerceBoolean(true)).to.equal(true);
      expect(coerceBoolean('maybe')).to.equal(null);
    });

    it('parses the strings XForms uses for numbers', () => {
      expect(coerceNumber('62.5')).to.equal(62.5);
      expect(coerceNumber(21)).to.equal(21);
      expect(coerceNumber('')).to.equal(null);
      expect(coerceNumber('abc')).to.equal(null);
      expect(coerceNumber(Infinity)).to.equal(null);
    });
  });

  describe('resolveSource', () => {
    const doc = reportDoc();

    it('reads a doc path, with or without the doc prefix', () => {
      expect(resolveSource({ kind: 'doc', path: 'doc.contact._id' }, doc)).to.equal('chw-1');
      expect(resolveSource({ kind: 'doc', path: 'form' }, doc)).to.equal('pregnancy');
    });

    it('reads a field path relative to doc.fields', () => {
      expect(resolveSource({ kind: 'field', path: 'vitals.weight_kg' }, doc)).to.equal('62.5');
      // Not relative to the document: `form` is a top-level key, not a field.
      expect(resolveSource({ kind: 'field', path: 'form' }, doc)).to.equal(undefined);
    });

    it('returns undefined rather than throwing when a path runs off the document', () => {
      expect(resolveSource({ kind: 'doc', path: 'doc.nope.deeper' }, doc)).to.equal(undefined);
      expect(resolveSource({ kind: 'field', path: 'a.b.c' }, doc)).to.equal(undefined);
      expect(resolveSource({ kind: 'doc', path: 'doc.form.length.nope' }, doc)).to.equal(undefined);
      expect(resolveSource({ kind: 'field', path: 'x' }, { _id: 'no-fields' })).to.equal(undefined);
    });

    describe('repeat groups', () => {
      // What an XLSForm repeat produces: an array under the group name.
      const withMembers = {
        ...reportDoc(),
        fields: { ...reportDoc().fields, members: [{ name: 'Ada' }, { name: 'Grace' }] },
      };

      it('hands back the list when the path stops at the repeat', () => {
        // Not `undefined`: the mapper is what reports this, and it needs to be
        // able to tell a list apart from a path that led nowhere.
        expect(resolveSource({ kind: 'field', path: 'members' }, withMembers))
          .to.deep.equal(withMembers.fields.members);
      });

      it('follows an explicit index into the repeat', () => {
        expect(resolveSource({ kind: 'field', path: 'members.1.name' }, withMembers)).to.equal('Grace');
      });
    });
  });

  describe('matchesSourceFilter', () => {
    const doc = { role: 'patient', name: '' } as Record<string, unknown>;

    it('passes everything when there is no filter', () => {
      expect(matchesSourceFilter(null, doc)).to.equal(true);
    });

    it('applies each operator', () => {
      const source = { kind: 'doc', path: 'doc.role' } as const;
      expect(matchesSourceFilter({ source, op: 'eq', value: 'patient' }, doc)).to.equal(true);
      expect(matchesSourceFilter({ source, op: 'eq', value: 'chw' }, doc)).to.equal(false);
      expect(matchesSourceFilter({ source, op: 'ne', value: 'chw' }, doc)).to.equal(true);
      expect(matchesSourceFilter({ source, op: 'ne', value: 'patient' }, doc)).to.equal(false);
      expect(matchesSourceFilter({ source, op: 'in', value: ['chw', 'patient'] }, doc)).to.equal(true);
      expect(matchesSourceFilter({ source, op: 'in', value: ['chw'] }, doc)).to.equal(false);
      expect(matchesSourceFilter({ source, op: 'exists' }, doc)).to.equal(true);
      expect(matchesSourceFilter({ source, op: 'not-exists' }, doc)).to.equal(false);
    });

    it('treats an empty string and a missing key as absent', () => {
      expect(matchesSourceFilter({ source: { kind: 'doc', path: 'doc.name' }, op: 'exists' }, doc)).to.equal(false);
      expect(matchesSourceFilter({ source: { kind: 'doc', path: 'doc.gone' }, op: 'not-exists' }, doc)).to.equal(true);
    });

    it('never matches an in filter that was not given a list', () => {
      const source = { kind: 'doc', path: 'doc.role' } as const;
      expect(matchesSourceFilter({ source, op: 'in', value: 'patient' }, doc)).to.equal(false);
    });
  });

  describe('bindingMatchesDoc', () => {
    it('claims a report by its bare form code, not the config key', () => {
      const binding = bindingOf(load(), ENCOUNTER_KEY);
      // The binding's sourceId is `app:pregnancy`; the report says `pregnancy`.
      expect(binding.sourceId).to.equal('app:pregnancy');
      expect(bindingMatchesDoc(binding, reportDoc())).to.equal(true);
      expect(bindingMatchesDoc(binding, { ...reportDoc(), form: 'delivery' })).to.equal(false);
    });

    it('claims a contact by contact_type, falling back to type', () => {
      const binding = bindingOf(load(), PATIENT_KEY);
      expect(bindingMatchesDoc(binding, personDoc())).to.equal(true);
      expect(bindingMatchesDoc(binding, { type: 'contact', contact_type: 'person' })).to.equal(true);
      expect(bindingMatchesDoc(binding, { type: 'contact', contact_type: 'chw' })).to.equal(false);
    });

    it('honours the sourceFilter that separates patients from health workers of one contact type', () => {
      // A deployment with a single `person` contact type separates its
      // patients from its health workers on `doc.role`.
      const config = load(mapping({
        resources: {
          [PATIENT_KEY]: {
            ...patientBinding(),
            sourceFilter: { source: { kind: 'doc', path: 'doc.role' }, op: 'ne', value: 'chw' },
          },
          [ENCOUNTER_KEY]: encounterBinding(),
        },
      }));
      const patient = bindingOf(config, PATIENT_KEY);
      expect(bindingMatchesDoc(patient, personDoc())).to.equal(true);
      expect(bindingMatchesDoc(patient, { ...personDoc(), role: 'chw' })).to.equal(false);
    });
  });

  describe('mapDocument', () => {
    it('maps a person contact to a Patient', () => {
      const config = load();
      const resource = mapDocument(bindingOf(config, PATIENT_KEY), personDoc(), { config });
      expect(resource).to.deep.equal({
        resourceType: 'Patient',
        id: PATIENT_ID,
        meta: { versionId: '3-abc', lastUpdated: REPORTED },
        identifier: [{
          system: `${CANONICAL_BASE}/identifier/patient-id`,
          value: '10072',
          use: 'official',
          type: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MR',
              display: 'Medical record number',
            }],
          },
        }],
        name: [{ text: 'Mary Smith' }],
        // 'Female' lowercased into the required administrative-gender set.
        gender: 'female',
        // '1991-11-6' zero-padded.
        birthDate: '1991-11-06',
        telecom: [{ system: 'phone', value: '+254700000000' }],
      });
    });

    it('maps a report to an Encounter, expanding the pseudo-paths', () => {
      const config = load();
      const resource = mapDocument(bindingOf(config, ENCOUNTER_KEY), reportDoc(), { config });
      expect(resource).to.deep.equal({
        resourceType: 'Encounter',
        id: REPORT_ID,
        meta: { versionId: '1-def', lastUpdated: REPORTED },
        status: 'finished',
        // Encounter.class is a Coding directly, not a CodeableConcept.
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'HH', display: 'home health' },
        period: { start: REPORTED },
        type: [{ text: 'Home Visit' }],
        // Each reference prefixed with the one type its catalog row allows.
        subject: { reference: `Patient/${PATIENT_ID}` },
        participant: [{ individual: { reference: 'Practitioner/chw-1' } }],
      });
    });

    it('omits an element whose source resolves to nothing', () => {
      const config = load();
      const resource = mapDocument(bindingOf(config, PATIENT_KEY), personDoc(), { config });
      // date_of_death is unset on a living patient.
      expect(resource).to.not.have.property('deceasedDateTime');
    });

    it('omits a string, concept or reference that is only whitespace', () => {
      const { resource } = mapWith(mapping(), PATIENT_KEY, { ...personDoc(), name: '   ', phone: ' ' });
      expect(resource).to.not.have.property('name');
      expect(resource).to.not.have.property('telecom');
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.type'] = { source: { kind: 'const', value: ' ' } };
      const encounter = mapWith(raw, ENCOUNTER_KEY, { ...reportDoc(), contact: { _id: '  ' } }).resource;
      expect(encounter).to.not.have.property('participant');
      expect(encounter).to.not.have.property('type');
    });

    it('drops a code outside a required value set, and says why', () => {
      const { resource, warnings } = mapWith(mapping(), PATIENT_KEY, { ...personDoc(), sex: 'intersex' });
      expect(resource).to.not.have.property('gender');
      expect(warnings).to.contain('Patient.gender');
      expect(warnings).to.contain('required value set');
    });

    it('warns when a required element resolves to nothing', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.status'] = {
        source: { kind: 'const', value: '' },
      };
      const { resource, warnings } = mapWith(raw, ENCOUNTER_KEY, reportDoc());
      expect(resource).to.not.have.property('status');
      expect(warnings).to.contain('Encounter.status is required');
    });

    it('omits an optional element that resolves to nothing without a warning', () => {
      const { warnings } = mapWith(mapping(), PATIENT_KEY, personDoc());
      expect(warnings).to.equal('');
    });

    it('emits an unlisted Encounter class code, because the binding is extensible', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.class'] = { source: { kind: 'const', value: 'XYZ' } };
      const { resource } = mapWith(raw, ENCOUNTER_KEY, reportDoc());
      expect(resource.class).to.deep.equal({
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'XYZ',
      });
    });

    it('merges the name pseudo-paths into one HumanName', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[PATIENT_KEY].elements['Patient.name.family'] = {
        source: { kind: 'doc', path: 'doc.family_name' },
      };
      raw.facade.resources[PATIENT_KEY].elements['Patient.name.given'] = {
        source: { kind: 'doc', path: 'doc.given_name' },
      };
      const doc = { ...personDoc(), family_name: 'Smith', given_name: 'Mary' };
      const { resource } = mapWith(raw, PATIENT_KEY, doc);
      expect(resource.name).to.deep.equal([{ text: 'Mary Smith', family: 'Smith', given: ['Mary'] }]);
    });

    it('writes the output in catalog order, whatever order the config binds in', () => {
      // `given` before `family` in the config must not change the HumanName.
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[PATIENT_KEY].elements = {
        'Patient.name.given': { source: { kind: 'doc', path: 'doc.given_name' } },
        'Patient.name.family': { source: { kind: 'doc', path: 'doc.family_name' } },
      };
      const { resource } = mapWith(raw, PATIENT_KEY, { ...personDoc(), family_name: 'Smith', given_name: 'Mary' });
      expect(Object.keys((resource.name as Record<string, unknown>[])[0])).to.deep.equal(['family', 'given']);
    });

    it('merges both ends of a period', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.period.end'] = {
        source: { kind: 'field', path: 'visit_end' },
      };
      const doc = reportDoc() as Record<string, any>;
      doc.fields.visit_end = '2026-01-16';
      const { resource } = mapWith(raw, ENCOUNTER_KEY, doc);
      expect(resource.period).to.deep.equal({ start: REPORTED, end: '2026-01-16' });
    });

    it('maps a free-text reason and a patient address', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.reasonCode'] = {
        source: { kind: 'field', path: 'reason' },
      };
      raw.facade.resources[PATIENT_KEY].elements['Patient.address.text'] = {
        source: { kind: 'doc', path: 'doc.address' },
      };
      const doc = reportDoc() as Record<string, any>;
      doc.fields.reason = ' Routine ';
      expect(mapWith(raw, ENCOUNTER_KEY, doc).resource.reasonCode).to.deep.equal([{ text: 'Routine' }]);
      expect(mapWith(raw, PATIENT_KEY, { ...personDoc(), address: 'Ward 3' }).resource.address)
        .to.deep.equal([{ text: 'Ward 3' }]);
    });

    it('omits meta fields the document cannot supply', () => {
      const { resource } = mapWith(mapping(), PATIENT_KEY, { _id: 'x' });
      expect(resource.meta).to.deep.equal({});
    });

    it('omits an identifier whose source resolves to nothing', () => {
      const doc = personDoc() as Record<string, unknown>;
      delete doc.patient_id;
      const { resource, warnings } = mapWith(mapping(), PATIENT_KEY, doc);
      expect(resource).to.not.have.property('identifier');
      expect(warnings).to.equal('');
    });

    it('omits an identifier use and type when the config gives none', () => {
      const raw = mapping() as Record<string, any>;
      delete raw.facade.resources[PATIENT_KEY].identifiers[0].use;
      delete raw.facade.resources[PATIENT_KEY].identifiers[0].type;
      const { resource } = mapWith(raw, PATIENT_KEY, personDoc());
      expect(resource.identifier).to.deep.equal([{
        system: `${CANONICAL_BASE}/identifier/patient-id`,
        value: '10072',
      }]);
    });

    it('resolves {base} in an identifier system without doubling a slash', () => {
      const raw = mapping({ canonicalBase: `${CANONICAL_BASE}/` }) as Record<string, any>;
      const { resource } = mapWith(raw, PATIENT_KEY, personDoc());
      expect((resource.identifier as Record<string, unknown>[])[0].system)
        .to.equal(`${CANONICAL_BASE}/identifier/patient-id`);
    });

    it('stringifies a numeric identifier value', () => {
      const { resource } = mapWith(mapping(), PATIENT_KEY, { ...personDoc(), patient_id: 10072 });
      expect((resource.identifier as Record<string, unknown>[])[0].value).to.equal('10072');
    });

    it('emits a real coding for a CodeableConcept, not bare text', () => {
      // A `const` on Encounter.type can only produce `{ text }`, which a
      // national IG that binds the element `required` rejects and no receiver
      // can resolve to a concept. A `coding` source says what it means.
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.type'] = {
        source: {
          kind: 'coding',
          system: 'http://snomed.info/sct',
          code: '390906007',
          display: 'Follow-up encounter',
        },
      };
      const { resource } = mapWith(raw, ENCOUNTER_KEY, reportDoc());
      expect(resource.type).to.deep.equal([{
        coding: [{ system: 'http://snomed.info/sct', code: '390906007', display: 'Follow-up encounter' }],
        text: 'Follow-up encounter',
      }]);
    });

    it('carries a coding with no display as the code alone', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.type'] = {
        source: { kind: 'coding', system: 'http://snomed.info/sct', code: '390906007' },
      };
      const { resource } = mapWith(raw, ENCOUNTER_KEY, reportDoc());
      expect(resource.type).to.deep.equal([{
        coding: [{ system: 'http://snomed.info/sct', code: '390906007' }],
      }]);
    });

    it('takes the subject from a form field as well as from the document', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.subject'] = {
        source: { kind: 'field', path: 'patient_uuid' },
      };
      const { resource } = mapWith(raw, ENCOUNTER_KEY, reportDoc());
      expect(resource.subject).to.deep.equal({ reference: `Patient/${PATIENT_ID}` });
    });

    it('maps a visit location, whose Location this facade does not serve', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.location.location'] = {
        source: { kind: 'doc', path: 'doc.contact.parent._id' },
      };
      const { resource } = mapWith(raw, ENCOUNTER_KEY, reportDoc());
      expect(resource.location).to.deep.equal([{ location: { reference: 'Location/clinic1' } }]);
    });

    it('maps a parent place as the managing Organization', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[PATIENT_KEY].elements['Patient.managingOrganization'] = {
        source: { kind: 'doc', path: 'doc.parent._id' },
      };
      const { resource } = mapWith(raw, PATIENT_KEY, personDoc());
      expect(resource.managingOrganization).to.deep.equal({ reference: 'Organization/clinic1' });
    });

    it('omits the subject when its path resolves to nothing', () => {
      const doc = reportDoc() as Record<string, any>;
      delete doc.fields.inputs;
      const { resource } = mapWith(mapping(), ENCOUNTER_KEY, doc);
      expect(resource).to.not.have.property('subject');
    });

    it('maps a date of death', () => {
      const { resource } = mapWith(mapping(), PATIENT_KEY, { ...personDoc(), date_of_death: '2026-02-03' });
      expect(resource.deceasedDateTime).to.equal('2026-02-03');
    });

    it('warns about an unparseable date and omits the element', () => {
      const doc = { ...personDoc(), date_of_birth: 'last Tuesday', date_of_death: 'later' };
      const { resource, warnings } = mapWith(mapping(), PATIENT_KEY, doc);
      expect(resource).to.not.have.property('birthDate');
      expect(resource).to.not.have.property('deceasedDateTime');
      expect(warnings).to.contain('Patient.birthDate');
      expect(warnings).to.contain('is not a date.');
      expect(warnings).to.contain('is not a date/time.');
    });

    it('maps without a warn callback, because warnings are optional', () => {
      const config = load();
      const doc = { ...personDoc(), sex: 'intersex', date_of_birth: 'nonsense' };
      expect(() => mapDocument(bindingOf(config, PATIENT_KEY), doc, { config })).to.not.throw();
      const report = reportDoc() as Record<string, any>;
      report.fields.vitals.weight_kg = 'heavy';
      expect(() => projectObservations(bindingOf(config, ENCOUNTER_KEY), report, { config })).to.not.throw();
    });
  });

  describe('projectObservations', () => {
    it('projects one Observation per included, code-resolved field', () => {
      const { observations } = projectWith(mapping(), reportDoc());
      const shared = {
        resourceType: 'Observation',
        meta: { versionId: '1-def', lastUpdated: REPORTED },
        status: 'final',
        // Every projected Observation is an answer to a form question.
        category: SURVEY,
        encounter: { reference: `Encounter/${REPORT_ID}` },
        subject: { reference: `Patient/${PATIENT_ID}` },
        effectiveDateTime: REPORTED,
      };
      expect(observations).to.deep.equal([
        {
          ...shared,
          // <reportUuid>.<code>, so one document can yield many resources.
          id: `${REPORT_ID}.u-lmp-date`,
          code: {
            coding: [{ system: `${CANONICAL_BASE}/CodeSystem/cht-fields`, code: 'u-lmp-date', display: 'LMP date' }],
            text: 'LMP date',
          },
          valueDateTime: '2026-01-15',
        },
        {
          ...shared,
          id: `${REPORT_ID}.29463-7`,
          code: {
            coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }],
            text: 'Body weight',
          },
          // The string '62.5' parsed into a Quantity.
          valueQuantity: { value: 62.5, unit: 'kg', system: 'http://unitsofmeasure.org', code: 'kg' },
        },
      ]);
    });

    it('dates the Observation by the visit, and its meta by the report', () => {
      // effectiveDateTime is clinical time and follows Encounter.period.start;
      // meta.lastUpdated is when the document was written, as on every resource.
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.period.start'] = {
        source: { kind: 'field', path: 'visit_date' },
      };
      const doc = reportDoc() as Record<string, any>;
      doc.fields.visit_date = '2023-11-10';
      const [observation] = projectWith(raw, doc).observations;
      expect(observation.effectiveDateTime).to.equal('2023-11-10');
      expect(observation.meta).to.deep.equal({ versionId: '1-def', lastUpdated: REPORTED });
    });

    it('carries a code with no display as the code alone', () => {
      const raw = mapping() as Record<string, any>;
      delete raw.adHocCodeSystem.codes['app:pregnancy/u_lmp_date'].display;
      const [observation] = projectWith(raw, reportDoc()).observations;
      expect(observation.code).to.deep.equal({
        coding: [{ system: `${CANONICAL_BASE}/CodeSystem/cht-fields`, code: 'u-lmp-date' }],
      });
    });

    it('skips a field the report does not carry', () => {
      const doc = reportDoc() as Record<string, any>;
      delete doc.fields.vitals;
      const { observations } = projectWith(mapping(), doc);
      expect(observations.map(observation => observation.id)).to.deep.equal([`${REPORT_ID}.u-lmp-date`]);
    });

    it('skips a question with no resolvable code', () => {
      const raw = mapping() as Record<string, any>;
      raw.questionMappings = {};
      const { observations } = projectWith(raw, reportDoc());
      expect(observations.map(observation => observation.id)).to.deep.equal([`${REPORT_ID}.u-lmp-date`]);
    });

    it('falls back to reported_date when the visit date resolves to nothing', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.period.start'] = {
        source: { kind: 'field', path: 'absent' },
      };
      const { observations } = projectWith(raw, reportDoc());
      expect(observations[0].effectiveDateTime).to.equal(REPORTED);
    });

    it('falls back to reported_date when no visit date is bound', () => {
      const raw = mapping() as Record<string, any>;
      delete raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.period.start'];
      const { observations } = projectWith(raw, reportDoc());
      expect(observations[0].effectiveDateTime).to.equal(REPORTED);
    });

    it('omits the effective time and meta when the document has no usable date at all', () => {
      const { observations } = projectWith(mapping(), { _id: 'r1', fields: { vitals: { weight_kg: '10' } } });
      expect(observations[0]).to.not.have.property('effectiveDateTime');
      expect(observations[0].meta).to.deep.equal({});
    });

    it('honours each explicit value mode', () => {
      const modes = {
        valueString: { raw: 'hello', expected: { valueString: 'hello' } },
        valueBoolean: { raw: 'yes', expected: { valueBoolean: true } },
        valueDateTime: { raw: '2026-01-15', expected: { valueDateTime: '2026-01-15' } },
        valueCodeableConcept: { raw: ' other ', expected: { valueCodeableConcept: { text: 'other' } } },
        valueQuantity: { raw: '7', expected: { valueQuantity: { value: 7 } } },
      };
      for (const [mode, { raw: value, expected }] of Object.entries(modes)) {
        const raw = mapping() as Record<string, any>;
        raw.facade.resources[ENCOUNTER_KEY].observations = {
          'app:pregnancy/weight_kg': {
            codeSource: 'question-mapping',
            include: true,
            valueMode: mode,
            source: { kind: 'field', path: 'answer' },
          },
        };
        const doc = reportDoc() as Record<string, any>;
        doc.fields.answer = value;
        const [observation] = projectWith(raw, doc).observations;
        expect(observation, mode).to.deep.include(expected as Record<string, unknown>);
      }
    });

    it('infers a value type when the mode is auto', () => {
      const cases: readonly [unknown, string][] = [
        ['yes', 'valueBoolean'],
        ['62.5', 'valueQuantity'],
        ['2026-01-15', 'valueDateTime'],
        ['some text', 'valueString'],
      ];
      for (const [value, expectedKey] of cases) {
        const raw = mapping() as Record<string, any>;
        raw.facade.resources[ENCOUNTER_KEY].observations = {
          'app:pregnancy/weight_kg': {
            codeSource: 'question-mapping',
            include: true,
            valueMode: 'auto',
            source: { kind: 'field', path: 'answer' },
          },
        };
        const doc = reportDoc() as Record<string, any>;
        doc.fields.answer = value;
        const [observation] = projectWith(raw, doc).observations;
        expect(observation, `${String(value)} should infer ${expectedKey}`).to.have.property(expectedKey);
      }
    });

    it('prefers a Quantity when a unit is configured, even on auto', () => {
      const raw = mapping() as Record<string, any>;
      const projection = raw.facade.resources[ENCOUNTER_KEY].observations['app:pregnancy/weight_kg'];
      projection.valueMode = 'auto';
      projection.unit.display = 'kilogram';
      const [, weight] = projectWith(raw, reportDoc()).observations;
      expect(weight.valueQuantity).to.deep.equal({
        value: 62.5,
        unit: 'kilogram',
        system: 'http://unitsofmeasure.org',
        code: 'kg',
      });
    });

    it('labels a Quantity with the unit code when the unit has no display', () => {
      const raw = mapping() as Record<string, any>;
      delete raw.facade.resources[ENCOUNTER_KEY].observations['app:pregnancy/weight_kg'].unit.display;
      const [, weight] = projectWith(raw, reportDoc()).observations;
      expect(weight.valueQuantity).to.deep.equal({
        value: 62.5,
        unit: 'kg',
        system: 'http://unitsofmeasure.org',
        code: 'kg',
      });
    });

    it('skips an observation whose value will not coerce, and says why', () => {
      const doc = reportDoc() as Record<string, any>;
      doc.fields.vitals.weight_kg = 'quite heavy';
      doc.fields.gestational_age.u_lmp_date = 'not a date';
      const { observations, warnings } = projectWith(mapping(), doc);
      expect(observations).to.deep.equal([]);
      expect(warnings).to.contain('is not a number');
      expect(warnings).to.contain('is not a date/time');
    });

    it('skips an observation whose boolean value will not coerce', () => {
      const raw = mapping() as Record<string, any>;
      raw.facade.resources[ENCOUNTER_KEY].observations = {
        'app:pregnancy/weight_kg': {
          codeSource: 'question-mapping',
          include: true,
          valueMode: 'valueBoolean',
          source: { kind: 'field', path: 'vitals.weight_kg' },
        },
      };
      const { observations, warnings } = projectWith(raw, reportDoc());
      expect(observations).to.deep.equal([]);
      expect(warnings).to.contain('is not a boolean');
    });

    it('refuses to synthesise an id that is not a legal FHIR id', () => {
      // A uuid long enough that uuid + '.' + code exceeds 64 characters.
      const { observations, warnings } = projectWith(mapping(), { ...reportDoc(), _id: 'r'.repeat(60) });
      expect(observations).to.deep.equal([]);
      expect(warnings).to.contain('is not a valid FHIR id');
    });

    it('projects without a subject when the Encounter binds none', () => {
      const raw = mapping() as Record<string, any>;
      delete raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.subject'];
      const { observations } = projectWith(raw, reportDoc());
      expect(observations).to.have.length(2);
      expect(observations[0]).to.not.have.property('subject');
    });
  });
});

describe('cht-fhir repeat groups', () => {
  /** A report with a member repeat, which is what an XLSForm produces. */
  const household = (members: unknown[]) => ({
    ...reportDoc(),
    fields: { ...reportDoc().fields, members },
  });

  const withReason = (path: string) => {
    const raw = mapping() as Record<string, any>;
    raw.facade.resources[ENCOUNTER_KEY].elements['Encounter.reasonCode'] = { source: { kind: 'field', path } };
    return raw;
  };

  it('refuses a repeat rather than serving [object Object]', () => {
    // `String([{…}])` is `"[object Object]"`, which every coercion accepts —
    // so without this the facade serves it, and a consumer has no way to know
    // it is not data.
    const { resource, warnings } = mapWith(
      withReason('members'), ENCOUNTER_KEY, household([{ name: 'Ada' }, { name: 'Grace' }]),
    );
    expect(resource).to.not.have.property('reasonCode');
    expect(warnings).to.contain('Encounter.reasonCode');
    expect(warnings).to.contain('a list of 2 values');
  });

  it('reads one entry of a repeat by index', () => {
    const { resource, warnings } = mapWith(
      withReason('members.0.name'), ENCOUNTER_KEY, household([{ name: 'Ada' }, { name: 'Grace' }]),
    );
    expect(resource.reasonCode).to.deep.equal([{ text: 'Ada' }]);
    expect(warnings).to.equal('');
  });

  it('says nothing about a repeat with nothing in it', () => {
    // An empty repeat is an absent value, not an unanswered question.
    const { resource, warnings } = mapWith(withReason('members'), ENCOUNTER_KEY, household([]));
    expect(resource).to.not.have.property('reasonCode');
    expect(warnings).to.equal('');
  });

  it('reports a repeat reached through an identifier, the subject or an observation too', () => {
    // Every slot that reads a value, not just `elements` — each one would
    // otherwise stringify the list on its own path.
    const raw = mapping() as Record<string, any>;
    raw.facade.resources[PATIENT_KEY].identifiers = [{
      source: { kind: 'doc', path: 'doc.ids' },
      system: '{base}/identifier/external-id',
      use: 'usual',
    }];
    const patient = mapWith(raw, PATIENT_KEY, { ...personDoc(), ids: ['a', 'b'] });
    expect(patient.resource).to.not.have.property('identifier');
    expect(patient.warnings).to.contain('identifier {base}/identifier/external-id');
    expect(patient.warnings).to.contain('a list of 2 values');

    const listedSubject = {
      ...reportDoc(),
      fields: { ...reportDoc().fields, inputs: { contact: { _id: ['p1', 'p2'] } } },
    };
    const encounter = mapWith(raw, ENCOUNTER_KEY, listedSubject);
    expect(encounter.resource).to.not.have.property('subject');
    expect(encounter.warnings).to.contain('Encounter.subject');
    // The Observations share the Encounter's subject, so they drop it too.
    expect(projectWith(raw, listedSubject).observations[0]).to.not.have.property('subject');

    const listedAnswer = { ...reportDoc(), fields: { ...reportDoc().fields, vitals: { weight_kg: [{ v: 1 }] } } };
    const { observations, warnings } = projectWith(raw, listedAnswer);
    expect(observations.map(observation => observation.id)).to.deep.equal([`${REPORT_ID}.u-lmp-date`]);
    expect(warnings).to.contain('observation app:pregnancy/weight_kg');
  });
});
