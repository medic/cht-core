function(doc) {
  if (doc.type === 'data_record' && doc.sms_message && doc.sms_message.gateway_ref) {
    emit(doc.sms_message.gateway_ref);
  }
}
