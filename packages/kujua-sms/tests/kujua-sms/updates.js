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
    // smssync post
    var req = {
        headers: {"Host": window.location.host},
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            "from":"+888",
            "message":"hmm this is test",
            "sent_timestamp":"1352399720000"
        }
    };
    // updates.add_sms generates a callback and payload
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

//
// use TEST form to create tasks on a document.
//
exports.update_related_and_tasks = function (test) {
    test.expect(3);
    var req = {
        headers: {"Host": window.location.host},
        body: JSON.stringify({
            related_entities: {
                clinic: {
                    "contact": {
                        "name": "Sam Jones",
                        "phone": "+13125551212"
                    },
                    "parent": {
                        "contact": {
                            "name": "Neal Young",
                            "phone": "+17085551212"
                        },
                        "parent": {
                            "contact": {
                                "name": "Bernie Mac",
                                "phone": "+14155551212"
                            }
                        }
                    }
                }
            }
        })
    };

    // mockup of doc fetched by couchdb during update
    var doc = {form:'TEST', year: 2012, month: 3};
    var ret = updates.updateRelated(doc, req);
    var tasks = [
        {
          "state": "pending",
          "messages": [
            {
              "to": "+14155551212",
              "message": "Health Facility Identifier: null, Report Year: 2012, Report Month: 3, Misoprostol?: null, LA 6x1: Dispensed total: null, LA 6x2: Dispensed total: null"
            }
          ]
        }
    ];
    test.same(ret[0].tasks[0].messages[0].to, "+14155551212");
    test.same(ret[0].tasks[0].state, 'pending');
    test.same(ret[0].tasks, tasks);
    test.done();
}

/*
 * this doc is missing the district level of facility so we should still have a
 * message recipient not found error.
 */
exports.update_related_and_recipient_missing = function (test) {
    test.expect(1);
    var req = {
        headers: {"Host": host},
        body: JSON.stringify({
            related_entities: {
                clinic: {
                    "contact": {
                        "name": "Sam Jones",
                        "phone": "+13125551212"
                    },
                    "parent": {
                        "contact": {
                            "name": "Neal Young",
                            "phone": "+17085551212"
                        }
                    }
                }
            }
        })
    };

    // mockup of doc fetched by couchdb during update
    var doc = {
        form:'TEST',
        year: 2012,
        month: 3,
        errors: [{
            "code":"sys.facility_not_found",
            "message":"Facility not found."
        }]
    };

    var ret = updates.updateRelated(doc, req);
    var newError = {
        "code":"sys.recipient_not_found",
        "message":"Could not find message recipient."
    };
    test.same(ret[0].errors[0], newError);
    test.done();
}

exports.extra_fields = function(test) {

    test.expect(4);
    var req = {
        headers: {"Host": window.location.host},
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            from:"+888",
            message: "1!TEST!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4#123",
            sent_timestamp:"1352399720000"
        }
    };

    var resp = fakerequest.update(updates.add_sms, null, req);
        resp_body = JSON.parse(resp[1].body),
        doc = resp[0];

    test.same(resp_body.payload.success, true);
    test.same(resp_body.payload.messages[0].message, "Extra fields.");
    test.same(doc.errors.length, 2);
    test.same(
        doc.errors[0],
        {code: "extra_fields", message:"Extra fields."}
    );

    test.done();

};

exports.missing_fields = function(test) {

    test.expect(3);

    var req = {
        headers: {"Host": window.location.host},
        form: {
            from:"+888",
            message: "1!TEST!foo"
        }
    };

    var resp = fakerequest.update(updates.add_sms, null, req);
        resp_body = JSON.parse(resp[1].body),
        doc = resp[0];

    test.same(resp_body.payload.success, true);
    test.same(
        resp_body.payload.messages[0].message,
        "Missing or invalid fields: year, month."
    );
    test.same(doc.errors[0],
        {
            code: "sys.missing_fields",
            fields: ["year","month"],
            message: "Missing or invalid fields: year, month."
        }
    );

    test.done();

};

