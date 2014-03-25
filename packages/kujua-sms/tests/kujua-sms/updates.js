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
            "message": '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4'
        }
    };
    var doc = updates.add_sms(null, req)[0];
    test.same(11, doc.month);
    test.done();
};

exports.assert_timestamp_parsed = function(test)  {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message": '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4',
            "sent_timestamp":"1352499725000"
        }
    };
    var doc = updates.add_sms(null, req)[0];
    test.same('Fri, 09 Nov 2012 22:22:05 GMT', new Date(doc.reported_date).toUTCString());
    test.done();
};

exports.deep_keys_parsed = function(test)  {
    test.expect(2);
    var req = {
        headers: {"Host": window.location.host},
        form: {
            "from": "+13125551212",
            "message": "1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4",
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
            "message": "1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4",
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
      "success": true
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
// use YYYY form to create tasks on a document.
//
exports.update_related_and_tasks = function (test) {
    test.expect(6);
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
    var doc = {form:'YYYY', year: 2012, month: 3};
    var ret = updates.updateRelated(doc, req);
    var updateDoc = ret[0];
    var resp = JSON.parse(ret[1]);
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

    test.same(updateDoc.tasks[0].messages[0].to, "+14155551212");
    test.same(updateDoc.tasks[0].state, 'pending');
    test.same(updateDoc.tasks, tasks);

    test.same(resp.payload.messages[0].message, "Zikomo!");
    test.same(resp.payload.success, true);
    test.same(resp.payload.task, 'send');
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
        form:'YYYY',
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

/*
 * Check response and payloads
 *
 * Check sms response data (payloads in smssync api terms) for gateway to
 * process, the responses take two requests to be generated. Calling this two
 * step validation and doing it because we can't validate
 * facility/related_entities on the first request.  So a response message is
 * finalized in the second/final request.
 */

exports.success_response = function (test) {
    test.expect(4);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message":"1!YYYZ!foo#bar"
        }
    };

    var ret = updates.add_sms(null, req),
        resp = JSON.parse(ret[1]);

    test.same(resp.payload, {success:true});
    part2(ret[0]);

    function part2(doc) {
        var req = {
            headers: {"Host": window.location.host},
            body: JSON.stringify({}) // related_entities not found
        };

        var ret = updates.updateRelated(doc, req),
            newDoc = ret[0],
            resp = JSON.parse(ret[1]);

        test.same(resp.payload.success, true);
        test.same(resp.payload.task, 'send');
        test.same(
            resp.payload.messages[0].message,
            'Your form submission was received, thank you.'
        );
        test.done();
    }
};

exports.success_response_w_autoreply = function (test) {
    test.expect(6);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message":"1!YYYY!facility#2012#4#1#222#333#444#555#666#777#888#999#111#222#333#444"
        }
    };
    var ret = updates.add_sms(null, req),
        resp = JSON.parse(ret[1]),
        doc = ret[0];

    test.same(doc.form, 'YYYY');
    test.same(resp.payload, {success:true});
    part2(doc);

    function part2(doc) {
        var req = {
            headers: {"Host": window.location.host},
            body: JSON.stringify({}) // related_entities not found
        };

        var ret = updates.updateRelated(doc, req),
            newDoc = ret[0],
            resp = JSON.parse(ret[1]);

        test.same(resp.payload.success, true);
        test.same(resp.payload.task, 'send');
        test.same(resp.payload.messages[0].to, "+888");
        test.same(resp.payload.messages[0].message, 'Zikomo!');
        test.done();
    }
};

exports.form_not_found_response = function(test) {
    test.expect(4);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message":"foo bar baz"
        }
    };
    var ret = updates.add_sms(null, req),
        resp = JSON.parse(ret[1]);

    test.same(resp.payload, {success:true});
    part2(ret[0]);

    function part2(doc) {
        var req = {
            headers: {"Host": window.location.host},
            body: JSON.stringify({}) // related_entities not found
        };

        var ret = updates.updateRelated(doc, req),
            newDoc = ret[0],
            resp = JSON.parse(ret[1]);

        test.same(resp.payload.success, true);
        test.same(resp.payload.task, 'send');
        test.same(
            resp.payload.messages[0].message,
            "SMS message received; it will be reviewed shortly. If you were trying to submit a text form, please enter a correct form code and try again."
        );
        test.done();
    }

};

exports.payload_form_not_found_muvuku = function (test) {
    test.expect(5);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message": '1!0000!2012#2#20#foo#bar'
        }
    };

    var ret = updates.add_sms(null, req),
        resp = JSON.parse(ret[1]);

    test.same(resp.payload, {success:true});
    part2(ret[0]);

    function part2(doc) {
        var req = {
            headers: {"Host": window.location.host},
            body: JSON.stringify({}) // related_entities not found
        };

        var ret = updates.updateRelated(doc, req),
            newDoc = ret[0],
            resp = JSON.parse(ret[1]);

        test.same(resp.payload.success, true);
        test.same(resp.payload.task, 'send');
        test.same(resp.payload.messages[0].to, "+888");
        test.same(
            resp.payload.messages[0].message,
            "SMS message received; it will be reviewed shortly. If you were trying to submit a text form, please enter a correct form code and try again."
        );
        test.done();
    }

};

