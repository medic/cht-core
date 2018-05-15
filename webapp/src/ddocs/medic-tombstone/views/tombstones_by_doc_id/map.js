function(doc) {
  if (doc.type !== 'tombstone') {
    return;
  }

  var matches = doc._id.match(/^(.*)____(.*)____tombstone$/);
  emit(matches[1], { rev: matches[2] });
}
