exports.forms = {
  NP: {
    transitions: { registration: true },
    registrations: [{
      form: 'FORM-A',
      events: [{
        name: 'on_create',
        trigger: 'add_patient',
        params: '',
        bool_expr: ''
      }],
      messages: [{
        recipient: 'reporting_unit',
        event_type: 'report_accepted',
        message: [{
          locale: 'en',
          content: 'Patient {{patient_name}} ({{patient_id}}) added to {{clinic.name}}'
        }],
      }],
    }],
    forms: {
      'FORM-A': {
        fields: {
          phone_number: {
            labels: {
              tiny: {
                en: 'phone number'
              },
              description: {
                en: 'phone number'
              },
              short: {
                en: 'phone number'
              }
            },
            position: 0,
            flags: {
              allow_duplicate: false
            },
            type: 'phone_number',
            required: true
          },
          patient_name: {
            labels: {
              tiny: {
                en: 'patient_name'
              },
              description: {
                en: 'Patient name'
              },
              short: {
                'en': 'Patient name'
              }
            },
            position: 1,
            type: 'string',
            length: [
              3,
              30
            ],
            required: true
          }
        },
        public_form: false,
        use_sentinel: true
      }
    }
  }
};

