var proxyquire = require('proxyquire').noCallThru(),
    sinon = require('sinon'),
    definitions = require('../../form_definitions'),
    appInfo;

var info = proxyquire('../../../../packages/kujua-sms/views/lib/appinfo', {
    'cookies': {},
    'duality/utils': { getBaseURL: function() { return 'BASEURL'; } },
    'underscore': require('underscore')
});
var kujua_utils = proxyquire('../../../../packages/kujua-utils/kujua-utils', {
    'cookies': {}
});
var kujua_sms_utils = proxyquire('../../../../packages/kujua-sms/kujua-sms/utils', {
    'kujua-utils': kujua_utils,
    'views/lib/objectpath': {},
    'underscore': require('underscore')
});
var validate = proxyquire('../../../../packages/kujua-sms/kujua-sms/validate', {
    'kujua-utils': kujua_utils
});
var textforms_parser = proxyquire('../../../../packages/kujua-sms/views/lib/textforms_parser', {
    'kujua-sms/utils': kujua_sms_utils
});
var javarosa_parser = proxyquire('../../../../packages/kujua-sms/views/lib/javarosa_parser', {
    'kujua-sms/utils': kujua_sms_utils
});
var smsparser = proxyquire('../../../../packages/kujua-sms/views/lib/smsparser', {
    'kujua-utils': kujua_utils,
    'kujua-sms/utils': kujua_sms_utils,
    './javarosa_parser': javarosa_parser,
    './textforms_parser': textforms_parser
});
var libphonenumber = proxyquire('../../../../packages/libphonenumber/libphonenumber/utils', {
  'libphonenumber/libphonenumber': require('../../../../packages/libphonenumber/libphonenumber/libphonenumber')
});
var updates = proxyquire('../../../../packages/kujua-sms/kujua-sms/updates', {
    'moment': require('../../../../packages/moment/moment'),
    'kujua-utils': kujua_utils,
    'views/lib/appinfo': info,
    'views/lib/smsparser': smsparser,
    'libphonenumber/utils': libphonenumber,
    './validate': validate,
    './utils': kujua_sms_utils
});

exports.setUp = function (callback) {
    appInfo = {
        getForm: function() {},
        translate: function(key, locale) {
            return key + '|' + locale;
        },
        getMessage: function(value, locale) {
            return (value.en || value) + '|' + locale;
        }
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

exports['assert month is parsed as integer'] = function(test) {
    var getForm = sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYY);
    var req = {
        form: {
            from: '+888',
            message: '1!YYYY!facility#2011#11'
        }
    };
    var doc = updates.add(null, req)[0];
    test.ok(getForm.alwaysCalledWith('YYYY'));
    test.same(11, doc.fields.month);
    test.done();
};

exports['assert unix timestamp parsed'] = function(test) {
    var req = {
        form: {
            message: 'foo',
            sent_timestamp:'1352499725000'
        }
    };
    var doc = updates.add(null, req)[0];
    test.same(
        'Fri, 09 Nov 2012 22:22:05 GMT',
        new Date(doc.reported_date).toUTCString()
    );
    test.done();
};

exports['deep keys parsed'] = function(test) {
    var getForm = sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYY);
    var req = {
        form: {
            from: '+13125551212',
            message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4',
            sent_timestamp:'1352399720000'
        }
    };
    var days_stocked_out = {
        cotrimoxazole: 7,
        eye_ointment: 4,
        la_6x1: 9,
        la_6x2: 8,
        ors: 5,
        zinc: 6
    };
    var quantity_dispensed = {
        cotrimoxazole: 3,
        eye_ointment: 6,
        la_6x1: 1,
        la_6x2: 2,
        ors: 5,
        zinc: 4
    };
    var doc = updates.add(null, req)[0];
    test.ok(getForm.alwaysCalledWith('YYYY'));
    test.same(doc.fields.days_stocked_out, days_stocked_out);
    test.same(doc.fields.quantity_dispensed, quantity_dispensed);
    test.done();
};

exports['POST data is saved on sms_message attr'] = function(test) {
    var req = {
        form: {
            from: '+13125551212',
            message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4',
            sent_timestamp:'1352399720000'
        }
    };
    var doc = updates.add(null, req)[0];
    test.same(doc.sms_message, req.form);
    test.done();
};

