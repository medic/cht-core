const utils = require('../../utils');
const sentinelUtils = require('../sentinel/utils');

const chai = require('chai');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);

const contacts = [
  {
    _id: 'district_hospital',
    name: 'District hospital',
    type: 'district_hospital',
    contact: { _id: 'chw3' },
    linked_docs: {
      some_tag1: 'chw1',
      some_tag2: 'chw2',
      some_tag3: { _id: 'chw3' },
      same_tag: 'chw4',
    },
  },
  {
    _id: 'health_center',
    name: 'Health Center',
    type: 'health_center',
    parent: { _id: 'district_hospital' },
    contact: { _id: 'chw2' },
    linked_docs: {},
  },
  {
    _id: 'clinic1',
    name: 'Clinic',
    type: 'clinic',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    contact: { _id: 'chw1' },
    linked_docs: {
      some_tag4: { _id: 'chw4' },
      missing1: { _id: 'non-existent' },
      missing2: 'non-existent',
      same_tag: 'chw1',
    },
  },
  {
    _id: 'chw1',
    type: 'person',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: 'phone1',
    name: 'chw1',
    linked_docs: {
      sibling: 'chw5',
    },
  },
  {
    _id: 'chw2',
    type: 'person',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    phone: 'phone2',
    name: 'chw2',
  },
  {
    _id: 'chw3',
    type: 'person',
    parent: { _id: 'district_hospital' },
    phone: 'phone3',
  },
  {
    _id: 'chw4',
    type: 'person',
    parent: { _id: 'health_center', parent: { _id: 'district_hospital' } },
    phone: 'phone4',
  },
  {
    _id: 'chw5',
    type: 'person',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: 'phone5',
    linked_docs: {
      sibling: 'chw6',
    },
  },
  {
    _id: 'chw6',
    type: 'person',
    parent: { _id: 'clinic1', parent: { _id: 'health_center', parent: { _id: 'district_hospital' } } },
    phone: 'phone6',
  },
  {
    _id: 'chw7',
    type: 'person',
    parent: { _id: 'other_place' },
    phone: 'phone7',
  }
];

const expectTasks = (doc, expectations) => {
  chai
    .expect(doc.tasks)
    .excludingEvery(['uuid', 'state_history', 'state'])
    .to.have.deep.members(expectations);
};

