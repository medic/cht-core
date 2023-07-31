exports.forms = {
  NP: {
    transitions: { registration: true },
    registrations: [{
      form: 'FORM-A',
      events: [{
        name: 'on_create',
        trigger: 'add_phone_number',
        params: 'phone_number',
        bool_expr: 'doc.fields.phone_number'
      }, {
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
    forms: { 'FORM-A': {} }
  }
};

