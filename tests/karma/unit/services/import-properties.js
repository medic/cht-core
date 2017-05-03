describe('ImportProperties service', function() {

  'use strict';

  var service,
      Settings,
      put,
      UpdateSettings,
      rootScope;

  beforeEach(function() {
    Settings = sinon.stub();
    UpdateSettings = sinon.stub();
    put = sinon.stub();
    module('inboxApp');
    module(function($provide) {
      $provide.value('translateFilter', function(key) {
        return '{' + key + '}';
      });
      $provide.value('Settings', Settings);
      $provide.value('UpdateSettings', UpdateSettings);
      $provide.factory('DB', KarmaUtils.mockDB({ put: put }));
    });
    inject(function($injector, $rootScope) {
      rootScope = $rootScope;
      service = $injector.get('ImportProperties');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Settings, UpdateSettings, put);
  });

  it('updates settings', function() {
    var content = '[Application Text]\n' +
                  'Hello = Bonjour\n' +
                  'Goodbye = Au revoir';
    var doc = {
      code: 'fr',
      values: {
        'Hello': 'hello',
        'Goodbye': 'bye'
      }
    };
    Settings.returns(KarmaUtils.mockPromise(null, {}));
    put.returns(KarmaUtils.mockPromise(null, {}));
    setTimeout(function() {
      rootScope.$digest();
      setTimeout(function() {
        rootScope.$digest();
      });
    });
    return service(content, doc)
      .then(function() {
        chai.expect(put.args[0][0]).to.deep.equal({
          code: 'fr',
          values: {
            'Hello': 'Bonjour',
            'Goodbye': 'Au revoir'
          }
        });
        chai.expect(UpdateSettings.callCount).to.equal(0);
      });

  });

  it('updates locale docs', function() {
    var content = '[Application Text]\n' +
                  'Hello = Bonjour\n' +
                  'Goodbye = Au revoir';
    var doc = {
      code: 'fr',
      values: {
        'Hello': 'hello'
      }
    };
    Settings.returns(KarmaUtils.mockPromise(null, {}));
    put.returns(KarmaUtils.mockPromise(null, {}));
    setTimeout(function() {
      rootScope.$digest();
      setTimeout(function() {
        rootScope.$digest();
        setTimeout(function() {
          rootScope.$digest();
        });
      });
    });
    return service(content, doc).then(function() {
      chai.expect(put.args[0][0]).to.deep.equal({
        code: 'fr',
        values: {
          'Hello': 'Bonjour',
          'Goodbye': 'Au revoir'
        }
      });
      chai.expect(UpdateSettings.callCount).to.equal(0);
    });

  });

  it('imports outgoing messages translations', function() {
    var doc = { code: 'en', values: {} };
    var content = '[Outgoing Messages]\n' +
                  'registrations[0].messages[0] = MESSAGE 1\n' +
                  'registrations[0].validations.list[0] = VALIDATION 1\n' +
                  'registrations[0].validations.list[1] = VALIDATION 2';
    Settings.returns(KarmaUtils.mockPromise(null, settings()));
    UpdateSettings.returns(KarmaUtils.mockPromise());
    put.returns(KarmaUtils.mockPromise(null, {}));
    setTimeout(function() {
      rootScope.$digest();
      setTimeout(function() {
        rootScope.$digest();
      });
    });
    return service(content, doc).then(function() {
      chai.expect(put.callCount).to.equal(0);
      chai.expect(UpdateSettings.args[0][0]).to.deep.equal(expected());
    });
  });

  it('ignores empty message translations', function() {
    const doc = { code: 'en', values: {} };
    const content = '[Outgoing Messages]\n' +
                  'registrations[0].messages[0] = MESSAGE 1\n' +
                  'registrations[0].validations.list[0] = VALIDATION 1\n' +
                  'registrations[0].validations.list[1] = VALIDATION 2\n' +
                  'registrations[0].validations.list[2] =  ';
    Settings.returns(KarmaUtils.mockPromise(null, settings(s => {
      s.registrations[0].validations.list[2] = {
        translation_key: 'test.translation.key',
      };
    })));
    UpdateSettings.returns(KarmaUtils.mockPromise());
    put.returns(KarmaUtils.mockPromise(null, {}));
    setTimeout(() => {
      rootScope.$digest();
      setTimeout(() => {
        rootScope.$digest();
      });
    });
    return service(content, doc).then(() => {
      chai.expect(put.callCount).to.equal(0);
      chai.expect(UpdateSettings.args[0][0]).to.deep.equal(expected(e => {
        e.registrations[0].validations.list[2] = {
          translation_key: 'test.translation.key'
        };
      }));
    });
  });

  const cloneAndAlter = (json, alter = () => {}) => {
    const cloned = JSON.parse(JSON.stringify(json));
    alter(cloned);
    return cloned;
  };

  const settings = (alter) => cloneAndAlter(defaultSettings, alter);
  const expected = (alter) => cloneAndAlter(defaultExpected, alter);

  const defaultSettings = {
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
  ]};

  const defaultExpected = {
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
                  content: 'VALIDATION 1',
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
                  content: 'Ujumbe huu wa kusajili \'{{patient_name}}\' si sahihi, tafadhali hakikisha kuwa LMP ni number kati ya 0 na 42.',
                  locale: 'sw'
                },
                {
                  content: 'VALIDATION 2',
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
                content: 'MESSAGE 1',
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
    ]};
});

