module.exports = {
  map: function(doc) {
    var phone;
    if (doc.form && doc.week_number && doc.year) {
      phone = doc.related_entities && doc.related_entities.clinic && doc.related_entities.clinic.contact &&
        doc.related_entities.clinic.contact.phone;
      if (phone) {
        emit([doc.form, phone, doc.year, doc.week_number], {
          received: true
        });
      }
    } else if (doc.type === 'cdc_reminder' && doc.related_form && doc.week && doc.year && doc.phone) {
      emit([doc.related_form, doc.phone, doc.year, doc.week], {
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
