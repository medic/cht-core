# Part 2: Data Collection

Welcome to Part 2 of a series of screencasts about Kujua, a SMS data 
data collection tool designed for rural and occasionally connected environments.

## Facility Data

When starting a project typically we receive some data that allows us to identify reporting units or the people who the SMS messages. 

    [ show example data ]

This is an example from Nepal, it contains RU Codes or reporting unit codes, these codes simply allow us to ID any given form submission. 

For this example we collect data using the Textforms format, which is a specially formatted text message that contains tiny field names.  Lets look at an example of a Textforms message:

    [ show example of a textforms message for VPD form ]

The RU Code is included in the text message as the ID field.  So when a message is submitted we can match our facility data.  So typically in Kujua you would begin by entering facility data. So lets create an example district in Kujua.

    [ create example district based on spreadsheet ]

Just to make this demo a little shorter I'm going to run a script to upload some data.

    [ run make upload for demo data ]

I should also note that I uploaded an optional configuration file.

    [ cat config.js to show config options ]

This config file allows us to customize the labels in the web interface and configures our analytics by specifying one or more form code and reporting frequency.  Right now the reporting rates analytics are paired to a form and frequency.

    [ refresh kujua and show analytics and facility screens ]

So if we refresh we'll have enabled some analytics and can see our facility data.  We can see that 100% of our reports are not submitted.

## Forms

So we defined some facilities, now we need to look at forms a little deeper.

    [ navigate to gateway testing document ]

In Kujua we haven't exposed form definitions much yet except for this page, which displays our supported forms and some of their features. We call them JSON forms, lets take a look at the VPD form.
 
    [ show field definition for VPD ]
    [ vi json-forms/cdc-nepal.json ]

This form maps the SMS message fields with a definition based on the form code or key.  Lets send in an another message:

    [ foreground kujua phoney window ]
    [ paste VPD example message into message field ]
    [ enter any value for to and from fields ]

Kujua Phoney is just a utility that we use for demo and testing of Kujua.  It simulates the gateway device, like the SMSSync program that runs on Android and allows us to easily create messages without additional requiremetns.

    [ send example VPD junk message with phoney ]
    [ show records screen and expand message row ]

So a record in Kujua is the result of facility data and a form definition.  Notice this message is marked invalid because the ID field did not match any of the facilities.  Let's submit another message using one of the known RU Codes.

    [ submit VPD report but change ID field to match facility RU Code ]

Now we can see a match.  We can also generate an invalid message by not including all required fields.

    [ submit VPD report after removing a field ]

So in this case the record is invalid and sends a response back to the reporter describing the problem (missing fields).  This behavior is defined by the form definition and can be customized easily.  

## Weekly Reports

Now we have a valid weekly report but if you look at analytics it will still show 100% reports pending or unsubmitted.  This is because if we look at the week and year that we used to submit the report are in the future.  Lets submit a report a current week and year.

    [ modifying week and year field on VPD report and resubmit ]

Now if we browse to the district or field office we can see a green slice that represents a valid weekly report.  Lets submit some more records.

    [ navigate to records screen ]
    [ submit records decrementing/incrementing week ]
    [ submit some invalid records also ]
    [ refresh analytics ]

We can see this is a decent way to measure reporting rates and see valid,  invalid and unsubmitted statistics at a glance.

## Alerts

Another common type of form is an alert form.  An alert form sends data to related facilities.  So given some form data from a reporting unit it will forward it along to related facilities.  Lets looks at the CDC Outbreak Report or IMD form for short.

    [ browse to gateway testing doc and copy IMD report example ]

This is used to report Acute Flaccid Paralysis or Measles cases found in certain areas.   It takes an ID a Ward number, boolean values for the disease, phone number and location.  It is flagged with the messages tag since it will queue up outgoing messages.  The validations tag means this form has some custom validation; if you happened to design the form you know there is an exclusive-or here which means only aft or msl fields can be reported, not both.  Lets submit this example.

    [ paste into phoney and send ]
    [ navigate to records screen and expand report ]
    [ if afp and msl reports collide we will see error response ]

So this is a junk message, we can't match the ID, we can't determine where  messages need to go, (possibly: it also failed the validation if MSL and AFP were both set to true.) As the reporter we also get a response explaining that.  All the response messages are defined in the form definition and can easily be customized.  Lets re-submit a valid report.

    [ modify report and set AFP or MSL to true, not both, and set ID value ]

The report is still invalid because the health facility phone number doesn't exist.  But this is something we can fix! 

    [ navigate to facilities, and enter ph number for the ID's district ]
    [ navigate back to records, expand record and click ! next to to field ]
    [ enter + into field and select correct district phone number entry ]
    [ click submit ]

This fixes the alert, and queues up outgoing messages for the gateway to transmit.  When a real gateway is connected it polls Kujua for outgoing messages every few minutes and when the message is sent we will see a green checkbox and sent tag.  But this is better because new forms that arrive will be valid.

    [ resubmit same alert report ]
    [ expand record to show proper forwarding ]

We have some question marks here lets fill in some more facility data just so the records look complete.

    [ edit reporting unit facility data ]
    [ add contact names for rows ]
    [ then go back to records screen ]
    [ bring up kujua phoney and resubmit record ]

If we resend the same message we will get a complete record finally.

    [ resubmit same message in phoney ] 

You can also manually override the facility relation for a record.

    [ click edit for edit mode ]
    [ hover over record and choose edit row button (gears) ]
    [ choose a facility ]

Some filtering also exists so you can find records from a specific region or filter by invalid records.

    [ filter by field office ]
    [ filter by valid/invalid form ]

So this gives us a basic idea of how two different types of forms, reports and alerts work in Kujua.  

## Exports

Kujua also lets us export all the valid data into a spreadsheet.

    [ navigate to exports screen ]

There is a since field here to allow for getting a subset of data, which defaults to a month of data.

    [ show calendar widget, choose  date ]
    [ click export button to download spreadsheet ]

This concludes the basic Kujua features demo. I hope you find this tool useful.  Please visit us at medicmobile.org to find out more.  Thanks for watching.
