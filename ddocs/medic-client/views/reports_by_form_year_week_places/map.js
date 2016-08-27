// data record must adhere to property name of `week` or `week_number`
function(doc) {
  if (doc.type !== 'data_record') {
    return;
  }

  if (!doc.form || !doc.fields) {
    return;
  }

  if (!doc.fields.week_number && !doc.fields.week) {
    return;
  }

  var getParent = function(facility, type) {
    while (facility && facility.type !== type) {
      facility = facility.parent;
    }
    return facility;
  };

  /*
   * return array of facilities related to record. always order array by highest
   * level positioned first.  e.g. [dh, hc, clinic]
   */
  var getFacilitiesList = function(doc) {
    return [
      getParent(doc.contact, 'district_hospital') || {},
      getParent(doc.contact, 'health_center') || {},
      getParent(doc.contact, 'clinic') || {}
    ];
  };

  /**
   * Return name of reporter.  Takes list of facility objects and a phone number
   * and returns contact name or undefined.
   *
   * @name getReporterName(facilities, phone)
   * @param {Array} facilities
   * @param {String} phone
   * @api private
   */
  var getReporterName = function(facilities, phone) {
    if (!phone || facilities.length === 0) {
        return;
    }
    if (facilities[0] && facilities[0].contact) {
      return facilities[0].contact.name;
    }
    return;
  };

  var facilities = getFacilitiesList(doc),
      dh = facilities[0],
      hc = facilities[1],
      cl = facilities[2],
      year = parseInt(doc.fields.year, 10),
      week_number = parseInt(doc.fields.week_number || doc.fields.week, 10),
      is_valid = (doc.errors && doc.errors.length === 0);

  var key = [ doc.form, year, week_number, dh._id, hc._id, cl._id ];

  emit(key, {
    district_hospital: dh.name,
    health_center: hc.name,
    clinic: cl.name,
    // reverse to search bottom up for name
    reporter: getReporterName(facilities.reverse(), doc.from),
    reporting_phone: doc.from,
    is_valid: is_valid,
    week_number: week_number
  });
}
