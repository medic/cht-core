# Gateway Testing

## Supported Forms

The following is a list of supported forms and example messages supported by
each form. You can use these examples during your tests.

## Testing Setup

1. Install the gateway and bind it to an instance of Kujua, see the install doc.

2. Get at least two, ideally three, different phone numbers that can act as
SMS message clients, a google voice account can help with this.

3. Modify the facility data with the phone numbers as contacts.

## Message Tests

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


## Error Responses

### XOXO Not Found 

1. As the Clinic phone send:

    `1!X0X0!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4`

2. Assert response is negative.

### Junk Report

1. As the Clinic phone send any random string.

2. Assert response is negative.

