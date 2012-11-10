var updates = require('kujua-sms/updates'),
    querystring = require('querystring'),
    fakerequest = require('couch-fakerequest'),
    baseURL = require('duality/core').getBaseURL(),
    host = window.location.host.split(':')[0],
    port = window.location.host.split(':')[1] || '';

exports.assert_month_is_integer = function(test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message": '1!TEST!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4'
        }
    };
    var doc = updates.add_sms(null, req)[0];
    test.same(11, doc.month);
    test.done();
};

exports.assert_timestamp_parsed = function(test)  {
    test.expect(2);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message": '1!TEST!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4',
            "sent_timestamp":"1352499725000"
        }
    };
    var doc = updates.add_sms(null, req)[0];
    test.same(
        'Fri Nov 09 2012',
        new Date(doc.reported_date).toDateString()
    );
    test.equal(
        "16:22",
        new Date(doc.reported_date)
            .toTimeString().match(/^16:22/)[0]
    );
    test.done();
};

exports.deep_keys_parsed = function(test)  {
    test.expect(2);
    var req = {
        headers: {"Host": window.location.host},
        form: {
            "from": "+13125551212",
            "message": "1!TEST!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4",
            "sent_timestamp":"1352399720000"
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
    var doc = updates.add_sms(null, req)[0];

    test.same(doc.days_stocked_out, days_stocked_out);
    test.same(doc.quantity_dispensed, quantity_dispensed);

    test.done();
};

exports.sms_message_attr_on_doc = function(test) {
    test.expect(1);
    var req = {
        headers: {"Host": window.location.host},
        form: {
            "from": "+13125551212",
            "message": "1!TEST!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4",
            "sent_timestamp":"1352399720000"
        }
    };
    var doc = updates.add_sms(null, req)[0];

    test.same(doc.sms_message, req.form);
    test.done();
};

exports.add_sms_check_resp_body = function (test) {
    test.expect(7);
    var req = {
        headers: {"Host": window.location.host},
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            "from":"+888",
            "message":"hmm this is test",
            "sent_timestamp":"1352399720000"
        }
    };
    var expResp = {};
    expResp.callback = {
        "options": {
            "host": host,
            "port": port,
            "method":"POST",
            "headers":{
                "Content-Type":"application/json; charset=utf-8"
            },
            "path": baseURL + "/data_record/add/facility/%2B888"
        },
        "data":{"uuid":"13f58b9c648b9a997248cba27aa00fdf"}
    };
    expResp.payload = {
      "success": true,
      "task": "send",
      "messages": [
        {
          "to": "+888",
          "message": "The form sent 'HMM' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor."
        }
      ]
    };

    var ret = updates.add_sms(null, req);
    resp = JSON.parse(ret[1]);

    test.same(resp.callback.options, expResp.callback.options);
    test.same(resp.callback.options.headers, expResp.callback.options.headers);
    test.same(resp.callback.options.path, expResp.callback.options.path);
    test.same(resp.callback.data, expResp.callback.data);
    test.same(resp.payload, expResp.payload);
    test.same(resp.callback, expResp.callback);
    test.same(resp, expResp);
    test.done();
};