describe('SMS workflows', () => {
  beforeAll(() => utils.saveDocs(contacts));
  afterAll(() => utils.revertDb());

  afterEach(() => utils.revertDb(contacts.map(c => c._id)));

  describe('mapping recipients', () => {
    it('should correctly map parent for patient', () => {
      const settings = {
        transitions: {
          accept_patient_reports: true,
          update_clinics: true
        },
        patient_reports: [
          {
            form: 'FORM',
            messages: [
              {
                event_type: 'report_accepted',
                recipient: 'parent',
                message: [{ content: 'to parent' }],
              },
              {
                event_type: 'report_accepted',
                recipient: 'grandparent',
                message: [{ content: 'to grandparent' }],
              }
            ]
          }
        ],
        forms: { FORM: { } }
      };

      const reports = [
        {
          _id: 'patient_chw6',
          type: 'data_record',
          form: 'FORM',
          from: 'phone4', // chw4 > health_center
          fields: {
            patient_id: 'chw6', // chw6 > clinic > health_center
          },
          reported_date: new Date().getTime(),
        },
        {
          _id: 'patient_chw3',
          type: 'data_record',
          form: 'FORM',
          from: 'phone4', // chw4 > health_center
          fields: {
            patient_id: 'chw3', // chw3 > district
          },
          reported_date: new Date().getTime(),
        },
        {
          _id: 'patient_chw4',
          type: 'data_record',
          form: 'FORM',
          from: 'phone6', // chw6 > clinic
          fields: {
            patient_id: 'chw4',  // chw4 > health_center
          },
          reported_date: new Date().getTime(),
        },
      ];

      const ids = reports.map(report => report._id);

      return utils
        .updateSettings(settings)
        .then(() => utils.saveDocs(reports))
        .then(() => sentinelUtils.waitForSentinel(ids))
        .then(() => utils.getDocs(ids))
        .then(([ patientChw6, patientChw3, patientChw4  ]) => {
          expectTasks(patientChw6, [
            // health_center.contact._id === chw2
            { messages: [{ to: 'phone2',  message: 'to parent' }] },
            // district.contact._id === chw3
            { messages: [{ to: 'phone3', message: 'to grandparent' }] },
          ]);

          expectTasks(patientChw3, [
            // defaults to sender
            { messages: [{ to: 'phone4',  message: 'to parent' }] },
            // defaults to sender
            { messages: [{ to: 'phone4', message: 'to grandparent' }] },
          ]);

          expectTasks(patientChw4, [
            // district.contact._id === chw3
            { messages: [{ to: 'phone3',  message: 'to parent' }] },
            // defaults to sender
            { messages: [{ to: 'phone6', message: 'to grandparent' }] },
          ]);
        });
    });

    it('should use legacy mapping for parent for contact', () => {
      const settings = {
        transitions: {
          conditional_alerts: true,
          update_clinics: true
        },
        alerts: [
          {
            form: 'FORM',
            condition: 'true',
            message: 'to parent',
            recipient: 'parent'
          },
          {
            form: 'FORM',
            condition: 'true',
            message: 'to grandparent',
            recipient: 'grandparent'
          },
        ],
        forms: { FORM: { } }
      };

      const reports = [
        {
          _id: 'contact_chw6',
          type: 'data_record',
          form: 'FORM',
          from: 'phone6', // chw6 > clinic
          reported_date: new Date().getTime(),
        },
        {
          _id: 'contact_chw4',
          type: 'data_record',
          form: 'FORM',
          from: 'phone4', // chw4 > health_center
          reported_date: new Date().getTime(),
        },
        {
          _id: 'contact_chw3',
          type: 'data_record',
          form: 'FORM',
          from: 'phone3', // chw3 > district
          reported_date: new Date().getTime(),
        },
      ];

      const ids = reports.map(report => report._id);

      return utils
        .updateSettings(settings)
        .then(() => utils.saveDocs(reports))
        .then(() => sentinelUtils.waitForSentinel(ids))
        .then(() => utils.getDocs(ids))
        .then(([ contactChw6, contactChw4, contactChw3  ]) => {
          expectTasks(contactChw6, [
            // context.parent = health_center
            // context.parent.parent = district
            // district.contact._id === chw3
            { messages: [{ to: 'phone3',  message: 'to parent' }] },
            // context.parent.parent.parent = nothing, defaults to sender
            { messages: [{ to: 'phone6', message: 'to grandparent' }] },
          ]);

          expectTasks(contactChw4, [
            // context.parent = health_center
            // context.parent.parent = district
            // district.contact._id === chw3
            { messages: [{ to: 'phone3',  message: 'to parent' }] },
            // context.parent.parent.parent = nothing, defaults to sender
            { messages: [{ to: 'phone4', message: 'to grandparent' }] },
          ]);

          expectTasks(contactChw3, [
            // context.parent = undefined
            // context.parent.parent.parent = nothing, defaults to sender
            { messages: [{ to: 'phone3',  message: 'to parent' }] },
            // context.parent.parent.parent = nothing, defaults to sender
            { messages: [{ to: 'phone3', message: 'to grandparent' }] },
          ]);
        });
    });

    it('should correctly map ancestor for patient', () => {
      const settings = {
        transitions: {
          accept_patient_reports: true,
          update_clinics: true
        },
        patient_reports: [
          {
            form: 'FORM',
            messages: [
              {
                event_type: 'report_accepted',
                recipient: 'ancestor:clinic',
                message: [{ content: 'to clinic' }],
              },
              {
                event_type: 'report_accepted',
                recipient: 'ancestor:health_center',
                message: [{ content: 'to hc' }],
              },
              {
                event_type: 'report_accepted',
                recipient: 'ancestor:district_hospital',
                message: [{ content: 'to district' }],
              }
            ]
          }
        ],
        forms: { FORM: { } }
      };

      const reports = [
        {
          _id: 'patient_chw6',
          type: 'data_record',
          form: 'FORM',
          from: 'phone4', // chw4 > health_center
          fields: {
            patient_id: 'chw6', // chw6 > clinic > health_center
          },
          reported_date: new Date().getTime(),
        },
        {
          _id: 'patient_chw3',
          type: 'data_record',
          form: 'FORM',
          from: 'phone4', // chw4 > health_center
          fields: {
            patient_id: 'chw3', // chw3 > district
          },
          reported_date: new Date().getTime(),
        },
        {
          _id: 'patient_chw4',
          type: 'data_record',
          form: 'FORM',
          from: 'phone6', // chw6 > clinic
          fields: {
            patient_id: 'chw4',  // chw4 > health_center
          },
          reported_date: new Date().getTime(),
        },
      ];

      const ids = reports.map(report => report._id);

      return utils
        .updateSettings(settings)
        .then(() => utils.saveDocs(reports))
        .then(() => sentinelUtils.waitForSentinel(ids))
        .then(() => utils.getDocs(ids))
        .then(([ patientChw6, patientChw3, patientChw4  ]) => {
          expectTasks(patientChw6, [
            // clinic.contact._id === chw2
            { messages: [{ to: 'phone1',  message: 'to clinic' }] },
            // health_center.contact._id === chw2
            { messages: [{ to: 'phone2', message: 'to hc' }] },
            // district.contact._id === chw3
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);

          expectTasks(patientChw3, [
            // no clinic, defaults to sender
            { messages: [{ to: 'phone4',  message: 'to clinic' }] },
            // no hc, defaults to sender
            { messages: [{ to: 'phone4', message: 'to hc' }] },
            // district.contact._id === chw3
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);

          expectTasks(patientChw4, [
            // no clinic, defaults to sender
            { messages: [{ to: 'phone6',  message: 'to clinic' }] },
            // health_center.contact._id === chw2
            { messages: [{ to: 'phone2', message: 'to hc' }] },
            // district.contact._id === chw3
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);
        });
    });

    it('should correctly map ancestor for contact', () => {
      const settings = {
        transitions: {
          conditional_alerts: true,
          update_clinics: true
        },
        alerts: [
          {
            form: 'FORM',
            condition: 'true',
            message: 'to clinic',
            recipient: 'ancestor:clinic'
          },
          {
            form: 'FORM',
            condition: 'true',
            message: 'to hc',
            recipient: 'ancestor:health_center'
          },
          {
            form: 'FORM',
            condition: 'true',
            message: 'to district',
            recipient: 'ancestor:district_hospital'
          },
        ],
        forms: { FORM: { } }
      };

      const reports = [
        {
          _id: 'contact_chw6',
          type: 'data_record',
          form: 'FORM',
          from: 'phone6', // chw6 > clinic
          reported_date: new Date().getTime(),
        },
        {
          _id: 'contact_chw4',
          type: 'data_record',
          form: 'FORM',
          from: 'phone4', // chw4 > health_center
          reported_date: new Date().getTime(),
        },
        {
          _id: 'contact_chw3',
          type: 'data_record',
          form: 'FORM',
          from: 'phone3', // chw3 > district
          reported_date: new Date().getTime(),
        },
      ];

      const ids = reports.map(report => report._id);

      return utils
        .updateSettings(settings)
        .then(() => utils.saveDocs(reports))
        .then(() => sentinelUtils.waitForSentinel(ids))
        .then(() => utils.getDocs(ids))
        .then(([ contactChw6, contactChw4, contactChw3  ]) => {
          expectTasks(contactChw6, [
            // context.parent = health_center
            { messages: [{ to: 'phone6',  message: 'to clinic' }] }, // to sender
            { messages: [{ to: 'phone2', message: 'to hc' }] },
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);

          expectTasks(contactChw4, [
            // context.parent = health_center
            { messages: [{ to: 'phone4',  message: 'to clinic' }] }, // to sender
            { messages: [{ to: 'phone2',  message: 'to hc' }] },
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);

          expectTasks(contactChw3, [
            // context.contact.parent = district
            { messages: [{ to: 'phone3',  message: 'to clinic' }] },
            { messages: [{ to: 'phone3',  message: 'to hc' }] },
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);
        });
    });

    it('should correctly map linked contacts by tag for patient', () => {
      const settings = {
        transitions: {
          accept_patient_reports: true,
          update_clinics: true
        },
        patient_reports: [
          {
            form: 'FORM',
            messages: [
              {
                event_type: 'report_accepted',
                recipient: 'link:some_tag1',
                message: [{ content: 'to some_tag1' }],
              },
              {
                event_type: 'report_accepted',
                recipient: 'link:some_tag3',
                message: [{ content: 'to some_tag3' }],
              },
              {
                event_type: 'report_accepted',
                recipient: 'link:some_tag4',
                message: [{ content: 'to some_tag4' }],
              },
              {
                event_type: 'report_accepted',
                recipient: 'link:missing1',
                message: [{ content: 'to missing1' }],
              },
              {
                event_type: 'report_accepted',
                recipient: 'link:missing_tag',
                message: [{ content: 'to missing_tag' }],
              },
              {
                event_type: 'report_accepted',
                recipient: 'link:sibling',
                message: [{ content: 'to sibling' }],
              },
              {
                event_type: 'report_accepted',
                recipient: 'link:same_tag',
                message: [{ content: 'to same_tag' }],
              },
            ]
          }
        ],
        forms: { FORM: { } }
      };

      const reports = [
        {
          _id: 'patient_chw5',
          type: 'data_record',
          form: 'FORM',
          from: 'phone7',
          fields: {
            patient_id: 'chw5', // chw5 > clinic > health_center
          },
          reported_date: new Date().getTime(),
        },
        {
          _id: 'patient_chw3',
          type: 'data_record',
          form: 'FORM',
          from: 'phone7', // chw7
          fields: {
            patient_id: 'chw3', // chw3 > district
          },
          reported_date: new Date().getTime(),
        },
        {
          _id: 'patient_chw4',
          type: 'data_record',
          form: 'FORM',
          from: 'phone6', // chw6 > clinic
          fields: {
            patient_id: 'chw4',  // chw4 > health_center
          },
          reported_date: new Date().getTime(),
        },
      ];

      const ids = reports.map(report => report._id);

      return utils
        .updateSettings(settings)
        .then(() => utils.saveDocs(reports))
        .then(() => sentinelUtils.waitForSentinel(ids))
        .then(() => utils.getDocs(ids))
        .then(([ patientChw5, patientChw3, patientChw4  ]) => {
          expectTasks(patientChw5, [
            { messages: [{ to: 'phone1', message: 'to some_tag1' }] },
            { messages: [{ to: 'phone3', message: 'to some_tag3' }] },
            { messages: [{ to: 'phone4', message: 'to some_tag4' }] },
            { messages: [{ to: 'phone7', message: 'to missing1' }] }, // sender
            { messages: [{ to: 'phone7', message: 'to missing_tag' }] }, // sender
            { messages: [{ to: 'phone6', message: 'to sibling' }] },
            { messages: [{ to: 'phone1', message: 'to same_tag' }] },
          ]);

          expectTasks(patientChw3, [
            { messages: [{ to: 'phone1', message: 'to some_tag1' }] },
            { messages: [{ to: 'phone3', message: 'to some_tag3' }] },
            { messages: [{ to: 'phone7', message: 'to some_tag4' }] }, // sender
            { messages: [{ to: 'phone7', message: 'to missing1' }] }, // sender
            { messages: [{ to: 'phone7', message: 'to missing_tag' }] }, // sender
            { messages: [{ to: 'phone7', message: 'to sibling' }] }, // sender
            { messages: [{ to: 'phone4', message: 'to same_tag' }] },
          ]);

          expectTasks(patientChw4, [
            { messages: [{ to: 'phone1', message: 'to some_tag1' }] },
            { messages: [{ to: 'phone3', message: 'to some_tag3' }] },
            { messages: [{ to: 'phone4', message: 'to some_tag4' }] }, // aceessible via submitter
            { messages: [{ to: 'phone6', message: 'to missing1' }] }, // sender
            { messages: [{ to: 'phone6', message: 'to missing_tag' }] }, // sender
            { messages: [{ to: 'phone6', message: 'to sibling' }] }, // sender
            { messages: [{ to: 'phone4', message: 'to same_tag' }] },
          ]);
        });
    });

    it('should correctly map linked contacts by tag for contact', () => {
      const settings = {
        transitions: {
          conditional_alerts: true,
          update_clinics: true
        },
        alerts: [
          {
            form: 'FORM',
            condition: 'true',
            message: 'to some_tag1',
            recipient: 'link:some_tag1'
          },
          {
            form: 'FORM',
            condition: 'true',
            message: 'to some_tag3',
            recipient: 'link:some_tag3'
          },
          {
            form: 'FORM',
            condition: 'true',
            message: 'to some_tag4',
            recipient: 'link:some_tag4'
          },
          {
            form: 'FORM',
            condition: 'true',
            message: 'to sibling',
            recipient: 'link:sibling'
          },
          {
            form: 'FORM',
            condition: 'true',
            message: 'to same_tag',
            recipient: 'link:same_tag'
          },
        ],
        forms: { FORM: { } }
      };

      const reports = [
        {
          _id: 'contact_chw5',
          type: 'data_record',
          form: 'FORM',
          from: 'phone5', // chw5 > clinic
          reported_date: new Date().getTime(),
        },
        {
          _id: 'contact_chw2',
          type: 'data_record',
          form: 'FORM',
          from: 'phone2', // chw2 > health_center
          reported_date: new Date().getTime(),
        },
        {
          _id: 'contact_chw3',
          type: 'data_record',
          form: 'FORM',
          from: 'phone3', // chw3 > district
          reported_date: new Date().getTime(),
        },
      ];

      const ids = reports.map(report => report._id);

      return utils
        .updateSettings(settings)
        .then(() => utils.saveDocs(reports))
        .then(() => sentinelUtils.waitForSentinel(ids))
        .then(() => utils.getDocs(ids))
        .then(([ contactChw5, contactChw2, contactChw3  ]) => {
          expectTasks(contactChw5, [
            { messages: [{ to: 'phone1', message: 'to some_tag1' }] },
            { messages: [{ to: 'phone3', message: 'to some_tag3' }] },
            { messages: [{ to: 'phone4', message: 'to some_tag4' }] },
            { messages: [{ to: 'phone6', message: 'to sibling' }] },
            { messages: [{ to: 'phone1', message: 'to same_tag' }] },
          ]);
          expectTasks(contactChw2, [
            { messages: [{ to: 'phone1', message: 'to some_tag1' }] },
            { messages: [{ to: 'phone3', message: 'to some_tag3' }] },
            { messages: [{ to: 'phone2', message: 'to some_tag4' }] }, // sender
            { messages: [{ to: 'phone2', message: 'to sibling' }] }, // sender
            { messages: [{ to: 'phone4', message: 'to same_tag' }] },
          ]);

          expectTasks(contactChw3, [
            { messages: [{ to: 'phone1', message: 'to some_tag1' }] },
            { messages: [{ to: 'phone3', message: 'to some_tag3' }] },
            { messages: [{ to: 'phone3', message: 'to some_tag4' }] }, // sender
            { messages: [{ to: 'phone3', message: 'to sibling' }] }, // sender
            { messages: [{ to: 'phone4', message: 'to same_tag' }] },
          ]);
        });
    });

    it('should correctly map linked contacts by type for patient', () => {
      const settings = {
        transitions: {
          accept_patient_reports: true,
          update_clinics: true
        },
        patient_reports: [
          {
            form: 'FORM',
            messages: [
              {
                event_type: 'report_accepted',
                recipient: 'link:clinic',
                message: [{ content: 'to clinic' }],
              },
              {
                event_type: 'report_accepted',
                recipient: 'link:health_center',
                message: [{ content: 'to health_center' }],
              },
              {
                event_type: 'report_accepted',
                recipient: 'link:district_hospital',
                message: [{ content: 'to district' }],
              },
            ]
          }
        ],
        forms: { FORM: { } }
      };

      const reports = [
        {
          _id: 'patient_chw5',
          type: 'data_record',
          form: 'FORM',
          from: 'phone7',
          fields: {
            patient_id: 'chw5', // chw5 > clinic > health_center
          },
          reported_date: new Date().getTime(),
        },
        {
          _id: 'patient_chw3',
          type: 'data_record',
          form: 'FORM',
          from: 'phone7', // chw7
          fields: {
            patient_id: 'chw3', // chw3 > district
          },
          reported_date: new Date().getTime(),
        },
        {
          _id: 'patient_chw4',
          type: 'data_record',
          form: 'FORM',
          from: 'phone7', // chw7
          fields: {
            patient_id: 'chw4',  // chw4 > health_center
          },
          reported_date: new Date().getTime(),
        },
      ];

      const ids = reports.map(report => report._id);

      return utils
        .updateSettings(settings)
        .then(() => utils.saveDocs(reports))
        .then(() => sentinelUtils.waitForSentinel(ids))
        .then(() => utils.getDocs(ids))
        .then(([ patientChw5, patientChw3, patientChw4  ]) => {
          expectTasks(patientChw5, [
            { messages: [{ to: 'phone1', message: 'to clinic' }] },
            { messages: [{ to: 'phone2', message: 'to health_center' }] },
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);

          expectTasks(patientChw3, [
            { messages: [{ to: 'phone7', message: 'to clinic' }] }, // sender
            { messages: [{ to: 'phone7', message: 'to health_center' }] }, // sender
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);

          expectTasks(patientChw4, [
            { messages: [{ to: 'phone7', message: 'to clinic' }] }, // sender
            { messages: [{ to: 'phone2', message: 'to health_center' }] },
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);
        });
    });

    it('should correctly map linked contacts by type for contact', () => {
      const settings = {
        transitions: {
          conditional_alerts: true,
          update_clinics: true
        },
        alerts: [
          {
            form: 'FORM',
            condition: 'true',
            message: 'to clinic',
            recipient: 'link:clinic'
          },
          {
            form: 'FORM',
            condition: 'true',
            message: 'to health_center',
            recipient: 'link:health_center'
          },
          {
            form: 'FORM',
            condition: 'true',
            message: 'to district',
            recipient: 'link:district_hospital'
          },
        ],
        forms: { FORM: { } }
      };

      const reports = [
        {
          _id: 'contact_chw5',
          type: 'data_record',
          form: 'FORM',
          from: 'phone5', // chw5 > clinic
          reported_date: new Date().getTime(),
        },
        {
          _id: 'contact_chw2',
          type: 'data_record',
          form: 'FORM',
          from: 'phone2', // chw2 > health_center
          reported_date: new Date().getTime(),
        },
        {
          _id: 'contact_chw3',
          type: 'data_record',
          form: 'FORM',
          from: 'phone3', // chw3 > district
          reported_date: new Date().getTime(),
        },
      ];

      const ids = reports.map(report => report._id);

      return utils
        .updateSettings(settings)
        .then(() => utils.saveDocs(reports))
        .then(() => sentinelUtils.waitForSentinel(ids))
        .then(() => utils.getDocs(ids))
        .then(([ contactChw5, contactChw2, contactChw3  ]) => {
          expectTasks(contactChw5, [
            { messages: [{ to: 'phone1', message: 'to clinic' }] },
            { messages: [{ to: 'phone2', message: 'to health_center' }] },
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);
          expectTasks(contactChw2, [
            { messages: [{ to: 'phone2', message: 'to clinic' }] }, // sender
            { messages: [{ to: 'phone2', message: 'to health_center' }] },
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);

          expectTasks(contactChw3, [
            { messages: [{ to: 'phone3', message: 'to clinic' }] }, // sender
            { messages: [{ to: 'phone3', message: 'to health_center' }] }, // sender
            { messages: [{ to: 'phone3', message: 'to district' }] },
          ]);
        });
    });
  });
});
