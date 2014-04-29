
exports.update_config = function (doc, req) {

    // TODO optimistic locking? eg: check _rev
    // TODO gracefully handle empty doc

    var body = JSON.parse(req.body);

    doc.app_settings.gateway_number = body.gateway_number;

    return [doc, 'done'];

};