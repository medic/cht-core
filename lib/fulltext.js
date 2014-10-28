exports.data_records = {
    index: function(doc) {

        if (doc.type !== 'data_record') {
            return null;
        }
        
        var ret = new Document(),
            skip = ['type', '_rev', 'refid', 'id'],
            date,
            type;

        // index form fields and _id
        for (var key in doc) {
            if (skip.indexOf(key) !== -1) {
                continue;
            }
            // if field key ends in _date, try to parse as date.
            if (/_date$/.test(key)) {
                date = new Date(doc[key]);
                if (date) {
                    ret.add(date, { field: key, type: 'date' });
                } else {
                    log.info('failed to parse date "' + key + '" on ' + doc._id);
                }
            } else if (typeof doc[key] === 'number') {
                ret.add(doc[key], { field: key, type: 'int' });
            } else if (typeof doc[key] === 'string') {
                ret.add(doc[key]);
                ret.add(doc[key], { 
                    field: key === '_id' ? 'uuid' : key
                });
            }
        }

        if (doc.form) {
            type = 'report';
        } else if (doc.kujua_message) {
            type = 'messageoutgoing';
            if (doc.tasks && doc.tasks[0]) {
                ret.add(doc.tasks[0].state, { field: 'state' });
            }
        } else {
            type = 'messageincoming';
        }

        ret.add(type, { field: 'type' });

        ret.add(
            doc.errors.length,
            { field: 'errors', type: 'int' }
        );

        ret.add(doc.verified ? 'true' : 'false', { field: 'verified' });

        if (doc.related_entities.clinic &&
            doc.related_entities.clinic._id) {
                ret.add(
                    doc.related_entities.clinic._id,
                    { field: 'clinic' }
                );
        }

        // district is needed to verify search is authorized
        if (doc.related_entities.clinic &&
            doc.related_entities.clinic.parent &&
            doc.related_entities.clinic.parent.parent &&
            doc.related_entities.clinic.parent.parent._id) {
                ret.add(
                    doc.related_entities.clinic.parent.parent._id,
                    { field: 'district' }
                );
        } else {
            ret.add('none', { field: 'district' });
        }
        return ret;
    }
};
