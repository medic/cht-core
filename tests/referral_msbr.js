var updates = require('lib/updates'),
    querystring = require('querystring'),
    lists = require('lib/lists');


exports.setUp = function (callback) {
    this.getRow_orig = getRow;
    callback();
};

exports.tearDown = function (callback) {
    getRow = this.getRow_orig;
    callback();
};

exports.referral_msbr = function (test) {

    test.expect(11);

    var rand = function(from, to) {
        from = from || 10000000000;
        to = to || 99999999999;
        return Math.floor(Math.random() * (to - from + 1) + from);
    };

    // random ref_rc for better test data
    var ref_rc = rand();

    var data = {
        from: '+13125551212', // clinic.contact.phone
        message: '1!MSBR!2012#1#24#' + ref_rc +
                 '#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        sent_timestamp: '1-19-12 18:45',
        sent_to: '+15551212',
        foo: 'bar' // extra is ok
    };

    var result = updates.add_sms(null, {
        method: "POST",
        query:{},
        headers:{
            "Content-Length": querystring.stringify(data).length,
            "Content-Type":"application/x-www-form-urlencoded",
            "Host": window.location.host
        },
        body: querystring.stringify(data),
        form: data,
    });

    var doc = result[0];
    var resp = JSON.parse(result[1]);

    // delete volatile properties
    delete doc.sent_timestamp;

    test.same(doc, {
        "from": "+13125551212",
        "message": "1!MSBR!2012#1#24#"+ ref_rc +"#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        //"sent_timestamp": "1-19-12 18:45",
        "sent_to": "+15551212",
        "foo": "bar",
        "type": "sms_message",
        "locale": "en",
        "form": "MSBR"
    });


    test.same(resp.payload.success, true);
    test.same(resp.payload.messages[0].to, "+13125551212");
    test.same(resp.callback.options.host, window.location.hostname);
    test.same(resp.callback.options.port, window.location.port);
    test.same(resp.callback.data.from, '+13125551212');
    test.same(resp.callback.data.to, '');
    test.same(resp.callback.data.state, '');
    test.same(resp.callback.data.form, 'MSBR');
    test.same(resp.callback.data.refid, ref_rc);
    test.same(resp.callback.data.clinic, null);

    // redefine global getRow to mock list function
    getRow = function() {
        return {
            "key": ["+13125551212"],
            "value": {
                "_id": "4a6399c98ff78ac7da33b639ed60f458",
                "_rev": "1-0b8990a46b81aa4c5d08c4518add3786",
                "type": "clinic",
                "name": "Example clinic 1",
                "contact": {
                    "name": "Sam Jones",
                    "phone": "+13125551212"}}};
    };

    // step 2 call task_referral list function to add clinic data and construct
    // last callback.
    var result2 = lists.tasks_referral(null, {
        method: "POST",
        query:{},
        headers:{
            "Content-Length": querystring.stringify(resp.callback.data).length,
            "Content-Type":"application/json; charset=utf-8",
            "Host": window.location.host
        },
        body: querystring.stringify(resp.callback.data),
        form: {}
    });

    console.log("result2");
    console.log(result2);
    var doc2 = result2[0];
    //var resp2 = JSON.parse(result2[1]);

    // TODO Step 2 assertions

    // Step 3 The finalized doc is POSTed/saved
    // Step 4 Another request polls the db for tasks_referral documents that
    // are pending. messages get sent
    // Step 5 Bulk db update to update the 'state' field to 'complete'
    // http post to _bulk_docs

    test.done();
};
