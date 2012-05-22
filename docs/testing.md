# Gateway Testing

## Setup

1. Install the gateway and bind it to an instance of Kujua, see the install doc.

2. Get at least two, ideally three, different phone numbers that can act as
Muvuku clients, a google voice account can help with this.

3. Modify this mockup data with your phone numbers as contact and upload to
Kujua Export.

<code class="shorten">
{"type":"clinic","name":"Example clinic 1","contact":{"name":"Sam Jones","phone":"+13125551212"},"parent":{"type":"health_center","name":"Chamba","contact":{"name":"Neil Young","phone":"+17084449999"},"parent":{"_id":"94719188fd073af8903270a227325710","type":"district_hospital","name":"Zomba","contact":{"name":"Example contact","phone":"+14151112222"},"parent":{"_id":"94719188fd073af8903270a22706bc6f","type":"national_office","name":"Malawi National Office","contact":{"name":"Example contact","phone":"+18037772222"},"description":"Example national office"}},"_id":"4a6399c98ff78ac7da33b639ed40da36"},"_id":"4a6399c98ff78ac7da33b639ed60f458"}
</code>

## Form Tests

### PSMS Report

1. As the clinic phone send:
    
    `1!TEST!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4`

2. Assert response is positive.

### MSBR Referral

1. As the Clinic phone send:

    `1!MSBR!2012#12#20#77777888889#1111#bbbbbbbbbbbbbbbbbbbb#22#10#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc`

2. Assert response is positive.

3. Assert form data was sent to Health Center phone.

### MSBB Referral

1. As the Health Center phone send:

    `1!MSBB!2012#2#1#12345678901#1111#bbbbbbbbbbbbbbbbbbbb#22#15#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc`

2. Assert response is positive.

3. Assert form data was sent to Health Center to Hospital phone.

### MSBC Counter Referral 

Note: This test relies on MSBR being completed first because it tests a Health
Center to Clinic referral.

1. As the Health Center phone send:

    `1!MSBC!2012#1#16#77777888889#5#abcdefghijklmnopqrst#31#bcdefghijklmnopqrstu#cdefghijklmnopqrstuv#5#defghijklmnopqrstuvw#efghijklmnopqrstuvwxyzabcdefghijklm`

2. Assert response is positive.

3. Assert form data was sent to Clinic

4. Assert that 'Patient traité pour: cdefghijklmnopqrstuv' does **not** exist in message to Clinic.

### MSBC Counter Referral 

Note: This test relies on MSBB being completed first because it tests a
Hospital to Health Center referral.

1. As the Hospital phone send:

    `1!MSBC!2012#1#16#12345678901#5#abcdefghijklmnopqrst#31#bcdefghijklmnopqrstu#cdefghijklmnopqrstuv#5#defghijklmnopqrstuvw#efghijklmnopqrstuvwxyzabcdefghijklm`

2. Assert response is positive.

3. Assert form data was sent to Health Center phone.

4. Assert that 'Patient traité pour: cdefghijklmnopqrstuv' exists in message to Health Center.

### MSBG Report

1. As the Clinic phone send:

    `1!MSBG!2012#1#12345678901#123#456#789#123#456#789#123#456#789`

2. Assert response is positive.

### MSBM Report

1. As the Clinic phone send:

    `1!MSBM!2012#1#16#12345678901#123#456#789#123#456#789#123#456#123#456`

2. Assert response is positive.

### MSBP Report

1. As the Clinic phone send:

    `1!MSBP!2012#1#16#12345678901#123#456#789#123#456#789#123#456#789#123#456#789#123#456#789#123`

2. Assert response is positive.

### PSCA  Report

1. As the Clinic phone send:

    `1!PSCA!2012#12#20#aaaaaaaaaaaa#123#kkkkkkkkkkkkkkkkkkkk#333#111#222#444#555#555#555#666#888#999#222#333#444#333#2#555#555#2#665#221#1#111`

2. Assert response is positive.

### PSCQ Report

1. As the Clinic phone send:

    `1!PSCQ!2013#2#20#aaaaaaaaaaaaaaaaaa#2222#3333#1#1111#1111#1#2222#2222#2#333#474#112#444#111#333#333#880#220#220#212#555#6633#4444#8888#2211#2211#2211#5555#222#444#22`

2. Assert response is positive.

### PSCR Report

1. As the Clinic phone send:

    `1!PSCR!2012#12#20#aaaaaaaaaaaa#000111222333#kkkkkkkkkkkkkkkkkkkk#333#111#222#444#555#555#555#666#888#999#222#333#444#333#2#555#555#2#665#221#1#111`

2. Assert response is positive.

### PVCA Report

1. As the Clinic phone send:

    `1!PVCA!ddddddddddddddd#2011#5#ccccccccccccccc#bbbbbbbbbbbbbbb#1#eeeeeeeeee#ffffffffff#9#8#111#222#333#444#555#666#777#888#999`

2. Assert response is positive.

### PVCB Report

1. As the Clinic phone send:

    `1!PVCB!ddddddddddddddd#2011#5#111#222#333#444#555#666#777#888#999#000#111#222#333#444#555#666#777#888#999#000#111#222#333#444#555#666#777#888#999`

2. Assert response is positive.

### PSTA Report

1. As the Clinic phone send:

    `1!PSTA!ddddddddddddddd#2011#5#1111#2222#3333#4444#5555#6666#7777#8888#9999#0000#1111#2222#3333#4444#111#222#333#444#555#666#777`

2. Assert response is positive.

### PSTB Report

1. As the Clinic phone send:

    `1!PSTB!ddddddddddddddd#2011#5#1111#2222#3333#4444#5555#6666#7777#31#31#31#31#31#31#31#1#1#1#1#1#1#1`

2. Assert response is positive.


### XOXO Not Found 

1. As the Clinic phone send:

    `1!X0X0!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4`

2. Assert response is negative.

### Junk Report

1. As the Clinic phone send any random string.

2. Assert response is negative.