exports['add sms sucessful payload and uuid is passed through'] = function (test) {
    var req = {
        uuid: '13f58b9c648b9a997248cba27aa00fdf',
        form: {
            from:'+888',
            message:'hmm this is test',
            sent_timestamp:'1352399720000'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]);
    test.same(resp, {
        payload: {
          id: '13f58b9c648b9a997248cba27aa00fdf',
          success: true
        }
    });
    test.done();
};

exports['parsed form success maintains facility not found'] = function (test) {
    sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYZ);
    var req = {
        headers: { Host: 'locahost' },
        form: {
            from:'+888',
            message:'1!YYYZ!foo#bar'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]);
    test.same(resp.payload, {success: true});
    test.same(ret[0].errors[0].code, 'sys.facility_not_found');
    test.same(ret[0].errors.length, 1);
    test.done();
};

exports['autoreply on YYYY form is ignored'] = function (test) {
    sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYY);
    var req = {
        form: {
            from:'+888',
            message:'1!YYYY!facility#2012#4#1#222#333#444#555#666#777#888#999#111#222#333#444'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]),
        doc = ret[0];
    test.same(doc.form, 'YYYY');
    test.same(resp.payload, {success:true});
    test.same(ret[0].errors[0].code, 'sys.facility_not_found');
    test.same(ret[0].errors.length, 1);
    test.done();
};

exports['form not found error not set by default'] = function(test) {
    var req = {
        form: {
            from:'+888',
            message:'foo bar baz'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]);
    test.same(ret[0].errors[0].code, 'sys.facility_not_found');
    test.same(ret[0].errors.length, 1);
    test.same(resp.payload, {success:true});
    test.done();
};

exports['form not found error set in forms only mode'] = function(test) {
    appInfo.forms_only_mode = true;
    var req = {
        form: {
            from:'+888',
            message:'foo bar baz'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]);
    test.same(ret[0].errors[0].code, 'sys.facility_not_found');
    test.same(ret[0].errors[1].code, 'sys.form_not_found');
    test.same(ret[0].errors.length, 2);
    test.same(resp.payload, {success:true});
    test.done();
};

exports['only facility not found error on muvuku add'] = function (test) {
    var req = {
        form: {
            from:'+888',
            message: '1!0000!2012#2#20#foo#bar'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]);
    test.same(resp.payload, {success:true});
    test.same(ret[0].errors[0].code, 'sys.facility_not_found');
    test.same(ret[0].errors.length, 1);
    test.done();
};

exports['form not found response locale from query'] = function (test) {
    appInfo.forms_only_mode = true;
    var req = {
        form: {
            from:'+888',
            message: '1!0000!2012#2#20#foo#bar'
        },
        query: {
            locale: 'fr'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]);
    test.same(resp.payload, {success:true});
    test.same(ret[0].errors[0].code, 'sys.facility_not_found');
    test.same(ret[0].errors[0].message, 'sys.facility_not_found|fr');
    test.same(ret[0].errors[1].code, 'sys.form_not_found');
    test.same(ret[0].errors[1].message, 'sys.form_not_found|fr');
    test.same(ret[0].errors.length, 2);
    test.done();
};

exports['form not found message locale on form overrides locale on query'] = function (test) {
    appInfo.forms_only_mode = true;
    var req = {
        form: {
            locale: 'es',
            from: '+888',
            message: '1!0000!2012#2#20#foo#bar'
        },
        query: {
            locale: 'fr'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]);
    test.same(resp.payload, {success:true});
    test.same(ret[0].errors[0].code, 'sys.facility_not_found');
    test.same(ret[0].errors[0].message, 'sys.facility_not_found|es');
    test.same(ret[0].errors[1].code, 'sys.form_not_found');
    test.same(ret[0].errors[1].message, 'sys.form_not_found|es');
    test.same(ret[0].errors.length, 2);
    test.done();
};

