var messages = require('../../lib/messages'),
    moment = require('moment');

exports['extractDetails supports template variables on doc'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: "2050-03-13T13:06:22.002Z",
        governor: "arnold",
        related_entities: {
            clinic: {
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
}

exports['extractDetails internal fields always override form fields'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: "2050-03-13T13:06:22.002Z",
        chw_name: "Arnold",
        related_entities: {
            clinic: {
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
}

exports['scheduleMessage supports template variables on doc'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: "2050-03-13T13:06:22.002Z",
        governor: "arnold"
    };
    var msg = {
        message: "Governor {{governor}} wants to speak to you.",
        due: moment().toISOString()
    };
    messages.scheduleMessage(doc, msg, "+13125551212");
    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(
        doc.scheduled_tasks[0].messages[0].message,
        "Governor arnold wants to speak to you."
    );
    test.done();
}

exports['addMessage supports template variables on doc'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: "2050-03-13T13:06:22.002Z",
        governor: "Schwarzenegger"
    };
    var msg = {
        due: moment().toISOString()
    };
    messages.addMessage({
        doc: doc,
        phone: "+13125551212",
        message: "Governor {{governor}} wants to speak to you."
    });
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        "Governor Schwarzenegger wants to speak to you."
    );
    test.done();
}

exports['addMessage template supports contact obj'] = function(test) {
    var doc = {
        form: 'x',
        related_entities: {
            clinic: {
                contact: {
                    name: 'Paul'
                }
            }
        }
    };
    messages.addMessage({
        doc: doc,
        phone: "+13125551212",
        message: "Thank you {{contact.name}}."
    });
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        "Thank you Paul."
    );
    test.done();
}

exports['addMessage supports clinic dot template variables'] = function(test) {
    var doc = {
        form: 'x',
        related_entities: {
            clinic: {
                contact: {
                    name: 'Sally'
                }
            }
        }
    };
    messages.addMessage({
        doc: doc,
        phone: "+13125551212",
        message: "Thank you {{clinic.contact.name}}."
    });
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        "Thank you Sally."
    );
    test.done();
}

exports['addMessage template supports health_center object'] = function(test) {
    var doc = {
        form: 'x',
        related_entities: {
            clinic: {
                parent: {
                    contact: {
                        name: "Jeremy"
                    }
                }
            }
        }
    };
    messages.addMessage({
        doc: doc,
        phone: "+13125551212",
        message: "Thank you {{health_center.contact.name}}."
    });
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        "Thank you Jeremy."
    );
    test.done();
}

exports['addMessage template supports district object'] = function(test) {
    var doc = {
        form: 'x',
        related_entities: {
            clinic: {
                parent: {
                    parent: {
                        contact: {
                            name: "Kristen"
                        }
                    }
                }
            }
        }
    };
    messages.addMessage({
        doc: doc,
        phone: "+13125551212",
        message: "Thank you {{district.contact.name}}."
    });
    test.equals(doc.tasks.length, 1);
    test.equals(
        doc.tasks[0].messages[0].message,
        "Thank you Kristen."
    );
    test.done();
}

exports['getRecipientPhone resolves `clinic` correctly'] = function(test) {
    var phone = '+13125551213';
    var doc = {
        form: 'x',
        related_entities: {
            clinic: {
                contact: {
                    phone: phone
                }
            }
        }
    };
    var result = messages.getRecipientPhone(doc, 'clinic');
    test.equals(result, phone);
    test.done();
}

exports['getRecipientPhone defaults to doc.from if no recipient'] = function(test) {
    var phone = '+13125551213';
    var doc = {
        form: 'x',
        from: phone
    };
    var result = messages.getRecipientPhone(doc);
    test.equals(result, phone);
    test.done();
}

exports['getRecipientPhone defaults to doc.from if no known recipient'] = function(test) {
    var phone = '+13125551213';
    var doc = {
        form: 'x',
        from: phone
    };
    var result = messages.getRecipientPhone(doc, 'greatgrandparent');
    test.equals(result, phone);
    test.done();
}

exports['getRecipientPhone defaults to given default'] = function(test) {
    var phone = '+13125551213';
    var doc = {
        form: 'x',
        from: '+6666666666'
    };
    var result = messages.getRecipientPhone(doc, 'greatgrandparent', phone);
    test.equals(result, phone);
    test.done();
}