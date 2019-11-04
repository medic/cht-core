const rewire = require('rewire');

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const chtDocs = {
  contact: {
    _id: 'patient',
    name: 'chw',
    type: 'contact',
    contact_type: 'person',
    patient_id: 'patient_id',
  },

  pregnancyReport: {
    _id: 'report',
    type: 'data_record',
    form: 'pregnancy',
    fields: {
      t_pregnancy_follow_up_date: '2000-01-01',
      patient_uuid: 'patient',
      patient_id: 'patient_id',
    },
    patient_id: 'patient_id',
    reported_date: 0,
  },
};

module.exports = {
  MS_IN_DAY,

  noolsPartnerTemplate: (code, options = {}) => `define Target { data: null }
define Contact { contact: null, ${options.includeTasks ? 'tasks: null,' : ''} reports: null }
define Task { data: null }
rule GenerateEvents {
  when { c: Contact } then { ${code} }
}`,

  mockEmission: (msOffset, assigned = {}) => Object.assign({
    _id: 'abc',
    doc: {
      contact: { _id: 'gen' },
    },
    resolved: false,
    delete: false,
    date: new Date(Date.now() + msOffset),
    startTime: Date.now() + msOffset - MS_IN_DAY,
    endTime: Date.now() + msOffset + MS_IN_DAY,
  }, assigned),

  chtDocs,

  RestorableContactStateStore: () => restorable('../src/contact-state-store', ['state', 'currentUser', 'onStateChange']),
};

const restorable = (path, attributes = []) => {
  const mod = rewire(path);
  mod.restore = () => attributes.forEach(attr => mod.__set__(attr, undefined));
  return mod;
};