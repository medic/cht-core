var data_record = require('lib/data_records');

exports.countCharUpdatesNote = function(test) {
    var modal = $('<div class="modal"><div class="modal-footer"><div class="note"/></div></div>'),
        // value 110 chars long
        message = $('<input value="abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij"/>');

    data_record.countChars(message, modal);
    test.equals(modal.find('.note').html(), '110 characters');
    test.done();
};

