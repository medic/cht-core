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
    test.equals(details.chw_phone, '123');
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
    test.equals(details.chw_name, 'Sally');
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

