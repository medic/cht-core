var updates = require('kujua-sms/updates'),
    lists = require('kujua-sms/lists'),
    baseURL = require('duality/core').getBaseURL(),
    appdb = require('duality/core').getDBURL(),
    querystring = require('querystring'),
    jsDump = require('jsDump'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../helpers/helpers');

exports.referral_psms = function (test) {

    // test.expect(10);

    var ref_rc = String(helpers.rand());

    var data = {
        from: '+17085551212',
        message: '',
        sent_timestamp: '1-19-12 18:45',
        sent_to: '+15551212'
    };

    var sms_message = {
       from: "+17085551212",
       message: '',
       sent_timestamp: "1-19-12 18:45",
       sent_to: "+15551212",
       type: "sms_message",
       locale: "en",
       form: "PSMS"
    };

    var form_data = {
    };


    //
    // STEP 1:
    //
    // Run add_sms and expect a callback to add a clinic
    // to a data record which contains all the information
    // from the SMS.
    //
    
    var result = updates.add_sms(null, {
        method: "POST",
        query:{},
        headers: helpers.headers(data),
        body: querystring.stringify(data),
        form: data,
    });

    var doc = result[0];
    var resp = JSON.parse(result[1]);

    test.same(doc, sms_message);

    test.same(resp.callback.options.path, 
        baseURL + "/PSMS/data_record/add/clinic/something");

    test.same(resp.callback.data, {
        "type": "data_record",
    });










    
    //
    // STEP 2:
    //
    // Run data_record/add/clinic and expect a callback to 
    // create the data record.
    //

    var clinic1 = {
        "_id": "4a6399c98ff78ac7da33b639ed60f458",
        "_rev": "1-0b8990a46b81aa4c5d08c4518add3786",
        "type": "clinic",
        "name": "Example clinic 1",
        "contact": {
            "name": "Sam Jones",
            "phone": "+13125551212"
        },
        "parent": {
            "type": "health_center",
            "contact": {
                "name": "Neal Young",
                "phone": "+17085551212"
            },
            "parent": {
                "type": "district_hospital",
                "contact": {
                    "name": "Bernie Mac",
                    "phone": "+14155551212"
                }
            }
        }
    };

    var viewdata = {rows: [
        {
            "key": ["+17085551212"],
            "value": clinic1
        }
    ]};

    var result2 = fakerequest.list(lists.tasks_referral, viewdata, {
        method: "POST",
        query:{form: 'MSBB'},
        headers:{
            "Content-Type":"application/json; charset=utf-8",
            "Host": window.location.host
        },
        body: JSON.stringify(resp.callback.data),
        form: {}
    });

    test.same(result2.headers, {});

    var doc2 = JSON.parse(result2.body);
    test.same(doc2.callback.options, {});

    var messages = [{}];
    var data_record = {};

    test.same(doc2.callback.data, task);



    //
    // STEP 3:
    //
    // Post to the callback and expect a created
    // data record with the correct clinic and data.
    //
    


    test.done();
};
