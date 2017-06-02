function(doc) {
  if (doc._conflicts) {
    emit(doc._conflicts);
  }
}
