var data_record = require('lib/data_records');

exports.countCharUpdatesNote = function(test) {
    var modal = $('<div class="modal"><div class="modal-footer"><div class="note"/></div></div>'),
        // value 110 chars long
        message = $('<input value="abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij"/>');

    data_record.countChars(message, modal);
    test.equals(modal.find('.note').html(), '110 characters');
    test.done();
};

exports.checkMessageDocDoesNotChangeExistingDoc = function(test) {
    var existing = {
        x: 123
    };

    data_record.checkMessageDoc(existing, {
        id: 'x'
    }, function(doc) {
        test.strictEqual(existing, doc);
        test.done();
    });
};
exports.checkMessageDocHandlesMissingDoc = function(test) {
    // stub
    data_record.setDb({
        getDoc: function(id, callback) {
            callback(null, {});
        }
    });
    data_record.user = {
        name: 'xxx',
        phone: '+1234567890'
    };

    data_record.checkMessageDoc(null, {
        id: 'x'
    }, function(doc) {
        test.ok(doc);
        test.equals(doc.sent_by, 'xxx');
        test.equals(doc.from, data_record.user.phone);
        test.equals(doc.kujua_message, true);
        test.equals(doc.form, null);
        test.done();
    });
}
