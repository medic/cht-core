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
