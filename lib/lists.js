
var moment = require('moment'),
    utils = require('kujua-utils'),
    sms_utils = require('kujua-sms/utils');

exports.facilities_backup = function (head, req) {

    if (!utils.hasPerm(req.userCtx, 'can_backup_facilities')) {
        log('facilities backup sending 403');
        start({code: 403});
        return send('');
    }

    var date = moment().format('YYYYMMDDHHmm'),
        filename = 'facilities-' + date + '.json',
        row;

    start({code: 200, headers: {
        'Content-Type': 'text/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename=' + filename
    }});

    row = getRow();

    if (!row) {
        return send('[]');
    }

    // create array of facilities as valid JSON output, no comma at end.  also
    // format nicely incase someone wants to modify it and re-upload.
    send('[');
    send(JSON.stringify(row.doc, null, 2));
    while (row = getRow()) {
        send(',\n');
        send(JSON.stringify(row.doc, null, 2));
    }
    send(']');
};

exports.data_records = function (head, req) {

    var first = true;
    function sendRow(doc) {
        if (doc) {
            if (!first) {
                send(',\n');
            }
            first = false;
            send(JSON.stringify(sms_utils.makeDataRecordReadable(doc), null, 2));
        }
    }

    var date = moment().format('YYYYMMDDHHmm'),
        row;

    start({code: 200});

    row = getRow();

    if (!row) {
        return send('[]');
    }

    // var appinfo = require('views/lib/appinfo');

    // var info = appinfo.getAppInfo.call(this, req);

    // create array of facilities as valid JSON output, no comma at end.  also
    // format nicely incase someone wants to modify it and re-upload.
    send('[');
    sendRow(row.doc);
    while (row = getRow()) {
        sendRow(row.doc);
    }
    send(']');
};

