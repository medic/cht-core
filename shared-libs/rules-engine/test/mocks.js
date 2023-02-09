const rewire = require('rewire');
const chtSettingsDoc = require('../../../config/default/app_settings.json');

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const chtDocs = {
  contact: {
    _id: 'patient',
    name: 'cht_mock_contact',
    type: 'contact',
    contact_type: 'person',
    patient_id: 'patient_id',
  },

  place: {
    _id: 'place',
    name: 'cht_mock_place',
    type: 'health_center',
    place_id: 'place_id',
  },

  pregnancyReport: {
    _id: 'pregReport',
    type: 'data_record',
    form: 'pregnancy',
    fields: {
      t_pregnancy_follow_up_date: '2000-01-01',
      patient_uuid: 'patient',
      patient_id: 'patient_id',
      anc_visits_hf: {
        anc_visits_hf_past: {
          last_visit_attended: 'yes',
          report_other_visits: 'yes',
          visited_hf_count: 3,
        },
      },
    },
    patient_id: 'patient_id',
    reported_date: 1,
  },
};

const userContactDoc = { _id: 'user' };
const userSettingsDoc = { _id: 'org.couchdb.user:username' };

module.exports = {
  MS_IN_DAY,

  noolsPartnerTemplate: (code, options = {}) => `define Target { data: null }
define Contact { contact: null, ${options.includeTasks ? 'tasks: null,' : ''} reports: null }
define Task { data: null }
rule GenerateEvents {
  when { c: Contact } then { ${code} }
}`,

  mockEmission: (msOffset, assigned = {}) => {
    return Object.assign({
      _id: 'abc',
      doc: { contact: { _id: 'gen' }, },
      resolved: false,
      delete: false,
      date: new Date(Date.now() + msOffset),
      readyStart: 0,
      readyEnd: 0,
    }, assigned);
  },

  chtSettingsDoc,
  chtDocs,

  chtRulesSettings: assign => {
    return Object.assign({
      rules: chtSettingsDoc.tasks.rules,
      targets: chtSettingsDoc.tasks.targets.items,
      taskSchedules: chtSettingsDoc.tasks.schedules,
      emitter: 'nools',
      enableTasks: true,
      enableTargets: true,
      user: userSettingsDoc,
      contact: userContactDoc,
      monthStartDate: 1,
    }, assign);
  },

  RestorableRulesStateStore: () => restorable('../src/rules-state-store', ['state', 'currentUser', 'onStateChange']),
};

const restorable = (path, attributes = []) => {
  const mod = rewire(path);
  mod.restore = () => attributes.forEach(attr => mod.__set__(attr, undefined));
  return mod;
};
