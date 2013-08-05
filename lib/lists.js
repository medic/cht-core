
var moment = require('moment'),
    utils = require('kujua-utils');

function can_backup_facilities(userCtx) {
    if (!userCtx) return false;
    return userCtx.roles.indexOf('national_admin') !== -1 ||
           userCtx.roles.indexOf('_admin') !== -1;
};

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