exports.form_not_found_fr_responses = function (test) {
    test.expect(5);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message": '1!0000!2012#2#20#foo#bar'
        },
        query: {
            locale: "fr"
        }
    };
    var ret = updates.add_sms(null, req),
        resp = JSON.parse(ret[1]);

    test.same(resp.payload, {success:true});
    part2(ret[0]);

    function part2(doc) {
        var req = {
            headers: {"Host": window.location.host},
            body: JSON.stringify({}) // related_entities not found
        };

        var ret = updates.updateRelated(doc, req),
            newDoc = ret[0],
            resp = JSON.parse(ret[1]);

        test.same(resp.payload.success, true);
        test.same(resp.payload.task, 'send');
        test.same(resp.payload.messages[0].to, "+888");
        test.same(
            resp.payload.messages[0].message,
            'Merci, votre message a été bien reçu.'
        );
        test.done();
    }
};

exports.empty_message_response = function (test) {
    test.expect(5);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message": ''
        }
    };
    var ret = updates.add_sms(null, req),
        resp = JSON.parse(ret[1]);

    test.same(resp.payload, {success:true});
    part2(ret[0]);

    function part2(doc) {
        var req = {
            headers: {"Host": window.location.host},
            body: JSON.stringify({}) // related_entities not found
        };

        var ret = updates.updateRelated(doc, req),
            newDoc = ret[0],
            resp = JSON.parse(ret[1]);

        test.same(resp.payload.success, true);
        test.same(resp.payload.task, 'send');
        test.same(resp.payload.messages[0].to, "+888");
        test.same(
            resp.payload.messages[0].message,
            "It looks like you sent an empty message, please try to resend. If you continue to have this problem please contact your supervisor."
        );
        test.done();
    }

};

exports.empty_message_resonses_fr = function (test) {
    test.expect(5);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message": ''
        },
        query: {
            locale: "fr"
        }
    };
    var ret = updates.add_sms(null, req),
        resp = JSON.parse(ret[1]);

    test.same(resp.payload, {success:true});
    part2(ret[0]);

    function part2(doc) {
        var req = {
            headers: {"Host": window.location.host},
            body: JSON.stringify({}) // related_entities not found
        };

        var ret = updates.updateRelated(doc, req),
            newDoc = ret[0],
            resp = JSON.parse(ret[1]);

        test.same(resp.payload.success, true);
        test.same(resp.payload.task, 'send');
        test.same(resp.payload.messages[0].to, "+888");
        test.same(
            resp.payload.messages[0].message,
            "Nous avons des troubles avec votre message, SVP renvoyer. Si vous continuez à avoir des problèmes contactez votre superviseur."
        );
        test.done();
    }
};

// one word messages get an undefined `form` property
exports.payload_one_word = function (test) {
    test.expect(6);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message": 'foo'
        }
    };
    var ret = updates.add_sms(null, req),
        resp = JSON.parse(ret[1]),
        doc = ret[0];

    test.same(doc.form, undefined);
    test.same(resp.payload, {success:true});
    part2(doc);

    function part2(doc) {
        var req = {
            headers: {"Host": window.location.host},
            body: JSON.stringify({}) // related_entities not found
        };

        var ret = updates.updateRelated(doc, req),
            newDoc = ret[0],
            resp = JSON.parse(ret[1]);

        test.same(resp.payload.success, true);
        test.same(resp.payload.task, 'send');
        test.same(resp.payload.messages[0].to, "+888");
        test.same(
            resp.payload.messages[0].message,
            "SMS message received; it will be reviewed shortly. If you were trying to submit a text form, please enter a correct form code and try again."
        );
        test.done();
    }
};

exports.payload_missing_fields = function (test) {
    test.expect(6);
    var req = {
        headers: { "Host": window.location.host },
        form: {
            "from":"+888",
            "message": 'yyyy HFI',
        }
    };
    var ret = updates.add_sms(null, req),
        resp = JSON.parse(ret[1]),
        doc = ret[0];

    test.same(doc.form, 'YYYY');
    test.same(resp.payload, {success:true});
    part2(doc);

    function part2(doc) {
        var req = {
            headers: {"Host": window.location.host},
            body: JSON.stringify({}) // related_entities not found
        };

        var ret = updates.updateRelated(doc, req),
            newDoc = ret[0],
            resp = JSON.parse(ret[1]);

        test.same(resp.payload.success, true);
        test.same(resp.payload.task, 'send');
        test.same(resp.payload.messages[0].to, "+888");
        test.same(
            resp.payload.messages[0].message,
            "Missing or invalid fields: facility_id, year, month."
        );
        test.done();
    }
};



