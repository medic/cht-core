var messages = require('../../lib/messages'),
    utils = require('../../lib/utils'),
    config = require('../../config'),
    sinon = require('sinon').sandbox.create();

exports.tearDown = function(callback) {
    sinon.restore();
    callback();
};

exports['addMessage supports template variables on doc'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z',
        governor: 'Schwarzenegger'
    };
    messages.addMessage(doc, { message: 'Governor {{governor}} wants to speak to you.' }, '+13125551212');
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        'Governor Schwarzenegger wants to speak to you.'
    );
    test.done();
};

exports['addMessage does not escape characters - #3795'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z',
        place: 'Sharon\'s Place &<>"/`='
    };
    messages.addMessage(doc, { message: 'You\'re from {{place}}' }, '+13125551212');
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        'You\'re from Sharon\'s Place &<>"/`='
    );
    test.done();
};

exports['addMessage template supports contact obj'] = function(test) {
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
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        'Thank you Paul.'
    );
    test.done();
};

exports['addMessage supports clinic dot template variables'] = function(test) {
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
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        'Thank you Sally.'
    );
    test.done();
};

exports['addMessage template supports health_center object'] = function(test) {
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
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        'Thank you Jeremy.'
    );
    test.done();
};

exports['addMessage template supports district object'] = function(test) {
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
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        'Thank you Kristen.'
    );
    test.done();
};

exports['addMessage template supports fields'] = function(test) {
    var doc = {
        form: 'x',
        fields: {
            patient_name: 'Sally'
        }
    };
    messages.addMessage(doc, { message: 'Thank you {{patient_name}}.' }, '+13125551212');
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        'Thank you Sally.'
    );
    test.done();
};

exports['addMessage aliases patient.name to patient_name'] = test => {
    const doc = {};
    messages.addMessage(
        doc,
        { message: 'Thank you {{patient_name}}.' },
        '123',
        { patient: {name: 'Sally'} }
    );
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        'Thank you Sally.'
    );
    test.done();
};

exports['getMessage returns empty string on empty config'] = function(test) {
    var config = { messages: [{
        content: '',
        locale: 'en'
    }]};
    test.equals('', messages.getMessage(config, 'en'));
    test.equals('', messages.getMessage(config));
    test.done();
};

exports['getMessage returns empty string on bad config'] = function(test) {
    var config = { messages: [{
        itchy: '',
        scratchy: 'en'
    }]};
    test.equals('', messages.getMessage(config, 'en'));
    test.equals('', messages.getMessage(config));
    test.done();
};

exports['getMessage returns first message when locale match fails'] = function(test) {
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
    test.equals('Merci', messages.getMessage(config, 'en'));
    test.equals('Merci', messages.getMessage(config));
    test.done();
};

exports['getMessage returns empty string if passed empty array'] = function(test) {
    test.equals('', messages.getMessage([], 'en'));
    test.equals('', messages.getMessage([]));
    test.done();
};

exports['getMessage returns locale when matched'] = function(test) {
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
    test.equals('Gracias', messages.getMessage(config, 'es'));
    test.equals('Merci', messages.getMessage(config, 'fr'));
    test.done();
};

exports['getMessage uses translation_key'] = function(test) {
    var config = { translation_key: 'some.key' };
    var expected = 'Gracias';
    var translate = sinon.stub(utils, 'translate').returns(expected);
    test.equal(expected, messages.getMessage(config, 'es'));
    test.equal(translate.callCount, 1);
    test.equal(translate.args[0][0], 'some.key');
    test.equal(translate.args[0][1], 'es');
    test.done();
};

exports['getMessage uses translation_key instead of messages'] = function(test) {
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
    test.equal(expected, messages.getMessage(config, 'es'));
    test.equal(translate.callCount, 1);
    test.equal(translate.args[0][0], 'some.key');
    test.equal(translate.args[0][1], 'es');
    test.done();
};


exports['describe isOutgoingAllowed'] = function(test) {
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
      test.equals(messages.isOutgoingAllowed(t[1]), t[2]);
      s.restore();
    });
    test.done();
};

exports['describe _isMessageFromGateway'] = function(test) {
    var tests = [
      ['+774455558888', '77-44-5555-8888', true],
      ['+774455558889', '77-44-5555-8888', false],
      // missing country code matches
      ['+41446681800', '446681800', true]
    ];
    tests.forEach(function(t) {
      var s = sinon.stub(config, 'get');
      s.withArgs('gateway_number').returns(t[0]);
      test.equals(messages._isMessageFromGateway(t[1]), t[2]);
      s.restore();
    });
    test.done();
};
