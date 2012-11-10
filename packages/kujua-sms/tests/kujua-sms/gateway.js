var updates = require('kujua-sms/updates'),
    lists = require('kujua-sms/lists'),
    querystring = require('querystring'),
    fakerequest = require('couch-fakerequest'),
    baseURL = require('duality/core').getBaseURL(),
    host = window.location.host.split(':')[0],
    port = window.location.host.split(':')[1] || '';


// exmaple couchdb update request from smssync
var req_example_junk = {
    headers: {"Host": window.location.host},
    uuid: "13f58b9c648b9a997248cba27aa00fdf",
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
        "responses":[
            {
              "to": "+888",
              "message": "The form sent 'HMM' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor."
            }
        ],
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
    test.expect(7);
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

    var ret = updates.add_sms(null, req_example_junk);
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

exports.data_record_add_facility = function (test) {

    test.expect(1);
    var viewdata = {rows: []};
    var req = {
        headers: {"Host": window.location.host},
        body: JSON.stringify({uuid: "13f58b9c648b9a997248cba27aa00fdf"}),
        method: "POST"
    };
    var resp = fakerequest.list(lists.data_record, viewdata, req);
    var expRespBody = {
        callback:{
            "options":{
                "host": host,
                "port": port,
                "path": baseURL + "/data_record/update/13f58b9c648b9a997248cba27aa00fdf",
                "method":"PUT",
                "headers":{
                    "Content-Type":"application/json; charset=utf-8"
                }
            },
            "data":{
                "related_entities":{},
                "errors":[
                    {
                        "code":"sys.facility_not_found",
                        "message":"Facility not found."
                    }
                ]
            }
        }
    };

    test.same(JSON.stringify(expRespBody), resp.body);
    test.done();
};

exports.payload_success = function (test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            "from":"+888",
            "message":"1!TEST!facility#2012#4#1#222#333#444#555#666#777#888#999#111#222#333#444"
        }
    };
    var resp = JSON.parse(updates.add_sms(null, req)[1]);
    var payload = {
        "success":true,
        "task":"send",
        "messages":[
            {
                "to":"+888",
                "message":"Zikomo!"
            }
        ]
    };
    test.same(resp.payload, payload);
    test.done();
};

exports.payload_form_not_found = function (test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            "from":"+888",
            "message":"foo bar baz"
        }
    };
    var resp = JSON.parse(updates.add_sms(null, req)[1]);
    var payload = {
        "success":true,
        "task":"send",
        "messages":[
            {
                "to":"+888",
                "message": "The form sent 'FOO' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor."
            }
        ]
    };
    test.same(resp.payload, payload);
    test.done();
};

exports.payload_form_not_found_muvuku = function (test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            "from":"+888",
            "message": '1!0000!2012#2#20#foo#bar'
        }
    };
    var resp = JSON.parse(updates.add_sms(null, req)[1]);
    var payload = {
        "success":true,
        "task":"send",
        "messages":[
            {
                "to":"+888",
                "message": "The form sent '0000' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor."
            }
        ]
    };
    test.same(resp.payload, payload);
    test.done();
};

exports.payload_form_not_found_fr = function (test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            "from":"+888",
            "message": '1!0000!2012#2#20#foo#bar'
        },
        query: {
            locale: "fr"
        }
    };
    var resp = JSON.parse(updates.add_sms(null, req)[1]);
    var payload = {
        "success":true,
        "task":"send",
        "messages":[
            {
                "to":"+888",
                "message":"Le formulaire envoyé \'0000\' n\'est pas reconnu. SVP remplissez le au complet et essayez de le renvoyer. Si ce problème persiste contactez votre superviseur."
            }
        ]
    };
    test.same(resp.payload, payload);
    test.done();
};

exports.payload_empty_message = function (test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            "from":"+888",
            "message": ''
        }
    };
    var resp = JSON.parse(updates.add_sms(null, req)[1]);
    var payload = {
        "success":true,
        "task":"send",
        "messages":[
            {
                "to":"+888",
                "message": "It looks like you sent an empty message, please try to resend. If you continue to have this problem please contact your supervisor."
            }
        ]
    };
    test.same(resp.payload, payload);
    test.done();
};

exports.responses_empty_message_fr = function (test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            "from":"+888",
            "message": ''
        },
        query: {
            locale: "fr"
        }
    };
    var resp = JSON.parse(updates.add_sms(null, req)[1]);
    var payload = {
        "success":true,
        "task":"send",
        "messages":[
            {
                "to":"+888",
                "message": "Nous avons des troubles avec votre message, SVP essayez de le renvoyer. Si vous continuer à avoir des problèmes contactez votre superviseur."
            }
        ]
    };
    test.same(resp.payload, payload);
    test.done();
};

// one word messages get an undefined `form` property
exports.payload_one_word = function (test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            "from":"+888",
            "message": 'foo'
        }
    };
    var resp = JSON.parse(updates.add_sms(null, req)[1]);
    var payload = {
        "success":true,
        "task":"send",
        "messages":[
            {
                "to":"+888",
                "message": "SMS message received; it will be reviewed shortly. If you were trying to submit a text form, please enter a correct form code and try again."
            }
        ]
    };
    test.same(resp.payload, payload);
    test.done();
};

exports.payload_missing_fields = function (test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
        uuid: "13f58b9c648b9a997248cba27aa00fdf",
        form: {
            "from":"+888",
            "message": 'test 123',
        }
    };
    var resp = JSON.parse(updates.add_sms(null, req)[1]);
    var payload = {
        "success":true,
        "task":"send",
        "messages":[
            {
                "to":"+888",
                "message": "Missing or invalid fields: facility_id, year, month."
            }
        ]
    };
    test.same(resp.payload, payload);
    test.done();
};
