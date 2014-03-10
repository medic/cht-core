
exports.audit_records_by_doc = {
  map: function (doc) {
    if (doc.type === 'audit_record') {
      emit([doc.record_id], 1);
    }
  }
};
