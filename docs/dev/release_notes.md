# Release Notes

## 0.1.19

* Fixed wifi lock bug in SMSSync #54.
* Updated docs with new SMSSync build instructions
* Fixed labels names and stat placement on Health Center and District reporting screens.
* Added help panel to spreadsheet to explain key bindings.
* Form revisions for OHW and CDC Nepal

## 0.1.18

* Fixed bug in records screen where 1 row was not getting rendered until a scroll.
* Refactored messaging, supporting `messages_task` in json forms.
* Fixed bug where non-districts showing up in districts filter.
* Keep Kujua Reporting files in-tact so it can be activated with config.
* Added validations, messages and ref id labels to forms on gateway testing doc.
* Added autocomplete=off to error missing phone form in records screen.
* Added css for pointer hover to icon-exclamation-sign.
* Renamed `use-sentinel` to `use_sentinel` to be consistent in JSON forms.
* Added basic unstructured message support.
* Fixed bug in records during edit row function where reported date get munged.
* Added spreadsheet feature so children get updated when a parent facility is changed.
* Fixed bug where using wrong label on main analytics screen.
* Always create records, even on empty or unstructured messages.
* SMS response messaging refactor, added response messages to gateway testing doc.
* Fixed hard coded URL paths in reporting tests.

## 0.1.17

* Renamed `reference_field` property on forms to `facility_reference`.
* Allow phone number to match on any facility type not just clinics.

## 0.1.16

* Tell user to login on 403 template.
* Added record detail to analytics screen expand div.
* Added configuration entries for reporting rates/analytics.
* Made labels more configurable.
* Added Kujua Sentinel support for reminders and alerts.
* Updated spreadsheet columns to use config for labels.
* Added support for form_invalid_custom error codes.
* Introduced `reference_field` on forms.
* Fixed kujua reporting views to better handle undefined clinic object in facility data.
* Make it clear in HC reporting screen that contact name/phone is undefined.
* Use `__dirname` in sentinel so it can be launched from any directory.
* Added page for reminder logs.
* Fixed district filtering support.
* Added lockRows option to spreadsheet.
* Fixed bug in XML spreadsheet output where true boolean value shows as 0.
* Added support in sentinel to update children when a facility is edited.
* Fixed bug on delete and editRow modal window.
* Hide all nav items except docs when logged out.
* Removed console references and added JSON.stringify to logger call.

## 0.1.15

* Saving responses to record and displaying in records screen.
* Added timezone offset to reported date in exports and data records screen.
* Added datepicker to filter exports by date.
* Added support for custom form validation functions
* Show better error message for other codes like missing_fields
* Fixed buttons in data records screen
* Added Kujua Reporting package for easy switching of analytics features
* Improved test coverage for missing fields, cleaned/fixed up tests.
* Fixed form parsing for fields defined as sub-objects and boolean parsing.
* Added cases for sms responses when form is undefined
* Display tooltip on input element focus in spreadsheet
* Added delete on facilities spreadsheet
* Make en/xls default export format
* Custom labels via config.js configuration doc
* Support for records to key on any facility
* Nepalese responses
* VPD field updates
* added additional form definitions

## 0.1.0-pre.4

* Parsing refactor to allow for better unstructured and textforms support, #106, #79
* Add validation to spreadsheet with first cut of phone validation. fixes #104
* Direct support for json-form definitions #76
* Added textforms support for tiny labels in form definition
* Generating example messages automatically in Gateway Testing doc
* Fixed textforms parser for Couchbase on OSX #46
* Using complete field keys instead of tiny labels in textforms data record creation #79
* Better generic localized message handling #79
* Added delete feature to spreadsheet rows #97
* Updated install docs to include require_valid_user steps
* Various spreadsheet fixes #103, #98
* Better localized string support in form definitions
* Include national office data to districts on save

## 0.1.0-pre.3

* Added Quick Install Doc
* Renamed kujua-export to kujua-base #88
* Added dropdown health centers and districts to spreadsheet #99, #66
* Various facilities spreadsheet bug fixes #92, #91, #94
* Added CouchDB security steps to intall doc #88, #66
* Fixed authorization passthrough for tasks pending #87
* Various data records screen fixes #84, #83, #56
* Updated gateway/SMSSync binary and added S3 link to install docs
* Removed Export branding
* Started on functional tests using zombie.js and vows
* Added health centers and districts spreadsheet
* Added facilties section and spreadsheet editor #63
* Assert forms that pass validation gets saved #78, #75, #46
* Fixed bug where form submission fails if it has extra fields #75
* Fixed 24-hour time display bug 
* Added close button to login window #70
* Fixed bug with scroll listener binding to other pages #69

## 0.1.0-pre.2

* Better textforms support including validation #46
* Added optional required field to form defs, all field definitions are required by default.
* Close dropdown menus when clicking anywhere on the site #53
* Stream export data instead of collecting it in memory #57
* Added validation step to all new form submissions #73
* Added records filtering by form #56
* Moved data records code to module #69

## 0.1.0-pre.1
* added facility columns to export formats #54 * added fr translations for facility names. #54 * The server will not send a response unless a form is recognized.
* Filtering on Districts support
* Added Records section
* Fixed reported date on re-imports, so the dates are preserved based on sent
timestamp in sms message.  
* Added infinite scroll for viewing records on one page instead of paging.
* Marking empty fields with question marks.
* Marking errors on records that have referral tasks with no recipient defined.
* Real-time updates via changes feed

## Downloads

* link to json design docs for each release?
