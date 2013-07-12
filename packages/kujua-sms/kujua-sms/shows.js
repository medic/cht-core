
exports.test_sms_forms = function (doc, req) {
    return {foo:'test'};
};

exports.app_settings = function() {
    return {
        body: JSON.stringify(this.app_settings || {}),
        headers: {
            'Content-Type': 'application/json'
        }
    }
}

