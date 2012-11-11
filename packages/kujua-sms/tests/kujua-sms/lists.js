var lists = require('kujua-sms/lists'),
    fakerequest = require('couch-fakerequest'),
    baseURL = require('duality/core').getBaseURL(),
    host = window.location.host.split(':')[0],
    port = window.location.host.split(':')[1] || '';

var uuid = "13f58b9c648b9a997248cba27aa00fdf";

var clinic = {
    "type": "clinic",
    "name": "example clinic 1",
    "contact": {
        "name": "sam jones",
        "phone": "+13125551212"
    },
    "parent": {
        "type": "health_center",
        "contact": {
            "name": "neal young",
            "phone": "+17085551212"
        },
        "parent": {
            "type": "district_hospital",
            "contact": {
                "name": "bernie mac",
                "phone": "+14155551212"
            }
        }
    }
};

exports.data_record_facility_not_found = function (test) {

    test.expect(1);
    var viewdata = {rows: []};

    var req = {
        headers: {"Host": window.location.host},
        body: JSON.stringify({uuid: uuid})
    };
    var resp = fakerequest.list(lists.data_record, viewdata, req);
    var expRespBody = {
        callback:{
            "options":{
                "host": host,
                "port": port,
                "path": baseURL + "/data_record/update/" + uuid,
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

exports.data_record_facility_found = function (test) {

    test.expect(1);
    var viewdata = {rows: [
        {
            "key": ["+13125551212"],
            "value": clinic
        }
    ]};
    var req = {
        headers: {"Host": window.location.host},
        body: JSON.stringify({uuid: uuid})
    };
    var resp = fakerequest.list(lists.data_record, viewdata, req);
    var expectedBody = {
        callback:{
            "options":{
                "host": host,
                "port": port,
                "path": baseURL  + "/data_record/update/" + uuid,
                "method":"PUT",
                "headers":{
                    "Content-Type":"application/json; charset=utf-8"
                }
            },
            // clinic is defined, errors are empty
            "data":{
                "related_entities":{
                    clinic: clinic
                }
            }
        }
    };

    test.same(JSON.stringify(expectedBody), resp.body);
    test.done();
};

exports.tasks_pending_callback = function(test) {
    test.expect(3);
    var req = {
        headers: {"Host": window.location.host}
    };

    var tasks = [{
      "state": "pending",
      "messages": [
        {
          "to": "+123",
          "message": "Bam"
        }
      ]
    }];

    var viewdata = {
        rows: [
            {
                "doc": { _id: '0b5586', tasks: tasks }
            }
        ]
    };

    var expResp = {};
    expResp.callback = {
        options:{
            "host":"localhost",
            "port":"5984",
            "path": baseURL + "/_db/_bulk_docs",
            "method":"POST",
            "headers":{
                "Content-Type":"application/json; charset=utf-8"
            }
        },
        data:{
            "docs":[{
                _id: '0b5586',
                tasks:[{
                    "state":"sent",
                    "messages":[
                        {
                            "to": "+123",
                            "message": "Bam"
                        }
                    ]
                }]
            }]
        }
    };

    var resp = fakerequest.list(lists.tasks_pending, viewdata, req);
    var resp_body = JSON.parse(resp.body);

    // remove timestamp for this test
    delete resp_body.callback.data.docs[0].tasks[0].timestamp;

    test.same(expResp.callback.data, resp_body.callback.data);
    test.same(expResp.callback.options, resp_body.callback.options);
    test.same(expResp.callback, resp_body.callback);
    test.done();
};

exports.tasks_pending_payload = function(test) {

    test.expect(1);
    var req = {
        headers: {"Host": window.location.host}
    };

    var expResp = {};

    expResp.payload = {
        "success":true,
        "task":"send",
        "secret":"",
        "messages":[
            {
                "to":"+333",
                "message":"Bar"
            }
        ]
    };

    var tasks = [
        {
          "state": "pending",
          "messages": [
            {
              "to": "+333",
              "message": "Bar"
            }
          ]
        }
    ];

    var viewdata = {
        rows: [{
            "doc": { _id: '0b5586', tasks: tasks }
        }]
    };

    var resp = fakerequest.list(lists.tasks_pending, viewdata, req);
    var resp_body = JSON.parse(resp.body);

    test.same(expResp.payload, resp_body.payload);
    test.done();
};

exports.data_records_merge = function(test) {

    var req = {
        headers: {"Host": window.location.host},
        form: 'TEST'
    };

    var viewdata = {rows: [
        {
            key: ["%2B13125551212", "2", "777399c98ff78ac7da33b639ed60f422"],
            value: {
                _id: "777399c98ff78ac7da33b639ed60f422",
                _rev: "484399c98ff78ac7da33b639ed60f923",
                facility_id: "a",
                year: "b"
            }
        }
    ]};

    var resp = fakerequest.list(lists.data_record_merge, viewdata, req);
    var resp_body = JSON.parse(resp.body);

    test.same(
        resp_body.callback.data._rev,
        "484399c98ff78ac7da33b639ed60f923");

    test.same(
        resp_body.callback.options.path,
        appdb + "/777399c98ff78ac7da33b639ed60f422");

    test.same(
        resp_body.callback.options.method,
        "PUT");

    test.same(
        resp_body.callback.data.tasks,
        [
            {
                "state":"pending",
                "messages":[
                    {
                        "to":"+14155551212",
                        "message":"Health Facility Identifier: a, Report Year: null, Report Month: null, Misoprostol?: null, LA 6x1: Dispensed total: null, LA 6x2: Dispensed total: null"
                    }
                ]
            }
        ]
    );

    test.same(resp_body.callback.data.errors[0],
        {
            code: "missing_fields",
            fields: ["year","month"],
            message: "Missing or invalid fields: year, month."
        }
    );

    var body = JSON.parse(req.body);
    body.errors = [];
    body.bar = 5;
    req.body = JSON.stringify(body);

    var viewdata = {rows: [
        {
            key: ["%2B13125551212", "2", "777399c98ff78ac7da33b639ed60f422"],
            value: {
                _id: "777399c98ff78ac7da33b639ed60f422",
                _rev: "484399c98ff78ac7da33b639ed60f923",
                facility_id: "a",
                errors: [{code: "missing_fields", fields: ['year']}]
            }
        }
    ]};

    var resp = fakerequest.list(lists.data_record_merge, viewdata, req);
    var resp_body = JSON.parse(resp.body);

    test.same(resp_body.callback.data.errors, []);
    test.same(resp_body.callback.data.bar, 5);

    test.done();
};
