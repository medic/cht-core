exports.facilities = {
    map: function (doc) {
        if (doc.type === 'clinic' ||
            doc.type === 'health_center' ||
            doc.type === 'district_hospital' ||
            doc.type === 'national_office') {

            emit(
                [doc.type, doc.name],
                {type: doc.type, name: doc.name, _rev: doc._rev});
        }
    }
};

exports.facilities_by_district = {
    map: function (doc) {
        if (doc.type === 'clinic' && doc.parent && doc.parent.parent) {
            emit(
                [doc.parent.parent.name.toLowerCase(), doc.type, doc.name],
                {type: doc.type, name: doc.name, _rev: doc._rev}
            );
        }
        else if (doc.type === 'health_center' && doc.parent) {
            emit(
                [doc.parent.name.toLowerCase(), doc.type, doc.name],
                {type: doc.type, name: doc.name, _rev: doc._rev}
            );
        } else if (doc.type === 'district_hospital') {
            emit(
                [doc.name.toLowerCase(), doc.type, doc.name],
                {type: doc.type, name: doc.name, _rev: doc._rev}
            );
        }
    }
};
