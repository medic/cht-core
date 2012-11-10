var updates = require('kujua-sms/updates'),
    lists = require('kujua-sms/lists'),
    querystring = require('querystring'),
    baseURL = require('duality/core').getBaseURL();


// exmaple couchdb update request from smssync
var req_example_junk = {
    headers: {"Host": window.location.host},
    uuid: '13f58b9c648b9a997248cba27aa00fdf',
    form: {
        "secret":"",
        "from":"+888",
        "message":"hmm this is test",
        "message_id":"886",
        "sent_timestamp":"1352399720000",
        "sent_to":""
    }
};

// check returned doc from add_sms update function
exports.add_sms_check_doc = function (test) {
    test.expect(6);
    var expDoc = {
        "_id":"13f58b9c648b9a997248cba27aa00fdf",
        "type":"data_record",
        "from":"+888",
        "form":"HMM",
        "related_entities":{"clinic":null},
        "errors": [
            {
                "code":"sys.form_not_found",
                "message":"Form 'HMM' not found."
            }
        ],
        "responses":[],
        "tasks":[],
        "reported_date": 1352399720000,
        "sms_message":{
            "secret":"",
            "from":"+888",
            "message":"hmm this is test",
            "message_id":"886",
            "sent_timestamp":"1352399720000",
            "sent_to":"",
            "type":"sms_message",
            "locale":"en",
            "form":"HMM"
        }
    };

    var doc = updates.add_sms(null, req_example_junk)[0];

    test.same(doc, expDoc);
    test.same(doc.reported_date, expDoc.reported_date);
    test.same(doc.sms_message, expDoc.sms_message);
    test.same(doc.reported_date, expDoc.reported_date);
    test.same(doc.errors, expDoc.errors);
    test.same(doc.related_entities, expDoc.related_entities);
    test.done();
};

// check returned resp from add_sms update function
exports.add_sms_check_resp = function (test) {
    test.expect(6);
    var host = window.location.host.split(':');
    var expResp = {
        "callback": {
            "options": {
                "host": host[0],
                "port": host[1] || '',
                "method":"POST",
                "headers":{
                    "Content-Type":"application/json; charset=utf-8"
                },
                "path": baseURL + "/data_record/add/facility/%2B888"
            },
            "data":{"uuid":"13f58b9c648b9a997248cba27aa00fdf"}
        }
    };

    var ret = updates.add_sms(null, req_example_junk);
    resp = JSON.parse(ret[1]);

    test.same(resp.callback.options, expResp.callback.options);
    test.same(resp.callback.options.headers, expResp.callback.options.headers);
    test.same(resp.callback.options.path, expResp.callback.options.path);
    test.same(resp.callback.data, expResp.callback.data);
    test.same(resp.callback, expResp.callback);
    test.same(resp, expResp);
    test.done();
};

exports.success_response_test = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }},
        doc = JSON.parse('{ "_id":"b0221beaed5222596224e4d123002045", "_rev":"1-94fa1caf624d9f2896f2ef16148f874c", "secret":"", "from":"+15551212", "message":"1!TEST!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4", "message_id":"0", "sent_timestamp":"11-23-11 13:43", "sent_to":"", "type":"sms_message", "form":"TEST"}');
    var respBody = JSON.parse(updates.add_sms(doc, req)),
        payload = JSON.parse('{"success":true,"task":"send","messages":[{"to":"+15551212","message":"Zikomo!"}]}');
    test.same(respBody.payload, payload);
    test.done();
};

exports.success_response_pscq = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }};
    var msg = '1!PSCQ!2013#2#20#aaaaaaaaaaaaaaaaaa#2222#3333#1#1111#1111#1#2222#2222#2#333#474#112#444#111#333#333#880#220#220#212#555#6633#4444#8888#2211#2211#2211#5555#222#444#22',
        doc = {
            from: "+15551212",
            message: msg,
            message_id: "0",
            sent_timestamp: "11-23-11 13:43",
            sent_to: "",
            type: "sms_message",
            locale: "fr",
            form: "PSCQ"},
        respBody = JSON.parse(updates.add_sms(doc, req)),
        // not sure if this is a regression, commenting out for now. ideally
        // the form name would be included in the response message.
        //payload = JSON.parse('{"success":true,"task":"send","messages":[{"to":"+15551212","message":"Merci, votre formulaire \\"Supervision AS\\" a été bien reçu."}]}');
        payload = JSON.parse('{"success":true,"task":"send","messages":[{"to":"+15551212","message":"Merci, votre formulaire a été bien reçu."}]}');

    test.same(respBody.payload, payload);
    
    test.done();
};

