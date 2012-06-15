# Release Notes

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
