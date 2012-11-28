var updates = require('kujua-sms/updates'),
    utils = require('kujua-sms/utils'),
    querystring = require('querystring'),
    fakerequest = require('couch-fakerequest'),
    baseURL = require('duality/core').getBaseURL(),
    host = window.location.host.split(':')[0],
    port = window.location.host.split(':')[1] || '';


//
// check sms response messages to gateway
//
exports.payload_success = function (test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
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


exports.responses_invalid_custom = function (test) {
    test.expect(1);
    var err = {code:"sys.form_invalid_custom", form:"FOO", message:"Arg."};

    var resp = "The form sent '%(form)' was not properly completed. "
        + "Please complete it and resend. If this problem persists "
        + "contact your supervisor."

    test.same(utils.getMessage(err.code.replace('sys.','')), resp);
    test.done();
};

// one word messages get an undefined `form` property
exports.payload_one_word = function (test) {
    test.expect(1);
    var req = {
        headers: { "Host": window.location.host },
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
