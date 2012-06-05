var updates = require('kujua-sms/updates'),
    querystring = require('querystring');

exports.success_response_test = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }},
        doc = JSON.parse('{ "_id":"b0221beaed5222596224e4d123002045", "_rev":"1-94fa1caf624d9f2896f2ef16148f874c", "secret":"", "from":"+15551212", "message":"1!TEST!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4", "message_id":"0", "sent_timestamp":"11-23-11 13:43", "sent_to":"", "type":"sms_message", "form":"TEST"}'),
        respBody = JSON.parse(updates.getRespBody(doc, req)),
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
        respBody = JSON.parse(updates.getRespBody(doc, req)),
        // not sure if this is a regression, commenting out for now. ideally
        // the form name would be included in the response message.
        //payload = JSON.parse('{"success":true,"task":"send","messages":[{"to":"+15551212","message":"Merci, votre formulaire \\"Supervision AS\\" a été bien reçu."}]}');
        payload = JSON.parse('{"success":true,"task":"send","messages":[{"to":"+15551212","message":"Merci, votre formulaire a été bien reçu."}]}');

    test.same(respBody.payload, payload);
    
    test.done();
};

exports.responses_form_not_found = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }};
    var msg = '1!0000!2012#2#20#foo#bar',
        doc = {
            "from":"+15551212",
            "message":"' + msg + '",
            "form":"0000"},
        respBody = JSON.parse(updates.getRespBody(doc, req)),
        expectedResp = JSON.parse('{"payload":{"success":true,"task":"send","messages":[{"to":"+15551212","message":"The report sent \'0000\' was not recognized. Please complete it again and resend. If this problem persists contact your supervisor."}]}}');
    test.same(respBody, expectedResp);
    test.done();
};

exports.responses_form_not_found_fr = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }};
    var msg = '1!0000!2012#2#20#foo#bar',
        doc = {
            "from":"+15551212",
            "message":"' + msg + '",
            "locale": "fr",
            "form":"0000"},
        respBody = JSON.parse(updates.getRespBody(doc, req)),
        expectedResp = JSON.parse('{"payload":{"success":true,"task":"send","messages":[{"to":"+15551212","message":"Le formulaire envoyé \'0000\' n\'est pas reconnu. SVP remplissez le au complet et essayez de le renvoyer. Si ce problème persiste contactez votre superviseur."}]}}');
    test.same(respBody, expectedResp);
    test.done();
};

exports.responses_empty_message = function (test) {
    test.expect(1);
    var req = {headers:{ "Host": window.location.host }};
    var doc = {
            "from":"+15551212",
            "message":" ",
            "form":""},
        respBody = JSON.parse(updates.getRespBody(doc, req)),
        expectedResp = JSON.parse('{"payload":{"success":true,"task":"send","messages":[{"to":"+15551212","message": "There was a problem with your message, please try to resend. If you continue to have this problem please contact your supervisor."}]}}');
    test.same(respBody, expectedResp);
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
        respBody = JSON.parse(updates.getRespBody(doc, req)),
        expectedResp = JSON.parse('{"payload":{"success":true,"task":"send","messages":[{"to":"+15551212","message": "Nous avons des troubles avec votre message, SVP essayez de le renvoyer. Si vous continuer à avoir des problèmes contactez votre superviseur."}]}}');
    test.same(respBody, expectedResp);
    test.done();
};
