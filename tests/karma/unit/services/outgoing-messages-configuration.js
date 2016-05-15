describe('OutgoingMessagesConfiguration service', function() {

  'use strict';

  var service;

  beforeEach(function() {
    module('inboxApp');
    inject(function($injector) {
      service = $injector.get('OutgoingMessagesConfiguration');
    });
  });

  it('creates models', function(done) {

    var actual = service(exampleSettings);
    chai.expect(actual).to.deep.equal(expected);
    done();

  });

  var expected = [
    {
      label: 'Registrations › P › Messages',
      translations: [
        {
          path: 'registrations[0].messages[0]',
          translations: [
            {
              content: 'Thank you for registering {{patient_name}}. Their pregnancy ID is {{patient_id}}, and EDD is {{#date}}{{expected_date}}{{/date}}',
              locale: 'en'
            },
            {
              content: 'Asante kwa kusajili {{patient_name}}.ID namba yake ya Uja uzito ni {{patient_id}}, na EDD yake ni {{#date}}{{expected_date}}{{/date}}',
              locale: 'sw'
            }
          ]
        }
      ]
    },
    {
      label: 'Registrations › P › Validations',
      translations: [
        {
          path: 'registrations[0].validations.list[0]',
          translations: [
            {
              content: '{{#patient_name}}The registration format is incorrect, ensure the message starts with P followed by space and the mother\'s name (maximum of 30 characters).{{/patient_name}}{{^patient_name}}The registration format is incorrect. ensure the message starts with P followed by space and the mother\'s name.{{/patient_name}}.',
              locale: 'en'
            },
            {
              content: '{{#patient_name}} Ujumbe huu wa kusajili ANC si sahihi, tafadhali hakikisha umeanza na neno P ikifuatwa ikifuatiwa na nafasi na jina la mama (maximum of 30 characters).{{/patient_name}}{{^patient_name}} Ujumbe huu wa kusajili ANC si sahihi, tafadhali hakikisha umeanza na neno P ikifuatwa ikifuatiwa na nafasi na jina la mama{{/patient_name}}.',
              locale: 'sw'
            }
          ]
        },
        {
          path: 'registrations[0].validations.list[1]',
          translations: [
            {
              content: 'The registration format for \'{{patient_name}}\' is incorrect, please ensure that LMP is a number between 0 and 42.',
              locale: 'en'
            },
            {
              content: 'Ujumbe huu wa kusajili \'{{patient_name}}\' si sahihi, tafadhali hakikisha kuwa LMP ni number kati ya 0 na 42.',
              locale: 'sw'
            }
          ]
        }
      ]
    },
    {
      label: 'Schedules › ANC Reminders LMP › Messages',
      translations: [
        {
          path: 'schedules[0].messages[0]',
          translations: [
            {
              content: 'Please remind {{patient_name}} ({{patient_id}}) to visit health facility for ANC visit this week. When she does let us know with \'V {{patient_id}}\'. Thanks!',
              locale: 'en'
            }
          ]
        },
        {
          path: 'schedules[0].messages[1]',
          translations: [
            {
              content: 'Did {{patient_name}} attend her ANC visit? When she does, respond with \'V {{patient_id}}\'. Thank you!',
              locale: 'en'
            }
          ]
        }
      ]
    },
    {
      label: 'Patient Report › Visits › Messages',
      translations: [
        {
          path: 'patient_reports[0].messages[0]',
          translations: [
            {
              locale: 'en',
              content: 'Thank you {{contact.name}}, visit for {{patient_name}} ({{patient_id}}) has been recorded.'
            },
            {
              locale: 'es',
              content: 'sp'
            }
          ]
        },
        {
          path: 'patient_reports[0].messages[1]',
          translations: [
            {
              locale: 'en',
              content: 'No woman with ID number \'{{patient_id}}\' found. Verify the ID and resend the message.'
            },
            {
              locale: 'es',
              content: 'sp2'
            }
          ]
        }
      ]
    },
    {
      label: 'Patient Report › Visits › Validations',
      translations: [
        {
          path: 'patient_reports[0].validations.list[0]',
          translations: [
            {
              content: '{{#patient_id}}The ID number submitted is incorrect, it should be 5 numbers, please submit a valid ID.{{/patient_id}}{{^patient_id}}The message format is incorrect. Please ensure send a message start with V followed by space then the woman\'s ID.{{/patient_id}}',
              locale: 'en'
            }
          ]
        }
      ]
    },
    {
      label: 'Notifications › Messages',
      translations: [
        {
          path: 'notifications.messages[0]',
          translations: [
            {
              content: 'Thank you {{contact.name}}, no further notifications regarding {{patient_name}} will be sent until you submit \'START {{patient_id}}\'.',
              locale: 'en'
            }
          ]
        },
        {
          path: 'notifications.messages[1]',
          translations: [
            {
              content: 'Thank you {{contact.name}}, record for {{patient_name}} ({{patient_id}}) has been reactivated. Notifications regarding this patient will resume.',
              locale: 'en'
            }
          ]
        },
        {
          path: 'notifications.messages[2]',
          translations: [
            {
              content: 'No patient with ID number \'{{patient_number}}\' found.',
              locale: 'en'
            }
          ]
        }
      ]
    },
    {
      label: 'Notifications › Validations',
      translations: [
        {
          path: 'notifications.validations.list[0]',
          translations: [
            {
              content: '{{#patient_id}}The ID number submitted is incorrect, it should be 5 numbers, please submit a valid ID.{{/patient_id}}{{^patient_id}}The message format is incorrect. Please ensure send a message start with START/STOP followed by space then the woman\'s ID.{{/patient_id}}',
              locale: 'en'
            }
          ]
        }
      ]
    }
  ];

  var exampleSettings = {
    patient_reports: [
      {
        form: 'V',
        name: 'Visits',
        format: 'V <patientid>',
        silence_type: 'ANC Reminders, ANC Reminders LMP',
        silence_for: '25 days',
        fields: [
          {
            field_name: '',
            title: ''
          }
        ],
        validations: {
          join_responses: false,
          list: [
            {
              property: 'patient_id',
              rule: 'regex(\'^[0-9]{5}$\')',
              message: [
                {
                  content: '{{#patient_id}}The ID number submitted is incorrect, it should be 5 numbers, please submit a valid ID.{{/patient_id}}{{^patient_id}}The message format is incorrect. Please ensure send a message start with V followed by space then the woman\'s ID.{{/patient_id}}',
                  locale: 'en'
                }
              ]
            }
          ]
        },
        messages: [
          {
            message: [
              {
                locale: 'en',
                content: 'Thank you {{contact.name}}, visit for {{patient_name}} ({{patient_id}}) has been recorded.'
              },
              {
                locale: 'es',
                content: 'sp'
              }
            ],
            event_type: 'report_accepted',
            recipient: 'reporting_unit'
          },
          {
            message: [
              {
                locale: 'en',
                content: 'No woman with ID number \'{{patient_id}}\' found. Verify the ID and resend the message.'
              },
              {
                locale: 'es',
                content: 'sp2'
              }
            ],
            event_type: 'registration_not_found',
            recipient: 'reporting_unit'
          }
        ]
      }
    ],
    registrations: [
      {
        form: 'P',
        fields: [
          {
            field_name: '',
            title: ''
          }
        ],
        help: '',
        events: [
          {
            name: 'on_create',
            trigger: 'add_patient_id',
            params: '',
            bool_expr: ''
          },
          {
            name: 'on_create',
            trigger: 'add_expected_date',
            params: 'lmp_date',
            bool_expr: 'doc.last_menstrual_period'
          },
          {
            name: 'on_create',
            trigger: 'assign_schedule',
            params: 'ANC Reminders LMP',
            bool_expr: 'doc.last_menstrual_period'
          }
        ],
        validations: {
          join_responses: false,
          list: [
            {
              property: 'patient_name',
              rule: 'lenMin(1) && lenMax(30)',
              message: [
                {
                  content: '{{#patient_name}}The registration format is incorrect, ensure the message starts with P followed by space and the mother\'s name (maximum of 30 characters).{{/patient_name}}{{^patient_name}}The registration format is incorrect. ensure the message starts with P followed by space and the mother\'s name.{{/patient_name}}.',
                  locale: 'en'
                },
                {
                  content: '{{#patient_name}} Ujumbe huu wa kusajili ANC si sahihi, tafadhali hakikisha umeanza na neno P ikifuatwa ikifuatiwa na nafasi na jina la mama (maximum of 30 characters).{{/patient_name}}{{^patient_name}} Ujumbe huu wa kusajili ANC si sahihi, tafadhali hakikisha umeanza na neno P ikifuatwa ikifuatiwa na nafasi na jina la mama{{/patient_name}}.',
                  locale: 'sw'
                }
              ]
            },
            {
              property: 'last_menstrual_period',
              rule: '(integer && min(0) && max(42))',
              message: [
                {
                  content: 'The registration format for \'{{patient_name}}\' is incorrect, please ensure that LMP is a number between 0 and 42.',
                  locale: 'en'
                },
                {
                  content: 'Ujumbe huu wa kusajili \'{{patient_name}}\' si sahihi, tafadhali hakikisha kuwa LMP ni number kati ya 0 na 42.',
                  locale: 'sw'
                }
              ]
            }
          ]
        },
        messages: [
          {
            message: [
              {
                content: 'Thank you for registering {{patient_name}}. Their pregnancy ID is {{patient_id}}, and EDD is {{#date}}{{expected_date}}{{/date}}',
                locale: 'en'
              },
              {
                content: 'Asante kwa kusajili {{patient_name}}.ID namba yake ya Uja uzito ni {{patient_id}}, na EDD yake ni {{#date}}{{expected_date}}{{/date}}',
                locale: 'sw'
              }
            ],
            recipient: 'reporting_unit'
          }
        ]
      }
    ],
    schedules: [
      {
        name: 'ANC Reminders LMP',
        summary: '',
        description: '',
        start_from: 'reported_date',
        messages: [
          {
            message: [
              {
                content: 'Please remind {{patient_name}} ({{patient_id}}) to visit health facility for ANC visit this week. When she does let us know with \'V {{patient_id}}\'. Thanks!',
                locale: 'en'
              }
            ],
            group: 1,
            offset: '12 weeks',
            send_day: 'monday',
            send_time: '10:30',
            recipient: 'reporting_unit'
          },
          {
            message: [
              {
                content: 'Did {{patient_name}} attend her ANC visit? When she does, respond with \'V {{patient_id}}\'. Thank you!',
                locale: 'en'
              }
            ],
            group: 1,
            offset: '13 weeks',
            send_day: 'monday',
            send_time: '11:00',
            recipient: 'reporting_unit'
          }
        ]
      }
    ],
    notifications: {
      off_form: 'STOP',
      on_form: 'START',
      confirm_deactivation: false,
      validations: {
        join_responses: false,
        list: [
          {
            property: 'patient_id',
            rule: 'regex(\'^[0-9]{5}$\')',
            message: [
              {
                content: '{{#patient_id}}The ID number submitted is incorrect, it should be 5 numbers, please submit a valid ID.{{/patient_id}}{{^patient_id}}The message format is incorrect. Please ensure send a message start with START/STOP followed by space then the woman\'s ID.{{/patient_id}}',
                locale: 'en'
              }
            ]
          }
        ]
      },
      messages: [
        {
          message: [
            {
              content: 'Thank you {{contact.name}}, no further notifications regarding {{patient_name}} will be sent until you submit \'START {{patient_id}}\'.',
              locale: 'en'
            }
          ],
          event_type: 'on_mute',
          recipient: 'reporting_unit'
        },
        {
          message: [
            {
              content: 'Thank you {{contact.name}}, record for {{patient_name}} ({{patient_id}}) has been reactivated. Notifications regarding this patient will resume.',
              locale: 'en'
            }
          ],
          event_type: 'on_unmute',
          recipient: 'reporting_unit'
        },
        {
          message: [
            {
              content: 'No patient with ID number \'{{patient_number}}\' found.',
              locale: 'en'
            }
          ],
          event_type: 'patient_not_found',
          recipient: 'reporting_unit'
        }
      ]
    }
  };
});
