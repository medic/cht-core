
var moment = require('moment'),
    utils = require('kujua-utils');

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

exports.facilities_select2 = function(head, req) {
    start({code: 200, headers: {
        'Content-Type': 'text/json; charset=utf-8'
    }});
    row = getRow();

    if (!row) {
        return send('[]');
    }
    // create array of facilities as valid JSON output, no comma at end.  also
    // format nicely incase someone wants to modify it and re-upload.
    send('[');
    send('   { "text": "'+ row.value.name +'", "id": "' + row.id +'"   }');
    while (row = getRow()) {
        send(',\n');
        send('  { "text": "'+ row.value.name +'", "id": "' + row.id +'"   }');
    }
    send(']');

}
