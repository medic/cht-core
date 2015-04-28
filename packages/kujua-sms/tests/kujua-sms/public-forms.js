var sinon = require('sinon'),
    utils = require('kujua-sms/utils'),
    updates = require('kujua-sms/updates'),
    definitions = require('../../test-helpers/form_definitions');

exports.setUp = function (callback) {
    utils.info = require('views/lib/appinfo').getAppInfo.call(this);
    callback();
};

exports.tearDown = function(callback) {
    if (utils.info.getForm.restore) {
        utils.info.getForm.restore();
    }
    callback();
};

exports.publicFormHasNoFacilityNotFoundError = function(test) {
    sinon.stub(utils.info, 'getForm').returns(definitions.forms.YYYW);
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
    sinon.stub(utils.info, 'getForm').returns(definitions.forms.YYYZ);
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
