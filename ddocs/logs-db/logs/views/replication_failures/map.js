function(doc) {
  if (doc._id.indexOf('replication-fail-') === 0 && doc.daily_counts && doc.user) {
    Object.keys(doc.daily_counts).forEach(function(day) {
      emit([day, doc.user], doc.daily_counts[day]);
    });
  }
}
