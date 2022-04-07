# Brac Config Data Generator Script (first draft)

## Introduction

This script is to generate Brac config test data.

Initially it only creates places, persons, users, pregnancy and assesment report. Taking into account hierarchies.

Changes where made in /test/factories/ and /test/scalability/
Basically added new folders:
/test/factories/brac and /test/scalability/generate_brac_data

## Requirements

- NodeJS
- a target medic instance with brac config loaded


## Steps to execute it
1. Run npm ci, npm install and npm install @faker-js/faker --save-dev in cht-core root directory
2. Go to `/tests/scalability/generate_brac_data` and edit the `data-config.json` doc with the main dataDirectory, preconditionDirectory and mainScriptDataDirectory.
3. In your preconditionDirectory create the subfolder /json_docs/
4. Go to `/tests/scalability/generate_brac_data` and execute the script with node generate-brac-data.js.
5. Data is generated in the preconditionDirectory configured in step 2.

## Optional steps
6. You can change the following scripts variables in `size-config.json` to test with different sizes:
- number_of_district_hospitals
- number_of_managers_per_district_hospitals
- number_of_health_centers_per_district_hospital
- number_of_chw_per_health_center
- number_of_clinics_per_health_center
- number_of_family_members

## Upload generated data to your local instance
7. Navigate to the preconditionDirectory configured in step 2.
8. Execute cht --url=https://{user}:{password}@{instance}:{port} upload-docs create-users
9. Login as user to check if everything looks good (use credentials generated in users.csv)
