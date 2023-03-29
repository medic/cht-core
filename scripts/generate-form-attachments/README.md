This script will iterate over all reports in the indicated database and generate XML `content` attachments. 

Reports that are not XML type reports and reports that already have a `content` attachment will be skipped. 

To install, run  `npm ci`.  

To run, the script requires the COUCH_URL environment variable, that defines which database to use. 
ex:
```
EXPORT `COUCH_URL`=<your_instance_url_with_authentication>
```

Run command:

There are two ways to run the script, depending on how you require data to be read from the database.   

1. From `reports_by_form` view:
```
npm run view
```
This command is more performant, as it will only read report documents from the database (in batches) by using the `reports_by_form` view in `_design/medic-client`. 
Use this command when running against an already installed `cht-core`

2. From `_all_docs`
```
npm run alldocs
```
This command reads the all docs in the database (in batches) and skips over all docs that are not reports. Use this command against a database that does not have `cht-core` installed. 

Test command:

```
npm run test
```

*Disclaimer*   
The script reads reports by querying a view, so run this script on a database that already has `cht-core` installed.   
The script generates XML attachments based off of `doc.fields` and `doc.hidden_fields`.   
It may not yield perfectly accurate (Enketo-friendly) results for overly complicated structures, like nested repeats, because of inconsistencies in how we manage these repeats.   
