
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
            var dh = doc.parent ? doc.parent.parent : undefined,
                dh_id = dh ? dh._id : undefined,
                dh_name = dh ? dh.name : undefined,
                hc_id = doc.parent ? doc.parent._id : undefined,
                hc_name = doc.parent ? doc.parent.name : undefined,
                cl_name = doc.name,
                phone = doc.contact && doc.contact.phone;

            if (!cl_name) {
                cl_name = doc.contact ? doc.contact.rc_code : undefined;
            }
            emit([dh_id, hc_id, doc._id, dh_name, hc_name, cl_name, phone], 1);
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

        if (!(doc.week_number || doc.week) || !doc.form)
            return;

        var utils = require('views/lib/kujua-reporting'),
            facilities = utils.getFacilitiesList(doc),
            dh = facilities[0],
            hc = facilities[1],
            cl = facilities[2],
            week_number = parseInt(doc.week_number || doc.week, 10),
            is_valid = (doc.errors && doc.errors.length === 0);

        var key = [
            doc.form,
            parseInt(doc.year, 10),
            week_number,
            dh._id,
            hc._id,
            cl._id
        ];

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
            is_valid = (doc.errors && doc.errors.length === 0);

        var key = [
            doc.form,
            parseInt(doc.year, 10),
            parseInt(doc.month, 10),
            dh._id,
            hc._id,
            cl._id
        ];

        emit(
            key,
            {
                district_hospital: dh.name,
                health_center: hc.name,
                clinic: cl.name,
                reporter: utils.getReporterName(facilities.reverse(), doc.from),
                reporting_phone: doc.from,
                is_valid: is_valid,
                month: parseInt(doc.month, 10)
            }
        );
    }
};
