var updates = require('kujua-sms/updates');

exports.publicFormHasNoFacilityNotFoundError = function(test) {
    var req = {
        headers: {"Host": window.location.host},
        form: {
            "from": "+9999999999",
            "message": "1!YYYW!facility#foo",
            "sent_timestamp":"1352399720000"
        }
    };
    var doc = updates.add_sms(null, req)[0];

    test.equals(doc.foo, 'foo'); // make sure form parsed correctly
    test.equals(doc.from, req.form.from);
    test.same(doc.related_entities, {
        clinic: null
    });
    test.equals(doc.errors.length, 0);

    test.done();
};

exports.privateFormHasFacilityNotFoundError = function(test) {
    var req = {
        headers: {"Host": window.location.host},
        form: {
            "from": "+9999999999",
            "message": "1!YYYZ!one#two#20111010",
            "sent_timestamp":"1352399720000"
        }
    };
    var doc = updates.add_sms(null, req)[0];

    test.equals(doc.two, 'two'); // make sure form parsed correctly
    test.equals(doc.from, req.form.from);
    test.same(doc.related_entities, {
        clinic: null
    });
    test.equals(doc.errors.length, 1);

    test.done();
};
