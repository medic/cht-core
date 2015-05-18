var utils = require('kujua-sms/utils'),
    updates = require('kujua-sms/updates'),
    sinon = require('sinon'),
    definitions = require('../../test-helpers/form_definitions'),
    info = require('views/lib/appinfo'),
    appInfo;

exports.setUp = function (callback) {
    appInfo = {
        getForm: function() {},
        translate: function(key) { return key; }
    };
    sinon.stub(info, 'getAppInfo').returns(appInfo);
    callback();
};

exports.tearDown = function(callback) {
    if (info.getAppInfo.restore) {
        info.getAppInfo.restore();
    }
    if (appInfo.getForm.restore) {
        appInfo.getForm.restore();
    }
    utils.info = info.getAppInfo.call(this);
    callback();
};

exports['public form has no facility not found error'] = function(test) {
    test.expect(4);
    var getForm = sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYW);

    var req = {
        headers: {"Host": window.location.host},
        form: {
            "from": "+9999999999",
            "message": "1!YYYW!facility#foo",
            "sent_timestamp":"1352399720000"
        }
    };
    var doc = updates.add(null, req)[0];

    test.ok(getForm.alwaysCalledWith('YYYW'));
    test.equals(doc.foo, 'foo'); // make sure form parsed correctly
    test.equals(doc.from, req.form.from);
    test.equals(doc.errors.length, 0);

    test.done();
};

exports['private form has facility not found error'] = function(test) {
    test.expect(4);
    var getForm = sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYZ);

    var req = {
        headers: {"Host": window.location.host},
        form: {
            "from": "+9999999999",
            "message": "1!YYYZ!one#two#20111010",
            "sent_timestamp":"1352399720000"
        }
    };
    var doc = updates.add(null, req)[0];

    test.ok(getForm.alwaysCalledWith('YYYZ'));
    test.equals(doc.two, 'two'); // make sure form parsed correctly
    test.equals(doc.from, req.form.from);
    test.equals(doc.errors.length, 1);

    test.done();
};
