describe('ExportProperties service', function() {

  'use strict';

  var service,
      OutgoingMessagesConfiguration;

  beforeEach(function() {
    module('inboxApp');
    OutgoingMessagesConfiguration = sinon.stub();
    module(function($provide) {
      $provide.value('OutgoingMessagesConfiguration', OutgoingMessagesConfiguration);
    });
    inject(function($injector) {
      service = $injector.get('ExportProperties');
    });
  });

  it('retrieves properties', function(done) {

    var doc = {
      code: 'en',
      values: {
        'Hello': 'Gidday',
        'Goodbye': 'See ya',
        'New thing': 'New'
      }
    };

    OutgoingMessagesConfiguration.returns(config);
    var settings = { something: true };
    var expected = '[Application Text]\n' +
                   'Hello = Gidday\n' +
                   'Goodbye = See ya\n' +
                   'New\\ thing = New\n\n' +
                   '[Outgoing Messages]\n' +
                   'registrations[0].messages[0] = Thank you for registering {{patient_name}}. Their pregnancy ID is {{patient_id}}, and EDD is {{#date}}{{expected_date}}{{/date}}\n' +
                   'registrations[0].validations.list[0] = {{#patient_name}}The registration format is incorrect, ensure the message starts with P followed by space and the mother\'s name (maximum of 30 characters).{{/patient_name}}{{^patient_name}}The registration format is incorrect. ensure the message starts with P followed by space and the mother\'s name.{{/patient_name}}.\n' +
                   'registrations[0].validations.list[1] = The registration format for \'{{patient_name}}\' is incorrect, please ensure that LMP is a number between 0 and 42.';

    var actual = service(settings, doc);
    chai.expect(actual).to.equal(expected);
    chai.expect(OutgoingMessagesConfiguration.args[0][0]).to.deep.equal(settings);
    done();

  });

  var config = [
    {
      label: '{Registrations} › P › {Messages}',
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
      label: '{Registrations} › P › {Validations}',
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
    }
  ];

});