exports['form not found message locale fallback to app_settings'] = function (test) {
    appInfo.locale = 'ne';
    appInfo.forms_only_mode = true;
    var req = {
        headers: { Host: 'localhost' },
        form: {
            from: '+888',
            message: '1!0000!2012#2#20#foo#bar'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]);
    test.same(resp.payload, {success:true});
    test.same(ret[0].errors[0].code, 'sys.facility_not_found');
    test.same(ret[0].errors[0].message, 'sys.facility_not_found|ne');
    test.same(ret[0].errors[1].code, 'sys.form_not_found');
    test.same(ret[0].errors[1].message, 'sys.form_not_found|ne');
    test.same(ret[0].errors.length, 2);
    test.done();
};

exports['form not found message when locale undefined'] = function (test) {
    appInfo.locale = undefined;
    appInfo.forms_only_mode = true;
    var req = {
        form: {
            from: '+888',
            message: '1!0000!2012#2#20#foo#bar'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]);
    test.same(resp.payload, {success:true});
    test.same(ret[0].errors[0].code, 'sys.facility_not_found');
    test.same(ret[0].errors[0].message, 'sys.facility_not_found|en');
    test.same(ret[0].errors[1].code, 'sys.form_not_found');
    test.same(ret[0].errors[1].message, 'sys.form_not_found|en');
    test.same(ret[0].errors.length, 2);
    test.done();
};

exports['assign sys.empty error to empty report'] = function (test) {
    var req = {
        form: {
            from:'+888',
            message: ' '
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]);
    test.same(resp.payload, {success:true});
    test.same(ret[0].errors[0].code, 'sys.facility_not_found');
    test.same(ret[0].errors[0].message, 'sys.facility_not_found|en');
    test.same(ret[0].errors[1].code, 'sys.empty');
    test.same(ret[0].errors[1].message, 'sys.empty|en');
    test.done();
};

exports['empty error messages with fr query param'] = function (test) {
    var req = {
        form: {
            from:'+888',
            message: ' '
        },
        query: {
            locale: 'fr'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]);
    test.same(resp.payload, {success:true});
    test.same(ret[0].errors[0].code, 'sys.facility_not_found');
    test.same(ret[0].errors[0].message, 'sys.facility_not_found|fr');
    test.same(ret[0].errors[1].code, 'sys.empty');
    test.same(ret[0].errors[1].message, 'sys.empty|fr');
    test.done();
};

exports['one word report gets undefined form property'] = function (test) {
    var req = {
        form: {
            from:'+888',
            message: 'foo'
        }
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]),
        doc = ret[0];
    test.same(doc.form, undefined);
    test.same(resp.payload, {success:true});
    test.done();
};

exports['errors on extra fields'] = function(test) {
    var getForm = sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYY);
    var req = {
        form: {
            from:'+888',
            message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4#123',
            sent_timestamp:'1352399720000'
        }
    };
    var resp = updates.add(null, req),
        resp_body = JSON.parse(resp[1]),
        doc = resp[0];
    test.ok(getForm.alwaysCalledWith('YYYY'));
    test.same(resp_body.payload, {success: true});
    test.same(doc.errors.length, 2);
    test.same(doc.errors[0], {
        code: 'extra_fields',
        message:'extra_fields|en'
    });
    test.done();
};

exports['errors on missing fields'] = function(test) {
    var getForm = sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYY);
    var req = {
        form: {
            from:'+888',
            message: '1!YYYY!foo'
        }
    };
    var resp = updates.add(null, req),
        resp_body = JSON.parse(resp[1]),
        doc = resp[0];
    test.ok(getForm.alwaysCalledWith('YYYY'));
    test.same(resp_body.payload, {success: true});
    test.same(doc.errors[0], {
        code: 'sys.missing_fields',
        fields: ['year','month'],
        message: 'sys.missing_fields|en'
    });
    test.done();
};

exports['support unstructured message'] = function(test) {
    var req = {
        form: {
            from:'+888',
            message: 'hello world! anyone there?'
        }
    };
    var resp = updates.add(null, req),
        resp_body = JSON.parse(resp[1]),
        doc = resp[0];
    // unstructured message has form of null
    test.same(doc.form, undefined);
    test.same(doc.sms_message.message, 'hello world! anyone there?');
    test.same(resp_body.payload, {success: true});
    test.same(doc.errors[0], {
        code: 'sys.facility_not_found',
        message: 'sys.facility_not_found|en'
    });
    test.done();
};

