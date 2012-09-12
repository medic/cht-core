
exports.facilities_by_type = {
    map: function (doc) {
        if (doc.type === 'clinic' ||
            doc.type === 'health_center' ||
            doc.type === 'district_hospital' ||
            doc.type === 'national_office') {
                emit([doc.type, doc._id, doc.name], 1);
        }
    },
    reduce: function(keys, values) {
        return true;
    }
};

exports.facilities_by_parent = {
    map: function (doc) {
        if (doc.type === 'clinic' ||
            doc.type === 'health_center' ||
            doc.type === 'district_hospital' ||
            doc.type === 'national_office') {

            var pid = doc.parent ? doc.parent._id : null;
            emit([doc.type, pid, doc.name], {name: doc.name});
        }
    }
};

exports.total_clinics_by_facility = {
    map: function (doc) {
        if (doc.type === 'clinic') {
            var dh_id = doc.parent.parent._id;
            var hc_id = doc.parent._id;
            var dh_name = doc.parent.parent.name;
            var hc_name = doc.parent.name;
            emit([dh_id, hc_id, doc._id, dh_name, hc_name, doc.name], 1);
        }
    },
    reduce: function (keys, values, rereduce) {
        return sum(values);
    }
};

//
// data record must adhere to property name of `week` or `week_number`
//
exports.data_records_by_form_year_week_facility = {
    map: function (doc) {

        if (doc.type && !doc.type.match(/data_record/))
            return;

        if (!(doc.week_number || doc.week || doc.form))
            return;

        var utils = require('views/lib/kujua-reporting'),
            facilities = utils.getFacilitiesList(doc),
            dh = facilities[0],
            hc = facilities[1],
            cl = facilities[2],
            week_number = doc.week_number || doc.week, // hackish?
            key = [doc.form, doc.year, week_number, dh._id, hc._id, cl._id],
            is_valid = (doc.errors && doc.errors.length === 0);

        emit(key, {
            district_hospital: dh.name,
            health_center: hc.name,
            clinic: cl.name,
            // reverse to search bottom up for name
            reporter: utils.getReporterName(facilities.reverse(), doc.from),
            reporting_phone: doc.from,
            is_valid: is_valid,
            week_number: week_number
        });
    }
};

//
// data record must adhere to property name of `month`
//
exports.data_records_by_form_year_month_facility = {
    map: function (doc) {

        if (doc.type && !doc.type.match(/data_record/))
            return;

        if (!doc.month || !doc.form)
            return;

        var utils = require('views/lib/kujua-reporting'),
            facilities = utils.getFacilitiesList(doc),
            dh = facilities[0],
            hc = facilities[1],
            cl = facilities[2],
            key = [doc.form, doc.year, doc.month, dh._id, hc._id, cl._id];

        emit(
            key,
            {
                district_hospital: dh.name,
                health_center: hc.name,
                clinic: cl.name,
                reporter: utils.getReporterName(facilities.reverse(), doc.from),
                reporting_phone: doc.from,
                is_valid: doc.is_valid,
                month: doc.month
            }
        );
    }
};
