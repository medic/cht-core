var messages = require('../../src/lib/messages'),
    utils = require('../../src/lib/utils'),
    config = require('../../src/config'),
    sinon = require('sinon'),
    assert = require('chai').assert;

describe('messages', () => {
  afterEach(() => sinon.restore());

  it('addMessage supports template variables on doc', () => {
      var doc = {
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
      var doc = {
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
      var doc = {
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
      var doc = {
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
      var doc = {
          form: 'x',
          contact: {
              parent: {
                  parent: {
                      type: 'health_center',
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
      var doc = {
          form: 'x',
          contact: {
              parent: {
                  parent: {
                      parent: {
                          type: 'district_hospital',
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
      var doc = {
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

  it('getMessage returns empty string on empty config', () => {
      var config = { messages: [{
          content: '',
          locale: 'en'
      }]};
      assert.equal('', messages.getMessage(config, 'en'));
      assert.equal('', messages.getMessage(config));
  });

  it('getMessage returns empty string on bad config', () => {
      var config = { messages: [{
          itchy: '',
          scratchy: 'en'
      }]};
      assert.equal('', messages.getMessage(config, 'en'));
      assert.equal('', messages.getMessage(config));

  });

  it('getMessage returns first message when locale match fails', () => {
      var config = { messages: [
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
      var config = { messages: [
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
      var config = { translation_key: 'some.key' };
      var expected = 'Gracias';
      var translate = sinon.stub(utils, 'translate').returns(expected);
      assert.equal(expected, messages.getMessage(config, 'es'));
      assert.equal(translate.callCount, 1);
      assert.equal(translate.args[0][0], 'some.key');
      assert.equal(translate.args[0][1], 'es');
  });

  it('getMessage uses translation_key instead of messages', () => {
      var config = {
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
      var expected = 'Gracias';
      var translate = sinon.stub(utils, 'translate').returns(expected);
      assert.equal(expected, messages.getMessage(config, 'es'));
      assert.equal(translate.callCount, 1);
      assert.equal(translate.args[0][0], 'some.key');
      assert.equal(translate.args[0][1], 'es');
  });


  it('describe isOutgoingAllowed', () => {
      /*
       * Support comma separated string config to match an outgoing phone number
       * or MNO (mobile network operator) defined string.
       */
      var tests = [
        // denied
        ['+123', '+123', false],
        ['+123', '+123999999', false],
        ['SAFARI', 'SAFARICOM', false],
        ['Safari', 'SAFARICOM', false],
        ['+123,+456,+789', '+456', false],
        ['+123,+456,+789', '+4569999999', false],
        ['SAFARI, ORANGE', 'ORANGE NET', false],
        ['0', '0000123', false],
        ['0', '0', false],
        // allowed
        ['+123', '+999', true],
        ['SAFARI, ORANGE NET', 'ORANGE', true],
        ['VIVO', 'EM VIVO', true],
        ['0', '-1', true],
        // allow falsey inputs
        ['snarf', undefined, true],
        ['snarf', null, true],
        ['', '+123', true],
        ['', '', true]
      ];
      tests.forEach(function(t) {
        var s = sinon.stub(config, 'get');
        s.withArgs('outgoing_deny_list').returns(t[0]);
        assert.equal(messages.isOutgoingAllowed(t[1]), t[2]);
        s.restore();
      });
  });

  it('describe isMessageFromGateway', () => {
      var tests = [
        ['+774455558888', '77-44-5555-8888', true],
        ['+774455558889', '77-44-5555-8888', false],
        // missing country code matches
        ['+41446681800', '446681800', true]
      ];
      tests.forEach(function(t) {
        var s = sinon.stub(config, 'get');
        s.withArgs('gateway_number').returns(t[0]);
        assert.equal(messages.isMessageFromGateway(t[1]), t[2]);
        s.restore();
      });
  });
});
