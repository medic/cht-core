function(doc) {
  //  3993_staged_deploys_ui_test_two
  if (doc.type === 'data_record' && doc.sms_message && doc.sms_message.gateway_ref) {
    emit(doc.sms_message.gateway_ref);
  }
}
