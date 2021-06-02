function(doc) {
  var START_TIME = 7 * 60 * 60 * 1000; // 7 days
  if (doc.timestamp && doc.timestamp > START_TIME) {
    emit(doc.user, doc.timestamp);
  }
}
