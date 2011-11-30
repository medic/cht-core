var updates = require('lib/updates');

exports.success_response = function (test) {
    test.expect(1);
    var doc = JSON.parse('{ "_id":"b0221beaed5222596224e4d123002045", "_rev":"1-94fa1caf624d9f2896f2ef16148f874c", "secret":"", "from":"+15551212", "message":"PSMS#facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4", "message_id":"0", "sent_timestamp":"11-23-11 13:43", "sent_to":"", "type":"sms_message"}');
    var respBody = JSON.parse(updates.getRespBody(doc));
    console.log(['body is ',respBody]);
    var expectedResp = JSON.parse('{"payload":{"success":true,"task":"send","messages":[{"to":"+15551212","message":"Data received."}]}}');
    test.same(respBody, expectedResp);
    test.done();
};
