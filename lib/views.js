/**
 * Views to be exported from the design doc.
 */

exports.sms_message_values = {
    map: function (doc) {
        var smsparser = require('views/lib/smsparser');
            smsforms = require('views/lib/smsforms');

        if (doc.type === 'sms_message' && doc.message) {
            var name = doc.message.split('#')[0];
            if (!name) {
                return;
            }
            var def = smsforms[name];
            if (def) {
                emit([name, doc.ctime], smsparser.parseArray(def, doc.message));
            }
        }
    },
    reduce: function (keys, values, rereduce) {
        // require() has not been implemented in reduce functions yet, so I
        // have to paste this function inline
        function arrayToCSV (arr) {
            var rows = [];
            for (var r = 0; r < arr.length; r++) {
                var row = arr[r];
                var vals = [];
                for (var v = 0; v < row.length; v++) {
                    var val = row[v];
                    if (typeof val === 'string' &&
                        (val.indexOf(',') !== -1 || val.indexOf('"') !== -1)) {
                        vals.push('"' + val.replace(/"/g, '""') + '"');
                    }
                    else {
                        vals.push(val);
                    }
                }
                rows.push(vals.join(','));
            }
            return rows.join('\n');
        };
        if (rereduce) {
            return values.join('\n');
        }
        return arrayToCSV(values);
    }
};
