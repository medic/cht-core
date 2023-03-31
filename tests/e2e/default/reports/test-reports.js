const TEST_REPORTS = {
  transitions: {
    accept_patient_reports: true,
    conditional_alerts: true,
    default_responses: true,
    update_sent_by: true,
    registration: true,
    update_clinics: true,
    update_notifications: true,
    update_scheduled_reports: true,
  },
  forms: {
    R: {
      meta: {
        code: 'RR',
        label: {
          en: 'REF_REF'
        }
      },
      fields: {
        patient_id: {
          labels: {
            tiny: {
              en: 'R'
            },
            description: {
              en: 'Patient ID'
            },
            short: {
              en: 'ID'
            }
          },
          position: 0,
          type: 'string',
          length: [1, 30],
          required: true
        },
      },
      public_form: true,
      use_sentinel: true
    },
    N: {
      meta: {
        code: 'NN',
        label: {
          en: 'NAM_NAM'
        }
      },
      fields: {
        patient_name: {
          labels: {
            tiny: {
              en: 'N'
            },
            description: {
              en: 'Patient name'
            },
            short: {
              en: 'Name'
            }
          },
          position: 0,
          type: 'string',
          length: [1, 30],
          required: true
        },
      },
      public_form: true,
      use_sentinel: true
    },
    P: {
      meta: {
        code: 'P',
        label: {
          en: 'PID_PID'
        }
      },
      fields: {
        place_id: {
          labels: {
            tiny: {
              en: 'P'
            },
            description: {
              en: 'Place ID'
            },
            short: {
              en: 'Place'
            }
          },
          position: 0,
          type: 'string',
          length: [1, 30],
          required: true
        },
      },
      public_form: true,
      use_sentinel: true
    },
    S: {
      meta: {
        code: 'S',
        label: {
          en: 'SURVEY'
        }
      },
      fields: {
        survey_subject: {
          labels: {
            tiny: {
              en: 'S'
            },
            description: {
              en: 'Survey subject'
            },
            short: {
              en: 'Subject'
            }
          },
          position: 0,
          type: 'string',
          length: [1, 30],
          required: true
        },
      },
      public_form: true,
      use_sentinel: true
    }
  },
  registrations: []
};

module.exports = {
  TEST_REPORTS,
};
