var updates = require('lib/updates');

exports.success_response_pscq = function (test) {
    test.expect(1);
    var doc = JSON.parse('{ "_id":"b0221beaed5222596224e4d123002045", "_rev":"1-94fa1caf624d9f2896f2ef16148f874c", "secret":"", "from":"+15551212", "message":"1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4", "message_id":"0", "sent_timestamp":"11-23-11 13:43", "sent_to":"", "type":"sms_message", "form":"PSMS"}');
    var respBody = JSON.parse(updates.getRespBody(doc));
    var expectedResp = JSON.parse('{"payload":{"success":true,"task":"send","messages":[{"to":"+15551212","message":"Zikomo!"}]}}');
    test.same(respBody, expectedResp);
    test.done();
};

exports.success_response_pscq = function (test) {
    test.expect(1);
    var msg = '1!PSCQ!2013#2#20#aaaaaaaaaaaaaaaaaa#2222#3333#1#1111#1111#1#2222#2222#2#333#474#112#444#111#333#333#880#220#220#212#555#6633#4444#8888#2211#2211#2211#5555#222#444#22'
    var doc = JSON.parse('{ "_id":"b0221beaed5222596224e4d123002045", "_rev":"1-94fa1caf624d9f2896f2ef16148f874c", "secret":"", "from":"+15551212", "message":"' + msg + '", "message_id":"0", "sent_timestamp":"11-23-11 13:43", "sent_to":"", "type":"sms_message", "form":"PSCQ"}');
    var respBody = JSON.parse(updates.getRespBody(doc));
    var expectedResp = JSON.parse('{"payload":{"success":true,"task":"send","messages":[{"to":"+15551212","message":"Merci, votre formulaire \\"Supervision AS\\" a été bien reçu."}]}}');
    test.same(respBody, expectedResp);
    
    test.done();
};
