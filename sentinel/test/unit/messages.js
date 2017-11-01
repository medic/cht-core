var messages = require('../../lib/messages'),
    moment = require('moment'),
    utils = require('../../lib/utils'),
    sinon = require('sinon');

exports.tearDown = function(callback) {
    if (utils.translate.restore) {
        utils.translate.restore();
    }
    callback();
};

exports['extractTemplateContext supports template variables on doc'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z',
        governor: 'arnold',
        contact: {
            phone: '123',
            parent: {
                contact: {
                    phone: '123'
                }
            }
        }
    };
    var templateContext = messages.extractTemplateContext(doc);
    test.equals(templateContext.contact.phone, '123');
    test.equals(templateContext.governor, 'arnold');
    test.done();
};

exports['extractTemplateContext internal fields always override form fields'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z',
        chw_name: 'Arnold',
        contact: {
            name: 'Sally',
            parent: {
                contact: {
                    name: 'Sally'
                }
            }
        }
    };
    var templateContext = messages.extractTemplateContext(doc);
    test.equals(templateContext.chw_name, 'Arnold');
    test.equals(templateContext.contact.name, 'Sally');
    test.done();
};

exports['scheduleMessage supports template variables on doc'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z',
        governor: 'arnold'
    };
    var msg = {
        message: 'Governor {{governor}} wants to speak to you.',
        due: moment().toISOString()
    };
    messages.scheduleMessage(doc, msg, '+13125551212');
    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(
        doc.scheduled_tasks[0].messages[0].message,
        'Governor arnold wants to speak to you.'
    );
    test.done();
};

exports['scheduleMessage aliases patient.name to patient_name'] = test => {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z',
    };
    var msg = {
        message: 'Hello {{patient_name}}.',
        due: moment().toISOString()
    };
    messages.scheduleMessage(doc, msg, '+13125551212', [], {name: 'Sally'});
    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(
        doc.scheduled_tasks[0].messages[0].message,
        'Hello Sally.'
    );
    test.done();
};

exports['scheduleMessage adds registration details to message context'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z',
        governor: 'arnold'
    };
    var msg = {
        message: 'Dear {{patient_name}}, Governor {{governor}} wants to speak to you.',
        due: moment().toISOString()
    };
    var person = { _id: '123', name: 'Marc' };
    messages.scheduleMessage(doc, msg, '+13125551212', [], person);
    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(
        doc.scheduled_tasks[0].messages[0].message,
        'Dear Marc, Governor arnold wants to speak to you.'
    );
    test.done();
};

exports['addMessage supports template variables on doc'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z',
        governor: 'Schwarzenegger'
    };
    messages.addMessage({
        doc: doc,
        phone: '+13125551212',
        message: 'Governor {{governor}} wants to speak to you.'
    });
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
    messages.addMessage({
        doc: doc,
        phone: '+13125551212',
        message: 'You\'re from {{place}}'
    });
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
    messages.addMessage({
        doc: doc,
        phone: '+13125551212',
        message: 'Thank you {{contact.name}}.'
    });
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
    messages.addMessage({
        doc: doc,
        phone: '+13125551212',
        message: 'Thank you {{contact.name}}.'
    });
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
    messages.addMessage({
        doc: doc,
        phone: '+13125551212',
        message: 'Thank you {{health_center.contact.name}}.'
    });
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
    messages.addMessage({
        doc: doc,
        phone: '+13125551212',
        message: 'Thank you {{district.contact.name}}.'
    });
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
    messages.addMessage({
        doc: doc,
        phone: '+13125551212',
        message: 'Thank you {{patient_name}}.'
    });
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        'Thank you Sally.'
    );
    test.done();
};

exports['addMessage aliases patient.name to patient_name'] = test => {
    const doc = {};
    messages.addMessage({
        doc: doc,
        phone: '123',
        patient: {name: 'Sally'},
        message: 'Thank you {{patient_name}}.',
    });
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
