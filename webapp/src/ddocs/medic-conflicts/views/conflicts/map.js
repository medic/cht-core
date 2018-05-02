function(doc) {
  //  3993_staged_deploys_ui_test_two
  if (doc._conflicts) {
    emit(doc._conflicts);
  }
}
