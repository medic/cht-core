var templates = require('duality/templates'),
    events = require('lib/events');

events.addHelpers();

exports.includesSubmittedByWhenDifferent = function(test) {
    var html = templates.render('incoming_form.html', {}, {
        related_entities: {
            clinic: {
                contact: {
                    phone: '+2345'
                },
                name: 'abcd'
            }
        },
        from: '+1234'
    });

    test.ok(html.indexOf('+2345') >= 0);
    test.ok(html.indexOf('<div class="label">Submitted by +1234</div>') >= 0);
    test.done();
};

exports.noSubmittedByWhenSame = function(test) {
    var html = templates.render('incoming_form.html', {}, {
        related_entities: {
            clinic: {
                contact: {
                    phone: '+2345'
                },
                name: 'abcd'
            }
        },
        from: '+2345'
    });

    test.ok(html.indexOf('<div class="label">Submitted by +2345</div>') < 0);
    test.done();
};

exports.usesSentByWhenAvailable = function(test) {
    var html = templates.render('incoming_form.html', {}, {
        related_entities: {
            clinic: {
                contact: {
                    phone: '+2345'
                },
                name: 'abcd'
            }
        },
        from: '+1345',
        sent_by: 'donkey'
    });

    test.ok(html.indexOf('<div class="label">Submitted by +1345</div>') < 0);
    test.ok(html.indexOf('<div class="label">Submitted by donkey</div>') >= 0);
    test.done();
}
