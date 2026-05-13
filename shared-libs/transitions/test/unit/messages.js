const messages = require('../../src/lib/messages');
const utils = require('../../src/lib/utils');
const config = require('../../src/config');
const sinon = require('sinon');
const assert = require('chai').assert;
const { CONTACT_TYPES } = require('@medic/constants');
const logger = require('@medic/logger');
const messageUtils = require('@medic/message-utils');

describe('messages', () => {
  beforeEach(() => config.init({
    getAll: sinon.stub().returns({}),
    get: sinon.stub(),
  }));

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('addMessage supports template variables on doc', () => {
    const doc = {
      form: 'x',
      reported_date: '2050-03-13T13:06:22.002Z',
      governor: 'Schwarzenegger'
    };
    messages.addMessage(doc, { message: 'Governor {{governor}} wants to speak to you.' }, '+13125551212');
    assert.equal(doc.tasks.length, 1);
    assert.equal(
      doc.tasks[0].messages[0].message,
      'Governor Schwarzenegger wants to speak to you.'
    );
  });

  it('addMessage does not escape characters - #3795', () => {
    const doc = {
      form: 'x',
      reported_date: '2050-03-13T13:06:22.002Z',
      place: 'Sharon\'s Place &<>"/`='
    };
    messages.addMessage(doc, { message: 'You\'re from {{place}}' }, '+13125551212');
    assert.equal(doc.tasks.length, 1);
    assert.equal(
      doc.tasks[0].messages[0].message,
      'You\'re from Sharon\'s Place &<>"/`='
    );
  });

  it('addMessage template supports contact obj', () => {
    const doc = {
      form: 'x',
      contact: {
        name: 'Paul',
        parent: {
          contact: {
            name: 'Paul'
          }
        }
      }
    };
    messages.addMessage(doc, { message: 'Thank you {{contact.name}}.' }, '+13125551212');
    assert.equal(doc.tasks.length, 1);
    assert.equal(
      doc.tasks[0].messages[0].message,
      'Thank you Paul.'
    );
  });

  it('addMessage supports clinic dot template variables', () => {
    const doc = {
      form: 'x',
      contact: {
        name: 'Sally',
        parent: {
          contact: {
            name: 'Sally'
          }
        }
      }
    };
    messages.addMessage(doc, { message: 'Thank you {{contact.name}}.' }, '+13125551212');
    assert.equal(doc.tasks.length, 1);
    assert.equal(
      doc.tasks[0].messages[0].message,
      'Thank you Sally.'
    );
  });

  it('addMessage template supports health_center object', () => {
    const doc = {
      form: 'x',
      contact: {
        parent: {
          parent: {
            type: CONTACT_TYPES.HEALTH_CENTER,
            contact: {
              name: 'Jeremy'
            }
          }
        }
      }
    };
    messages.addMessage(doc, { message: 'Thank you {{health_center.contact.name}}.' }, '+13125551212');
    assert.equal(doc.tasks.length, 1);
    assert.equal(
      doc.tasks[0].messages[0].message,
      'Thank you Jeremy.'
    );
  });

  it('addMessage template supports district object', () => {
    const doc = {
      form: 'x',
      contact: {
        parent: {
          parent: {
            parent: {
              type: CONTACT_TYPES.DISTRICT_HOSPITAL,
              contact: {
                name: 'Kristen'
              }
            }
          }
        }
      }
    };
    messages.addMessage(doc, { message: 'Thank you {{district.contact.name}}.' }, '+13125551212');
    assert.equal(doc.tasks.length, 1);
    assert.equal(
      doc.tasks[0].messages[0].message,
      'Thank you Kristen.'
    );
  });

  it('addMessage template supports fields', () => {
    const doc = {
      form: 'x',
      fields: {
        patient_name: 'Sally'
      }
    };
    messages.addMessage(doc, { message: 'Thank you {{patient_name}}.' }, '+13125551212');
    assert.equal(doc.tasks.length, 1);
    assert.equal(
      doc.tasks[0].messages[0].message,
      'Thank you Sally.'
    );
  });

  it('addMessage aliases patient.name to patient_name', () => {
    const doc = {};
    messages.addMessage(
      doc,
      { message: 'Thank you {{patient_name}}.' },
      '123',
      { patient: {name: 'Sally'} }
    );
    assert.equal(doc.tasks.length, 1);
    assert.equal(
      doc.tasks[0].messages[0].message,
      'Thank you Sally.'
    );
  });

  it('addMessage detects duplicate messages', () => {
    config.get.returns({ duplicate_limit: 1 });
    const doc = {to: '+1234567'};
    messages.addMessage(doc, { message: 'Thank you.' }, '123', {});
    assert.equal(doc.tasks.length, 1);
    assert.equal(doc.tasks[0].state, 'pending');
    messages.addMessage(doc, { message: 'Thank you.' }, '123', {});
    assert.equal(doc.tasks.length, 2);
    assert.equal(doc.tasks[1].state, 'duplicate');
    messages.addMessage(doc, { message: 'Thank you again.' }, '123', {});
    assert.equal(doc.tasks.length, 3);
    assert.equal(doc.tasks[2].state, 'pending');
  });

  it('addMessage duplicates messages when not requested to ensure uniqueness', () => {
    const doc = { to: '+1234567' };
    messages.addMessage(doc, { message: 'Thank you.' }, '123', {});
    assert.equal(doc.tasks.length, 1);
    assert.deepInclude(doc.tasks[0].messages[0], { to: '123', message: 'Thank you.' });

    messages.addMessage(doc, { message: 'Thank you.' }, '123', {});
    assert.equal(doc.tasks.length, 2);
    assert.deepInclude(doc.tasks[0].messages[0], { to: '123', message: 'Thank you.' });
    assert.deepInclude(doc.tasks[1].messages[0], { to: '123', message: 'Thank you.' });
  });

  it('addMessage with unique=true handles empty messages array from generate', () => {
    config.getAll.returns({ outgoing_deny_list: '+denied' });
    const doc = {
      form: 'x',
      from: '+denied',
      tasks: [ { messages: [{ to: '+123', message: 'existing' }] } ]
    };
    sinon.stub(messageUtils, 'generate').returns([undefined]);
    messages.addMessage(doc, { message: 'test' }, '+123', {}, true);

    assert.equal(doc.tasks.length, 2);
    assert.deepEqual(doc.tasks[0], { messages: [{ to: '+123', message: 'existing' }] });
    assert.deepOwnInclude(doc.tasks[1], { messages: [undefined], state: 'denied', state_details: undefined });
  });

  it('addMessage does not duplicate messages when requested to ensure uniqueness', () => {
    const validPhone = '+40755895896';
    const sender = '+1234567';
    const doc = { from: sender };
    messages.addMessage(doc, { message: 'Thank you.' }, validPhone, {}, true);
    assert.equal(doc.tasks.length, 1);
    assert.deepInclude(doc.tasks[0].messages[0], { to: validPhone, message: 'Thank you.' });

    messages.addMessage(doc, { message: 'Thank you.' }, validPhone, {}, true);
    assert.equal(doc.tasks.length, 1);
    assert.deepInclude(doc.tasks[0].messages[0], { to: validPhone, message: 'Thank you.' });

    messages.addMessage(doc, { message: 'Thank you.' }, undefined, {}, true);
    assert.equal(doc.tasks.length, 2);
    assert.deepInclude(doc.tasks[0].messages[0], { to: validPhone, message: 'Thank you.' });
    assert.deepInclude(doc.tasks[1].messages[0], { to: sender, message: 'Thank you.' });

    messages.addMessage(doc, { message: 'Thank you.' }, undefined, {}, true);
    assert.equal(doc.tasks.length, 2);
    assert.deepInclude(doc.tasks[0].messages[0], { to: validPhone, message: 'Thank you.' });
    assert.deepInclude(doc.tasks[1].messages[0], { to: sender, message: 'Thank you.' });
  });

  it('getMessage returns empty string on empty config', () => {
    const config = { messages: [{
      content: '',
      locale: 'en'
    }]};
    assert.equal('', messages.getMessage(config, 'en'));
    assert.equal('', messages.getMessage(config));
  });

  it('getMessage returns empty string on bad config', () => {
    const config = { messages: [{
      itchy: '',
      scratchy: 'en'
    }]};
    assert.equal('', messages.getMessage(config, 'en'));
    assert.equal('', messages.getMessage(config));

  });

  it('getMessage returns first message when locale match fails', () => {
    const config = { messages: [
      {
        content: 'Merci',
        locale: 'fr'
      },
      {
        content: 'Gracias',
        locale: 'es'
      }
    ]};
    assert.equal('Merci', messages.getMessage(config, 'en'));
    assert.equal('Merci', messages.getMessage(config));
  });

  it('getMessage returns empty string if passed empty array', () => {
    assert.equal('', messages.getMessage([], 'en'));
    assert.equal('', messages.getMessage([]));

  });

  it('getMessage returns locale when matched', () => {
    const config = { messages: [
      {
        content: 'Merci',
        locale: 'fr'
      },
      {
        content: 'Gracias',
        locale: 'es'
      }
    ]};
    assert.equal('Gracias', messages.getMessage(config, 'es'));
    assert.equal('Merci', messages.getMessage(config, 'fr'));
  });

  it('getMessage uses translation_key', () => {
    const config = { translation_key: 'some.key' };
    const expected = 'Gracias';
    const translate = sinon.stub(utils, 'translate').returns(expected);
    assert.equal(expected, messages.getMessage(config, 'es'));
    assert.equal(translate.callCount, 1);
    assert.equal(translate.args[0][0], 'some.key');
    assert.equal(translate.args[0][1], 'es');
  });

  it('getMessage uses translation_key instead of messages', () => {
    const config = {
      translation_key: 'some.key',
      messages: [
        {
          content: 'Merci',
          locale: 'fr'
        },
        {
          content: 'Gracias',
          locale: 'es'
        }
      ]
    };
    const expected = 'Gracias';
    const translate = sinon.stub(utils, 'translate').returns(expected);
    assert.equal(expected, messages.getMessage(config, 'es'));
    assert.equal(translate.callCount, 1);
    assert.equal(translate.args[0][0], 'some.key');
    assert.equal(translate.args[0][1], 'es');
  });



  describe('isOutgoingAllowed', () => {
    const isOutgoingAllowedTests = (tests, configKey) => {
      tests.forEach(test => {
        const [ configValue, phoneNumber, expectedResult ] = test;
        const mockConfig = {};
        mockConfig[configKey] = configValue;

        config.getAll.returns(mockConfig);
        assert.equal(messages.isOutgoingAllowed(phoneNumber), expectedResult);
      });
    };

    it('returns false when message is from gateway number', () => {
      config.get.withArgs('gateway_number').returns('+254700000000');
      config.getAll.returns({});
      assert.equal(messages.isOutgoingAllowed('+254700000000'), false);
    });

    it('outgoing_deny_list', () => {
      /*
        * Support comma separated string config to match an outgoing phone number
        * or MNO (mobile network operator) defined string.
        */
      const tests = [
        // denied
        ['+123', '+123', false],
        ['+123', '+123999999', false],
        ['SAFARI', 'SAFARICOM', false],
        [' SAFARI', 'SAFARICOM', false],
        ['SAFARI', ' SAFARICOM', false],
        ['Safari', 'SAFARICOM', false],
        ['+123,+456,+789', '+456', false],
        ['+123,+456,+789', '+4569999999', false],
        ['SAFARI, ORANGE', 'ORANGE NET', false],
        ['0', '0000123', false],
        ['0', '0', false],
        ['1, , 2', '234', false],
        // allowed
        ['+123', '+999', true],
        ['SAFARI, ORANGE NET', 'ORANGE', true],
        ['VIVO', 'EM VIVO', true],
        ['0', '-1', true],
        // allow falsey inputs
        ['snarf', undefined, true],
        ['snarf', null, true],
        ['', '+123', true],
        ['', '', true],
        [',', '', true],
        [undefined, '', true],
        [null, '', true],
      ];

      isOutgoingAllowedTests(tests, 'outgoing_deny_list');
    });

    it('outgoing_deny_with_alphas', () => {
      const tests = [
        // denied
        [true, 'ORANGE', false],
        [true, 'orange', false],
        [true, '+23x', false],
        // allowed
        [true, '+123', true],
        [true, '', true],
        [false, 'ORANGE', true],
        ['', 'ORANGE', true],
        [undefined, 'ORANGE', true],
        [null, 'ORANGE', true],
      ];

      isOutgoingAllowedTests(tests, 'outgoing_deny_with_alphas');
    });

    it('outgoing_deny_shorter_than', () => {
      const tests = [
        // denied
        [5, '+123', false],
        ['5', '+123', false],
        ['5', 'ABCD', false],
        ['5', ' ABCD ', false],
        ['5.9', 'ABCD', false],

        // allowed
        [0, '+123', true],
        ['5', '12345', true],
        ['5.9', 'ABCDE', true],
        ['true', '+123', true],
        ['', '+123', true],
        [' ', '+123', true],
        [undefined, '+123', true],
        [null, '+123', true],
      ];

      isOutgoingAllowedTests(tests, 'outgoing_deny_shorter_than');
    });
  });

  describe('addError', () => {
    it('handles error object without message property', () => {
      sinon.stub(logger, 'warn');
      sinon.stub(messageUtils, 'template').returns('processed error');
      sinon.stub(utils, 'addError');
      const doc = { errors: [] };

      messages.addError(doc, { code: 'some_code' });

      assert.equal(logger.warn.callCount, 1);
      assert.equal(logger.warn.args[0][0], 'Message property missing on error object.');
      assert.equal(utils.addError.callCount, 1);
    });

    it('handles error that is not an object or string', () => {
      sinon.stub(logger, 'warn');
      sinon.stub(messageUtils, 'template').returns('processed error');
      sinon.stub(utils, 'addError');
      const doc = { errors: [] };

      messages.addError(doc, 42);

      assert.equal(logger.warn.callCount, 1);
      assert.equal(logger.warn.args[0][0], 'Error should be an object or string.');
      assert.equal(utils.addError.callCount, 1);
    });

    it('catches errors thrown during template processing', () => {
      sinon.stub(messageUtils, 'template').throws(new Error('template parse failure'));
      sinon.stub(utils, 'addError');
      const doc = { errors: [] };

      messages.addError(doc, 'some error message');

      assert.equal(utils.addError.callCount, 1);
      const errorArg = utils.addError.args[0][1];
      assert.include(errorArg.message, 'template parse failure');
      assert.equal(errorArg.code, 'parse_error');
    });
  });

  it('describe isMessageFromGateway', () => {
    const tests = [
      ['+640275552636', '64-27-555-2636', true],
      ['+640275552637', '64-27-555-2636', false],
      // missing country code matches
      ['+41446681800', '446681800', true]
    ];
    tests.forEach(([configured, requested, result]) => {
      config.get.withArgs('gateway_number').returns(configured);
      assert.equal(messages.isMessageFromGateway(requested), result, `failed for ${requested}`);
    });
  });
});
