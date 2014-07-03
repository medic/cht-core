var smsparser = require('views/lib/textforms_parser');

var def = {
    meta: {
        code: 'ANCR'
    },
    fields: {
        name: {
            labels: {
                short: 'Name',
                tiny: 'N'
            },
            type: 'string'
        },
        lmp: {
            labels: {
                short: 'LMP',
                tiny: 'LMP'
            },
            type: 'integer'
        },
        somedate: {
            labels: {
                short: 'Date',
                tiny: 'D'
            },
            type: 'date'
        }
    }
};

exports['is compact true'] = function(test) {
    var doc = {
        message: 'sarah 24 2012-03-12'
    };

    test.ok(smsparser.isCompact(def, doc));
    test.done();
};

exports['is compact true when field value starts with field name'] = function(test) {
    var doc = {
        message: 'Norah 24 2012-03-12'
    };

    test.ok(smsparser.isCompact(def, doc));
    test.done();
};

exports['is compact false'] = function(test) {
    var doc = {
        message: 'n sarah lmp 24 d 2012-03-12'
    };

    test.ok(!smsparser.isCompact(def, doc));
    test.done();
};

exports['is compact false when field value starts with number'] = function(test) {
    var doc = {
        message: 'LMP24'
    };

    test.ok(!smsparser.isCompact(def, doc));
    test.done();
};

exports['is compact false when field value absent'] = function(test) {
    var doc = {
        message: 'lmp'
    };

    test.ok(!smsparser.isCompact(def, doc));
    test.done();
};
