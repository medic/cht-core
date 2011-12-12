var updates = require('lib/updates');

exports.success_response_psms = function (test) {
    test.expect(1);
    var doc = JSON.parse('{ "_id":"b0221beaed5222596224e4d123002045", "_rev":"1-94fa1caf624d9f2896f2ef16148f874c", "secret":"", "from":"+15551212", "message":"1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4", "message_id":"0", "sent_timestamp":"11-23-11 13:43", "sent_to":"", "type":"sms_message", "form":"PSMS"}');
    var respBody = JSON.parse(updates.getRespBody(doc));
    var expectedResp = JSON.parse('{"payload":{"success":true,"task":"send","messages":[{"to":"+15551212","message":"Zikomo!"}]}}');
    test.same(respBody, expectedResp);
    test.done();
};

exports.success_response_pscm = function (test) {
    test.expect(1);
    var msg = '1!PSCM!2012#12#20#aaaaaaaaaaaaaaaaaa#dddddddddddd#gggggggggggggggggggg#1#333#111#222#333#444#555#666#777#888#999#111#222#333#444#555#665#221#774#445#111';
    var doc = JSON.parse('{ "_id":"b0221beaed5222596224e4d123002045", "_rev":"1-94fa1caf624d9f2896f2ef16148f874c", "secret":"", "from":"+15551212", "message":"' + msg + '", "message_id":"0", "sent_timestamp":"11-23-11 13:43", "sent_to":"", "type":"sms_message", "form":"PSCM"}');
    var respBody = JSON.parse(updates.getRespBody(doc));
    var expectedResp = JSON.parse('{"payload":{"success":true,"task":"send","messages":[{"to":"+15551212","message":"Merci, votre formulaire a été bien reçu."}]}}');
    test.same(respBody, expectedResp);
    test.done();
};
