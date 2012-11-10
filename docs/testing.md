# Gateway Testing

## Supported Forms

The following is a list of supported forms and example messages supported by
each form. You can use these examples during your tests.


## SMS Responses

Given a message these are the SMS responses Kujua with send through the
gateway. In all cases a record is saved, even in the empty message case.  This
allows for all types of incoming messages to be reviewed.  All responses are
trimmed at 160 characters before being sent.

### Errors

#### Empty string or whitespace

* message: '' 
* response: `empty`

#### Textforms form def not found

* message: "0000 HFI facility#RPY 2012#RPM 4#MSP 1#L1T 222"
* response: `form_not_found`

#### Muvuku form def not found

* message: "1!0000!2012#2#20#foo#bar"
* response: `form_not_found`

#### Unstructured message not textforms

* message: "foo"
* response: `sms_received`

#### Unstructured message possibly textforms

* message: "testing 123"
* response: `form_not_found`

#### Missing Fields

When you define a JSON form you use the attribute `required: true`.

* message: "TEST HFI facility#RPY 2012"
* response: `missing_fields`

### Success 

#### Muvuku form def found

* message: '1!TEST!2012#2#20#foo#bar'
* response: `form_received`

#### Textforms form def found

* message: 'TEST HFI facility#RPY 2012#RPM 4#MSP 1#L1T 222'
* response: `form_received`

### Notes

It is difficult to differentiate between a textforms message and a simple
message since it could be a textform with one field.  So when a msg like
'testing 123' is sent the system will look for a form code of 'TESTING', hence
the form is not found message.  In the future the response for unstructured
text that cannot be matched to a form will change to the folowing:

* `sms_received`

## Testing Setup

1. Install the gateway and bind it to an instance of Kujua, see the install doc.

2. Get at least two, ideally three, different phone numbers that can act as
SMS message clients, a google voice account can help with this.

3. Modify the facility data with the phone numbers as contacts.

## Special Form Tests

### MSBR Referral

1. As the Clinic phone send **MSBR** message.

2. Assert response is positive.

3. Assert form data was sent to Health Center phone.

### MSBB Referral

1. As the Health Center phone send **MSBB** message.

2. Assert response is positive.

3. Assert form data was sent to Health Center to Hospital phone.

### MSBC Counter Referral 

Note: This test relies on MSBR being completed first because it tests a Health
Center to Clinic referral.

1. As the Health Center phone send **MSBC** message.

2. Assert response is positive.

3. Assert form data was sent to Clinic

4. Assert that 'Patient traité pou' data does **not** exist in message to Clinic.

### MSBC Counter Referral 

Note: This test relies on MSBB being completed first because it tests a
Hospital to Health Center referral.

1. As the Hospital phone send **MSBC** message.

2. Assert response is positive.

3. Assert form data was sent to Health Center phone.

4. Assert that 'Patient traité pou' data exists in message to Health Center.

