function(doc) {
  if (doc._id.indexOf('replication-fail-') === 0 && doc.daily_failures) {
    Object.keys(doc.daily_failures).forEach(function(day) {
      emit([day, doc.user], doc.daily_failures[day]);
    });
  }
}
