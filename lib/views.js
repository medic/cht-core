/**
 * Views to be exported from the design doc.
 */

exports.clinic_by_phone = {
    map: function (doc) {
        if (doc.type === 'clinic') {
            emit([doc.contact.phone], doc);
        }
    }
};

/*
 * Get clinic based on referral id in a tasks_referral doc.
 */
exports.clinic_by_refid = {
    map: function (doc) {
        if (doc.type === 'tasks_referral' && doc.refid) {
            // HACK, rewriter wraps everything in quotes
            emit([String(doc.refid), doc.created], doc.clinic);
        }
    }
};

exports.tasks_pending = {
    map: function (doc) {
        if (doc.type.substr(0,6) === 'tasks_' && doc.state === 'pending') {
            emit([doc.created, doc.refid]);
        }
    }
};
