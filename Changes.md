# Kujua Release Notes

## 0.3.1

### Mar 3, 2014 

- Fixed a bug where the facilities spreadsheet was holding focus so sending a message doesn't work. #440

- Added Bulk Messaging support, so you can send messages to multiple recipients. #333

- Fixed bug to include incoming messages in messages export. #436
    
- Fixed bug where it is possible to send a message twice by double clicking the submit button

- Fixed bug where we failed to retrieve settings on port 80 #438
    
    This was experienced when proxying to couchdb because http proxying will
    decode the URL including docid of the show parameter, so the show
    returns 404.  Solution is to always double URL encode if the show docid
    contains special characters.

- Confirm with user before deleting facility so they can't be deleted by accident. #371

- Added unique Patient ID validation support.  #411 kujua-sentinel/pull/50

    Use unique('patient_id') in your registration validation rules to validate
    new form submissions that are setting the patient ID values via forms.

    Validation rules may consist of Pupil.js rules and custom rules.  These
    cannot be combined as part of the same rule.

    Not OK:        
    
        rule: "regex('[0-9]{5}') && unique('patient_id')"
    
    OK:
        
        rule: "regex('[0-9]{5}') && max(11111)"    

    If for example you want to validate that patient_id is 5 numbers and it
    is unique (or some other custom validation) you need to define two
    validation configs/separate rules in your settings. Example validation
    settings:

    ``` 
    [
      {
        property: "patient_id",
        rule: "regex('[0-9]{5}')",
        message: "Invalid: Patient ID {{patient_id}} must be 5 numbers."
      },
      {
        property: "patient_id",
        rule: "unique('patient_id')",
        message: "Invalid: Patient ID {{patient_id}} must be unique."
      }
    ]
    ```

- Added Conditional Alerts feature. #437  kujua-sentinel/issue/52

    Configure the Alerts section of the App Settings to send a message when an
    incoming message meets the configured condition.
    
    
## 0.3.0-beta.39 (bugfix)

### Feb 25, 2014

- Fixed textforms whitespace parser bug when using form list field types. #431

    Textforms parser wasn't trimming space correctly on a field value, so if
    you had a list defined using those values they would never get matched.
    
    Textforms was only matching numeric values of length 2 or more, so if
    you submitted a one digit number you would not get a numeric match.
    
    Also if the value didn't match numeric or a date format then the
    whitespace was not being trimmed correctly.


## 0.3.0-beta.38 (debug) 

### Feb 13, 2014
 
- added logging calls to help debug and identify whitespace parsing bug #431


## 0.3.0-beta.37 

### Jan 21, 2014

- Fixes to user roles (@marc)
 
    Matches Transitional V2 in
    https://docs.google.com/a/medicmobile.org/spreadsheet/ccc?key=0Ao9l2yegOFn7dEJRTEw1Z3RmZm0wTEo4Nk92NjVocnc

- Added support for Kemri Muvuku Form (KEMR)

- Added exclude_cols query param to csv/xml form exports. #421
    
    For example inlude `exclude_cols=1,5` in your query parameters to
    remove the first and fifth column of an export.

-  bugfix on export query params and UX adjustments

    Made English CSV export default. SpreadsheetML can be a little buggy
    because we're using HTML entities (not valid XML).
    
    Disabled default month value in exports screen since record count does
    not reflect the export row totals displayed.  It's probably better UX to
    have the user set the date knowing they are doing something than having a
    default that doesn't make sense with the totals on the screen and having
    to guess why that is.
    
- Added timezone support to exports #394

    Render page contents first and then load the fields data since that was
    holding up the page load.
    
    Indexing _id as `uuid` in field index so you can search for
    `uuid:10366976d62ab9a31257b2fad16113ee` now and it shows up in avaialble
    fields index.  For some reason I think underscore prefixed fields do
    show up in fields listing on Lucene for some reason.

- Fixed poor loading on search help #422


- added timezone support to exports #394
        
    Now dates in the exported spreadsheet should include your locale timezone. Controlled by the `tz` query param.
    
    
- Added new Messages Export and removed message data from Forms Export

    New http endpoint `/export/messages` to get messages export. Records are
    always latest first (reverse cronological).  Message export will include
    all records (valid and invalid), the point of the messages export is to
    give you access to all your message data, including outgoing error
    messages.
            
    **Warning**: the following URLs are no longer supported:
    
    ```
    /{form}/data_records.csv
    /{form}/data_records.xml
    /form_data_records.xml
    /form_data_records.csv
    ```
    
    Use `/export/forms/{form}` path instead.
    
    **Warning**: Existing form data export format has changed.  Included UUID of
    the related record so data among the two spreadsheets (messages and form
    data) can be correlated if need be.  Also removed the message
    data/columns from form data export. A record can be found via UUID by
    using `uuid:<the uuid string>` in the search box.
    
    Changed default column name of "From" to "Reported From".  Note if this
    shouldn't change if you have an existing install since it is generated
    based on your translation settings.

```
    The NEW columns (added UUID column and removed message data):
    
    Record UUID
    Reported Date
    Reported From
    Clinic Contact Name
    Clinic Name
    Health Center Contact Name
    Health Center Name
    District Hospital Name
    [columns for form fields data depending on form]
    
    The OLD columns:
    
    Reported Date
    From
    Clinic Contact Name
    Clinic Name
    Health Center Contact Name
    Health Center Name
    District Hospital Name
    [columns for form fields data depending on form]
    Incoming Message
    Responses
    Outgoing Messages
    Scheduled Tasks
```


    
    
