var _ = require('underscore');

/**
 * Update clinic data on new data records, use refid for clinic lookup otherwise
 * phone number.
 *
 * Also update phone number on clinic data when phone number is different. We
 * try to keep the phone number updated so when we setup reminders we have a
 * good place to get phone numbers from.
 */
module.exports = {
  required_fields: 'form related_entities !related_entities.clinic',
  onMatch: function(change) {
    var doc = change.doc
        , q = { key:[doc.from], limit: 1}
        , view = 'clinic_by_phone'
        , self = this;

    if (!doc.refid && !doc.from) {
        self.complete(null, false);
        return;
    }

    // use reference id to find clinic if defined
    if (doc.refid) {
        view = 'clinic_by_refid';
        q = {key:[doc.refid], limit: 1};
    }

    self.db.view('kujua-sentinel', view, q, function(err, data) {

        if (err) {
            self.complete(err);
            return;
        }

        var row = _.first(data.rows),
            clinic = row && row.value,
            existing = doc.related_entities.clinic || {};

        if (!clinic) {
            self.complete(null, false);
            return;
        }

        // reporting phone stayed the same and clinic data is up to date
        if (doc.from === clinic.contact.phone &&
            clinic._id === existing._id &&
            clinic._rev === existing._rev) {
                self.complete(null, false);
                return;
        }

        clinic.contact.phone = doc.from;
        doc.related_entities.clinic = clinic;
        self.db.saveDoc(clinic, function(err, ok) {
          if (err) {
              console.error(JSON.stringify(err,null,2));
              //not sure why this throws, but causes sentinel to die, bad.
              //self.complete(err);
              return;
          } else {
                // remove facility not found errors
                var new_errors = [];
                for (var i in doc.errors) {
                    var e = doc.errors[i];
                    if (e.code !== 'facility_not_found')
                        new_errors.push(e);
                }
                doc.errors = new_errors;
                doc.related_entities.clinic._id = ok.id;
                doc.related_entities.clinic._rev = ok.rev;
                self.complete(null, doc);
                return;
          }
        });

    });

  }
}
