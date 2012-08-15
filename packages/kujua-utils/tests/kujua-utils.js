var utils = require('kujua-utils');

exports['titleize'] = function(test) {
    test.strictEqual(
        utils.titleize('outbreak_report_cdc_nepal'),
        'Outbreak Report Cdc Nepal'
    );
    test.done();
};
