var data_record = require('lib/data_records'),
    _ = require('underscore');

exports['Count char updates note'] = function(test) {
  var modal = $('<div class="modal"><div class="modal-footer"><div class="note"/></div></div>'),
    // value 110 chars long
    message = $('<input value="abcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghijabcdefghij"/>');

  data_record.countChars(message, modal);
  test.equals(modal.find('.note').html(), '110 characters');
  test.done();
};

var $phone = $(
  '<div class="control-group">' +
    '<div class="controls">' + 
      '<input name="phone" autocomplete="off" type="text">' +
    '</div>' +
    '<span class="hide help-block"></span>' +
  '</div>'
);

var $message = $(
  '<div class="control-group">' +
    '<div class="controls">' +
      '<textarea name="message"></textarea>' +
    '</div>' +
    '<span class="hide help-block"></span>' +
  '</div>'
);

exports['Empty message fails validation'] = function(test) {
  $phone.select2 = function() { return []; };
  var result = data_record.validateSms($phone, $message);
  test.equals($message.find('.help-block').text(), 'Please include a message.');
  test.equals(result, false);
  test.done();
};

exports['Empty recipients fails validation'] = function(test) {
  $phone.select2 = function() { return []; };
  var result = data_record.validateSms($phone, $message);
  test.equals($phone.find('.help-block').text(), 'Please include a valid phone number, e.g. +9779875432123');
  test.equals(result, false);
  test.done();
};

exports['Phone number with letters is not valid'] = function(test) {
  $phone.select2 = function() { 
    return [{phone: 'xyz', text: 'james dean'}]; 
  };
  var result = data_record.validateSms($phone, $message);
  test.equals($phone.find('.help-block').text(), 'These recipients do not have a valid contact number: james dean');
  test.equals(result, false);
  test.done();
};

exports['Multiple invalid phone numbers'] = function(test) {
  $phone.select2 = function() { 
    return [{phone: 'xyz', text: 'First'}, {phone: '1234', text: 'Second'}]; 
  };
  var result = data_record.validateSms($phone, $message);
  test.equals($phone.find('.help-block').text(), 'These recipients do not have a valid contact number: First, Second');
  test.equals(result, false);
  test.done();
};

exports['Phone number passes validation'] = function(test) {
  $phone.select2 = function() { 
    return [{phone: '+1234567890', text: 'someone valid'}]; 
  };
  $message.val('Some valid message');
  var result = data_record.validateSms($phone, $message);
  test.equals($phone.find('.help-block').css('display'), 'none');
  test.equals(result, true);
  test.done();
};

exports['Recipient `everyone at` is valid'] = function(test) {
  $phone.select2 = function() { 
    return [{everyoneAtFacility: 'xyz', text: 'Everyone at someplace'}]; 
  };
  $message.val('Some valid message');
  var result = data_record.validateSms($phone, $message);
  test.equals($phone.find('.help-block').css('display'), 'none');
  test.equals(result, true);
  test.done();
};

var assertFormattedRecipients = function(test, actual, expected) {
  test.equals(actual.length, expected.length);
  _.each(expected, function(expectedRecipient, i) {
    var actualRecipient = actual[i];
    test.equals(expectedRecipient.phone, actualRecipient.phone);
    test.equals(expectedRecipient.facility.id, actualRecipient.facility.id);
  });
}

exports['Format recipients on a single recipient'] = function(test) {
  var result = data_record.formatRecipients([
    {phone: '123', doc: {id: 1}}
  ]);
  assertFormattedRecipients(test, result, [
    {phone: '123', facility: {id: 1}}
  ]);
  test.done();
};

exports['Format recipients on multiple recipients'] = function(test) {
  var result = data_record.formatRecipients([
    {phone: '123', doc: {id: 1}},
    {phone: '456', doc: {id: 2}}
  ]);
  assertFormattedRecipients(test, result, [
    {phone: '123', facility: {id: 1}},
    {phone: '456', facility: {id: 2}}
  ]);
  test.done();
};

exports['Format recipients on `Everyone at` recipients'] = function(test) {
  var result = data_record.formatRecipients([
    {phone: '123', doc: {id: 1}},
    {phone: '456', doc: {id: 2}},
    {everyoneAtFacility: {}, docs: [
      {id: 3, contact: {phone: '789'}},
      {id: 4, contact: {phone: '000'}}
    ]}
  ]);
  assertFormattedRecipients(test, result, [
    {phone: '123', facility: {id: 1}},
    {phone: '456', facility: {id: 2}},
    {phone: '789', facility: {id: 3}},
    {phone: '000', facility: {id: 4}}
  ]);
  test.done();
};

exports['Format recipients removes duplicate phone numbers'] = function(test) {
  var result = data_record.formatRecipients([
    {phone: '123', doc: {id: 1}},
    {phone: '456', doc: {id: 2}},
    {everyoneAtFacility: {}, docs: [
      {id: 3, contact: {phone: '789'}},
      {id: 4, contact: {phone: '123'}}
    ]}
  ]);
  assertFormattedRecipients(test, result, [
    {phone: '123', facility: {id: 1}},
    {phone: '456', facility: {id: 2}},
    {phone: '789', facility: {id: 3}}
  ]);
  test.done();
};

