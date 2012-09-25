module.exports = {
  map: function(doc) {
    var phone,
        refid;
    if (doc.form && doc.week_number && doc.year) {
      phone = doc.related_entities && doc.related_entities.clinic && doc.related_entities.clinic.contact &&
        doc.related_entities.clinic.contact.phone;
      refid = doc.related_entities && doc.related_entities.clinic && doc.related_entities.clinic.contact &&
        doc.related_entities.clinic.contact.rc_code;
      if (phone) {
        emit([doc.form, doc.year, doc.week_number, refid], {
          received: true
        });
      }
    } else if (doc.type === 'weekly_reminder' && doc.related_form && doc.week && doc.year) {
      emit([doc.related_form, doc.year, doc.week, doc.refid], {
        sent: doc.day
      });
    }
  },
  reduce: function(keys, values) {
    var result = {
      received: false,
      sent: []
    };
    values.forEach(function(value) {
      if (value.sent) {
        result.sent.push(value.sent);
      }
      result.received = result.received || !!value.received;
    });
    return result;
  }
}