exports['creates record with empty message field'] = function(test) {
    var req = {
        form: {
          message: ''
        }
    };
    var ret = updates.add(null, req),
        resp_body = JSON.parse(ret[1]),
        doc = ret[0];
    test.same(doc.sms_message.message, '');
    test.same(resp_body.payload, {success: true});
    test.done();
};

exports['JSON POST: return 500 error if form not found'] = function(test) {
    var req = {
        body: '{ "_meta: { "form: "foo" } }'
    };
    var ret = updates.add(null, req),
        resp_body = JSON.parse(ret[1].body);
    test.same(ret[0], null);
    test.same(resp_body.payload.success, false);
    test.same(ret[1].code, 500);
    test.done();
};

exports['JSON POST: return 500 error if JSON parse fails'] = function(test) {
    var req = {
        body: 'bad json'
    };
    var ret = updates.add(null, req),
        resp_body = JSON.parse(ret[1].body);
    test.same(ret[0], null);
    test.same(resp_body.payload.success, false);
    test.same(ret[1].code, 500);
    test.done();
};

exports['JSON POST: support _meta.form property to match/parse form'] = function(test) {
    var getForm = sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYY);
    var req = {
        body: JSON.stringify({
            facility_id: 'zanzibar',
            year: 2011,
            month: 8,
            _meta: {
                form: 'yyyy'
            }
        })
    };
    var ret = updates.add(null, req),
        resp_body = JSON.parse(ret[1]),
        doc = ret[0];
    test.ok(getForm.alwaysCalledWith('YYYY'));
    test.same(resp_body, {payload: {success: true}});
    test.same(doc.form, 'YYYY');
    test.same(doc.fields.facility_id, 'zanzibar');
    test.same(doc.fields.month, 8);
    test.same(doc.fields.year, 2011);
    test.done();
};

exports['JSON POST: _meta.form is case insensitive'] = function(test) {
    var getForm = sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYY);
    var req = {
        body: JSON.stringify({
            _meta: {
                form: 'yyYy'
            }
        })
    };
    updates.add(null, req);
    test.ok(getForm.alwaysCalledWith('YYYY'));
    test.done();
};

exports['JSON POST: ignore object and null properties'] = function(test) {
    sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYY);
    var req = {
        body: JSON.stringify({
            facility_id: 'zanzibar',
            year: 2011,
            month: 8,
            age: null,
            picture: {
                url: 'http://foo.com/1.jpg'
            },
            _meta: {
                form: 'yyyy'
            }
        })
    };
    var ret = updates.add(null, req),
        resp = JSON.parse(ret[1]),
        doc = ret[0];
    test.same(resp.payload, {success: true});
    test.same(doc.fields.facility_id, 'zanzibar');
    test.same(doc.fields.year, 2011);
    test.same(doc.fields.age, undefined);
    test.same(doc.fields.picture, undefined);
    test.done();
};

exports['JSON POST: convert property names to lowercase'] = function(test) {
    sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYY);
    var req = {
        body: JSON.stringify({
            FaciLity_Id: 'zanzibar',
            Year: 2011,
            mOnth: 8,
            _meta: {
                form: 'yyyy'
            }
        })
    };
    var ret = updates.add(null, req),
        resp_body = JSON.parse(ret[1]),
        doc = ret[0];
    test.same(resp_body.payload, {success: true});
    test.same(doc.fields.facility_id, 'zanzibar');
    test.same(doc.fields.year, 2011);
    test.done();
};

exports['JSON POST: support reported_date  _meta property'] = function(test) {
    sinon.stub(appInfo, 'getForm').returns(definitions.forms.YYYY);
    var req = {
        body: JSON.stringify({
            facility_id: 'zanzibar',
            year: 2011,
            month: 8,
            _meta: {
                reported_date : '2015-01-13T19:36:59.013Z',
                form: 'yyyy'
            }
        })
    };
    var ret = updates.add(null, req),
        resp_body = JSON.parse(ret[1]),
        doc = ret[0];
    test.same(resp_body.payload, {success: true});
    test.same(doc.reported_date, 1421177819013);
    test.same(doc.fields.facility_id, 'zanzibar');
    test.same(doc.fields.year, 2011);
    test.same(doc.fields.month, 8);
    test.done();
};
