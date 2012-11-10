var lists = require('kujua-sms/lists'),
    baseURL = require('duality/core').getBaseURL(),
    host = window.location.host.split(':')[0],
    port = window.location.host.split(':')[1] || '';

exports.data_record_facility_not_found = function (test) {

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
