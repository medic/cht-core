function(doc) {
  if (doc._id.indexOf('replication-fail-') === 0 && doc.daily_limit_failures) {
    Object.keys(doc.daily_limit_failures).forEach(function(day) {
      emit([day, doc.user], doc.daily_limit_failures[day]);
    });
  }
}