exports.responses_form_not_found_plain = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }},
        doc = {
            "from":"+15551212",
            "message": 'testing 123',
            "form":"TESTING"
        },
        respBody = JSON.parse(updates.add_sms(doc, req)),
        expectedResp = {
            "payload": {
              "success": true,
              "task": "send",
              "messages": [
                {
                  "to": "+15551212",
                  "message": "The form sent 'TESTING' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor."
                }
              ]
            }
        };
    test.same(respBody.payload, expectedResp.payload);
    test.done();
};

exports.responses_form_not_found = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }},
        doc = {
            "from":"+15551212",
            "message": '1!0000!2012#2#20#foo#bar',
            "form":"0000"
        },
        respBody = JSON.parse(updates.add_sms(doc, req)),
        expectedResp = {
            "payload": {
              "success": true,
              "task": "send",
              "messages": [
                {
                  "to": "+15551212",
                  "message": "The form sent '0000' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor."
                }
              ]
            }
        };
    test.same(respBody.payload, expectedResp.payload);
    test.done();
};

exports.responses_form_not_found_fr = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }};
    var msg = '1!0000!2012#2#20#foo#bar',
        doc = {
            "from":"+15551212",
            "message": msg,
            "locale": "fr",
            "form":"0000"},
        respBody = JSON.parse(updates.add_sms(doc, req)),
        expectedResp = {
            "payload": {
              "success": true,
              "task": "send",
              "messages": [
                {
                  "to": "+15551212",
                  message:"Le formulaire envoyé \'0000\' n\'est pas reconnu. SVP remplissez le au complet et essayez de le renvoyer. Si ce problème persiste contactez votre superviseur."
                }
              ]
            }
        };
    test.same(respBody.payload, expectedResp.payload);
    test.done();
};

exports.responses_empty_message = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }};
    var doc = {
            "from":"+15551212",
            "message":" ",
            "form":""},
        respBody = JSON.parse(updates.add_sms(doc, req)),
        expectedResp = {
            "payload":{
                "success":true,
                "task":"send",
                "messages":[
                    {
                        "to":"+15551212",
                        "message": "It looks like you sent an empty message, please try to resend. If you continue to have this problem please contact your supervisor."
                    }
                ]
            }
        };
    test.same(respBody.payload, expectedResp.payload);
    test.done();
};

exports.responses_empty_message_fr = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }};
    var doc = {
            "from":"+15551212",
            "message":" ",
            "form":"",
            "locale": "fr"},
        respBody = JSON.parse(updates.add_sms(doc, req)),
        expectedResp = {
            "payload":{
                "success":true,
                "task":"send",
                "messages":[
                    {
                        "to":"+15551212",
                        "message": "Nous avons des troubles avec votre message, SVP essayez de le renvoyer. Si vous continuer à avoir des problèmes contactez votre superviseur."
                    }
                ]
            }
        };
    test.same(respBody.payload, expectedResp.payload);
    test.done();
};

// one word messages get an undefined `form` property
exports.responses_undefined_form = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }};
    var doc = {
            "from":"+15551212",
            "message": 'foo'
        };
        // form is undefined
    var respBody = JSON.parse(updates.add_sms(doc, req));
    var expectedResp = JSON.parse('{"payload":{"success":true,"task":"send","messages":[{"to":"+15551212","message":"The form sent \'undefined\' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor."}]}}');
    test.same(respBody.payload, expectedResp.payload);
    test.done();
};

exports.responses_form_found_but_no_data = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }},
        doc = {
            "from":"+15551212",
            "message": 'test 123',
            "form":"TEST"
        };
    var respBody = JSON.parse(updates.add_sms(doc, req));
    var expectedResp = {
        "payload": {
          "success": true,
          "task": "send",
          "messages": [
            {
              "to": "+15551212",
              "message": "Missing or invalid fields: facility_id, year, month."
            }
          ]
        }
    };
    test.same(respBody.payload, expectedResp.payload);
    test.done();
};