exports.extra_fields = function(test) {

    test.expect(3);
    var req = {
        headers: {"Host": window.location.host},
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            from:"+888",
            message: "1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4#123",
            sent_timestamp:"1352399720000"
        }
    };

    var resp = fakerequest.update(updates.add_sms, null, req);
        resp_body = JSON.parse(resp[1].body),
        doc = resp[0];

    test.same(resp_body.payload.success, true);
    test.same(doc.errors.length, 2);
    test.same(
        doc.errors[0],
        {code: "extra_fields", message:"Extra fields."}
    );

    test.done();

};

exports.extra_fields_response_msg = function(test) {
    test.expect(1);
    var req = {
        headers: {"Host": window.location.host},
        body: JSON.stringify({}) // related_entities not found
    };

    // mockup of doc fetched by couchdb during update
    var doc = {
        form:'YYYY',
        year: 2012,
        month: 3,
        from: "+123123123",
        errors: [
            {code: "extra_fields", message:"Extra fields."}
        ]
    };
    var ret = updates.updateRelated(doc, req);
    var newDoc = ret[0];
    var resp = JSON.parse(ret[1]);
    test.same(resp.payload.messages[0].message, "Extra fields.");
    test.done();
};

exports.missing_fields = function(test) {

    test.expect(3);

    var req = {
        headers: {"Host": window.location.host},
        form: {
            from:"+888",
            message: "1!YYYY!foo"
        }
    };

    var resp = fakerequest.update(updates.add_sms, null, req);
        resp_body = JSON.parse(resp[1].body),
        doc = resp[0];

    test.same(resp_body.payload.success, true);
    test.same(resp_body.payload.messages, undefined);
    test.same(doc.errors[0],
        {
            code: "sys.missing_fields",
            fields: ["year","month"],
            message: "Missing or invalid fields: year, month."
        }
    );
    test.done();

};

exports.missing_fields_response_msg = function(test) {
    test.expect(3);
    var req = {
        headers: {"Host": window.location.host},
        body: JSON.stringify({}) // related_entities not found
    };

    // mockup of doc fetched by couchdb during update
    var doc = {
        form:'YYYY',
        errors: [{
            code: "sys.missing_fields",
            fields: ["year","month"],
            message: "Missing or invalid fields: year, month."
        }]
    };
    var ret = updates.updateRelated(doc, req);
    var newDoc = ret[0];
    var resp = JSON.parse(ret[1]);
    test.same(resp.payload.success, true);
    test.same(resp.payload.task, 'send');
    test.same(
        resp.payload.messages[0].message,
        "Missing or invalid fields: year, month."
    );
    test.done();
};

/*
 * When a form generates messages but the recipient phone numbers for that
 * message cannot be resolved/found.
 */
exports.missing_recipient_response_msg = function(test) {
    test.expect(3);
    var req = {
        headers: {"Host": window.location.host},
        body: JSON.stringify({}) // related_entities not found
    };

    // mockup of doc fetched by couchdb during update
    var doc = {
        form:'YYYY',
        year: 2012,
        month: 3,
        errors: [],
    };
    var ret = updates.updateRelated(doc, req);
    var newDoc = ret[0];
    var resp = JSON.parse(ret[1]);
    // no messages since we don't have a recipient
    test.same(resp.payload.success, true);
    test.same(resp.payload.task, 'send');
    test.same(resp.payload.messages[0].message, 'Zikomo!');
    test.done();
};

/*
 * We do not notify the reporter of missing facility errors by default.
 */
exports.missing_facility_response_msg = function(test) {
    test.expect(6);
    var req = {
        headers: {"Host": window.location.host},
        body: JSON.stringify({}) // related_entities not found
    };

    // mockup of doc fetched by couchdb during update
    var doc = {
      "from": "+999",
      "form": "YYYY",
      "errors": [
        {
          "code": "sys.facility_not_found",
          "message": "Facility not found."
        }
      ]
    };

    var ret = updates.updateRelated(doc, req);
    var newDoc = ret[0];
    var resp = JSON.parse(ret[1]);

    test.same(resp.payload.success, true);
    test.same(resp.payload.task, 'send');
    test.same(resp.payload.messages[0].to, "+999");
    test.same(resp.payload.messages[0].message, 'Zikomo!');

    // sent messages should also be attached to response property on doc
    test.same(newDoc.responses[0].to, "+999");
    test.same(newDoc.responses[0].message, 'Zikomo!');
    test.done();
};


/*
 * If parsing fails then assume unstructured message
 */
exports.unstructured_message = function(test) {

    test.expect(5);

    var req = {
        headers: {"Host": window.location.host},
        form: {
            from:"+888",
            message: "hello world! anyone there?"
        }
    };

    var resp = fakerequest.update(updates.add_sms, null, req);
        resp_body = JSON.parse(resp[1].body),
        doc = resp[0];

    // unstructured message has form of null
    test.same(doc.form, null);
    test.same(doc.sms_message.message, "hello world! anyone there?");
    test.same(resp_body.payload.success, true);
    test.same(resp_body.payload.messages, undefined);
    test.same(doc.errors[0],
        {
            code: "sys.facility_not_found",
            message: "Facility not found."
        }
    );
    test.done();

};
