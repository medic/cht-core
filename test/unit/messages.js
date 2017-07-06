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

exports['extractDetails supports template variables on doc'] = function(test) {
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
    var details = messages.extractDetails(doc);
    test.equals(details.contact.phone, '123');
    test.equals(details.governor, 'arnold');
    test.done();
};

exports['extractDetails internal fields always override form fields'] = function(test) {
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
    var details = messages.extractDetails(doc);
    test.equals(details.chw_name, 'Arnold');
    test.equals(details.contact.name, 'Sally');
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
    var registrations = [ { doc: { fields: { patient_name: 'Marc' } } } ];
    messages.scheduleMessage(doc, msg, '+13125551212', registrations);
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

exports['addMessage lets you use info from a passed person'] = test => {
    const doc = {};
    messages.addMessage({
        doc: doc,
        phone: '123',
        person: {name: 'Sally'},
        message: 'Thank you {{person.name}}.',
    });
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        'Thank you Sally.'
    );
    test.done();
};

exports['addMessage aliases person.name to patient_name for backwards compat'] = test => {
    const doc = {};
    messages.addMessage({
        doc: doc,
        phone: '123',
        person: {name: 'Sally'},
        message: 'Thank you {{patient_name}}.',
    });
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        'Thank you Sally.'
    );
    test.done();
};

exports['getRecipientPhone resolves `clinic` correctly'] = function(test) {
    var phone = '+13125551213';
    var doc = {
        form: 'x',
        contact: {
            phone: phone,
            parent: {
                contact: {
                    phone: phone
                }
            }
        }
    };
    var result = messages.getRecipientPhone(doc, 'clinic');
    test.equals(result, phone);
    test.done();
};

exports['getRecipientPhone defaults to doc.from if no recipient'] = function(test) {
    var phone = '+13125551213';
    var doc = {
        form: 'x',
        from: phone
    };
    var result = messages.getRecipientPhone(doc);
    test.equals(result, phone);
    test.done();
};

exports['getRecipientPhone defaults to doc.from if no known recipient'] = function(test) {
    var phone = '+13125551213';
    var doc = {
        form: 'x',
        from: phone
    };
    var result = messages.getRecipientPhone(doc, 'greatgrandparent');
    test.equals(result, phone);
    test.done();
};

exports['getRecipientPhone defaults to given default'] = function(test) {
    var phone = '+13125551213';
    var doc = {
        form: 'x',
        from: '+6666666666'
    };
    var result = messages.getRecipientPhone(doc, 'greatgrandparent', phone);
    test.equals(result, phone);
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
