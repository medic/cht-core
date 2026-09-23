/**
 * Fixtures modelled on a real deployment's FHIR mapping: a Patient
 * bound to the `person` contact type and an Encounter bound to the
 * `app:pregnancy` form, projecting two Observations.
 *
 * That pair is the whole facade — Patient, Encounter and the Observations an
 * Encounter hosts are the three resource types served — so `mapping()` is a
 * complete deployment rather than a slice of one.
 */

export const CANONICAL_BASE = 'http://example.org/cht/fhir';

export const PATIENT_KEY = 'Patient/contact_type/person';
export const ENCOUNTER_KEY = 'Encounter/form/app:pregnancy';

export const patientBinding = () => ({
  resourceType: 'Patient',
  source: { kind: 'contact_type', id: 'person' },
  status: 'active',
  sourceFilter: null,
  elements: {
    'Patient.name.text': { source: { kind: 'doc', path: 'doc.name' } },
    'Patient.gender': { source: { kind: 'doc', path: 'doc.sex' } },
    'Patient.birthDate': { source: { kind: 'doc', path: 'doc.date_of_birth' } },
    'Patient.telecom.phone': { source: { kind: 'doc', path: 'doc.phone' } },
    'Patient.deceasedDateTime': { source: { kind: 'doc', path: 'doc.date_of_death' } },
  },
  identifiers: [{
    source: { kind: 'doc', path: 'doc.patient_id' },
    system: '{base}/identifier/patient-id',
    type: {
      code: 'MR',
      display: 'Medical record number',
      system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
    },
    use: 'official',
  }],
  observations: {},
});

export const encounterBinding = () => ({
  resourceType: 'Encounter',
  source: { kind: 'form', id: 'app:pregnancy' },
  status: 'active',
  sourceFilter: null,
  elements: {
    'Encounter.status': { source: { kind: 'const', value: 'finished' } },
    'Encounter.class': { source: { kind: 'const', value: 'HH' } },
    'Encounter.type': { source: { kind: 'const', value: 'Home Visit' } },
    'Encounter.period.start': { source: { kind: 'doc', path: 'doc.reported_date' } },
    'Encounter.participant.individual': { source: { kind: 'doc', path: 'doc.contact._id' } },
    // Also the subject of every Observation this Encounter projects.
    'Encounter.subject': { source: { kind: 'doc', path: 'doc.fields.inputs.contact._id' } },
  },
  identifiers: [],
  observations: {
    'app:pregnancy/u_lmp_date': {
      codeSource: 'ad-hoc',
      include: true,
      status: 'active',
      valueMode: 'valueDateTime',
      source: { kind: 'field', path: 'gestational_age.u_lmp_date' },
    },
    'app:pregnancy/weight_kg': {
      codeSource: 'question-mapping',
      include: true,
      status: 'active',
      valueMode: 'valueQuantity',
      unit: { system: 'http://unitsofmeasure.org', code: 'kg', display: 'kg' },
      source: { kind: 'field', path: 'vitals.weight_kg' },
    },
  },
});

export const mapping = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 2,
  orphans: [],
  questionMappings: {
    'app:pregnancy/weight_kg': {
      code: '29463-7',
      display: 'Body weight',
      system: 'http://loinc.org',
      status: 'confirmed',
      dictionaryVersion: 'LOINC-2.82',
      source: 'starter-pack',
    },
  },
  adHocCodeSystem: {
    canonical: `${CANONICAL_BASE}/CodeSystem/cht-fields`,
    frozen: false,
    codes: {
      'app:pregnancy/u_lmp_date': { code: 'u-lmp-date', display: 'LMP date' },
    },
  },
  facade: {
    canonicalBase: CANONICAL_BASE,
    resources: {
      [PATIENT_KEY]: patientBinding(),
      [ENCOUNTER_KEY]: encounterBinding(),
    },
    ...overrides,
  },
});

/** `resources` merges rather than replaces, unlike `mapping`'s. */
export const mappingWith = (
  overrides: { resources?: Record<string, unknown> } & Record<string, unknown> = {},
) => {
  const { resources, ...rest } = overrides;
  return mapping({
    resources: {
      [PATIENT_KEY]: patientBinding(),
      [ENCOUNTER_KEY]: encounterBinding(),
      ...(resources ?? {}),
    },
    ...rest,
  });
};

/** A CHT person contact, shaped like tests/factories/cht/contacts/person.js. */
export const personDoc = () => ({
  _id: '11111111-2222-3333-4444-555555555555',
  _rev: '3-abc',
  type: 'person',
  name: 'Mary Smith',
  // CHT does not zero-pad, and FHIR rejects an unpadded date.
  date_of_birth: '1991-11-6',
  sex: 'Female',
  phone: '+254700000000',
  patient_id: '10072',
  reported_date: 1700000000000,
  parent: { _id: 'clinic1', parent: { _id: 'hc1' } },
});

/** A CHT report, with answers nested by form group as XForms produces them. */
export const reportDoc = () => ({
  _id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  _rev: '1-def',
  type: 'data_record',
  form: 'pregnancy',
  reported_date: 1700000000000,
  contact: { _id: 'chw-1', parent: { _id: 'clinic1' } },
  fields: {
    inputs: { contact: { _id: '11111111-2222-3333-4444-555555555555' } },
    patient_uuid: '11111111-2222-3333-4444-555555555555',
    patient_id: '10072',
    gestational_age: { u_lmp_date: '2026-01-15' },
    // Form answers are strings even when they are numbers.
    vitals: { weight_kg: '62.5' },
  },
});

