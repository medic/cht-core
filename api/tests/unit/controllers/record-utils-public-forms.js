var proxyquire = require('proxyquire').noCallThru(),
    sinon = require('sinon'),
    definitions = require('../../form-definitions'),
    appInfo;

var info = proxyquire('../../../../packages/kujua-sms/views/lib/appinfo', {
    'cookies': {},
    'duality/utils': { getBaseURL: function() { return 'BASEURL'; } },
    'underscore': require('underscore')
});
var validate = require('../../../../packages/kujua-sms/kujua-sms/validate');
var kujua_sms_utils = proxyquire('../../../../packages/kujua-sms/kujua-sms/utils', {
    'views/lib/objectpath': {},
    'underscore': require('underscore')
});
var textforms_parser = proxyquire('../../../../packages/kujua-sms/views/lib/textforms_parser', {
    'kujua-sms/utils': kujua_sms_utils
});
var javarosa_parser = proxyquire('../../../../packages/kujua-sms/views/lib/javarosa_parser', {
    'kujua-sms/utils': kujua_sms_utils
});
var smsparser = proxyquire('../../../../packages/kujua-sms/views/lib/smsparser', {
    'kujua-sms/utils': kujua_sms_utils,
    './javarosa_parser': javarosa_parser,
    './textforms_parser': textforms_parser
});
var libphonenumber = proxyquire('../../../../packages/libphonenumber/libphonenumber/utils', {
  'libphonenumber/libphonenumber': require('../../../../packages/libphonenumber/libphonenumber/libphonenumber')
});
var updates = proxyquire('../../../../packages/kujua-sms/kujua-sms/updates', {
    'moment': require('../../../../packages/moment/moment'),
    'views/lib/appinfo': info,
    'views/lib/smsparser': smsparser,
    'libphonenumber/utils': libphonenumber,
    './validate': validate,
    './utils': kujua_sms_utils
});

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
    kujua_sms_utils.info = info.getAppInfo.call(this);
    callback();
};

exports['public form has no facility not found error'] = function(test) {
    test.expect(4);
    var getForm = sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYW);

    var req = {
        headers: { Host: 'localhost' },
        form: {
            from: '+9999999999',
            message: '1!YYYW!facility#foo',
            sent_timestamp: '1352399720000'
        }
    };
    var doc = updates.add(null, req)[0];

    test.ok(getForm.alwaysCalledWith('YYYW'));
    test.equals(doc.fields.foo, 'foo'); // make sure form parsed correctly
    test.equals(doc.from, req.form.from);
    test.equals(doc.errors.length, 0);

    test.done();
};

exports['private form has facility not found error'] = function(test) {
    test.expect(4);
    var getForm = sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYZ);

    var req = {
        headers: { Host: 'localhost' },
        form: {
            from: '+9999999999',
            message: '1!YYYZ!one#two#20111010',
            sent_timestamp: '1352399720000'
        }
    };
    var doc = updates.add(null, req)[0];

    test.ok(getForm.alwaysCalledWith('YYYZ'));
    test.equals(doc.fields.two, 'two'); // make sure form parsed correctly
    test.equals(doc.from, req.form.from);
    test.equals(doc.errors.length, 1);

    test.done();
};
