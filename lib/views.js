exports.facilities = {
    map: function (doc) {
        if (doc.type === 'clinic' ||
            doc.type === 'health_center' ||
            doc.type === 'district_hospital' ||
            doc.type === 'national_office') {

            emit([doc.type, doc.name], {type: doc.type, name: doc.name});
        }
    }
};

exports.facilities_by_district = {
    map: function (doc) {
        if (doc.type === 'clinic') {
            emit(
                [doc.parent.parent.name.toLowerCase(), doc.type, doc.name],
                {type: doc.type, name: doc.name}
            );
        }
        else if (doc.type === 'health_center') {
            emit(
                [doc.parent.name.toLowerCase(), doc.type, doc.name],
                {type: doc.type, name: doc.name}
            );
        }
    }
};
