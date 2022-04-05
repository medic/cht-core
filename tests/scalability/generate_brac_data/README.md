# Brac Config Data generator Script

## Introduction

This script is to generate Brac config test data.

Initially it only creates places, persons, users and pregnancy report. Taking into account hierarchies.

Changes where made in /test/factories/ and /test/scalability/
Basically added new folders:
/test/factories/brac and /test/scalability/generate_brac_data

## Requirements

- NodeJS
- a target medic instance with brac config loaded


## Steps to execute it

1. Go to `/tests/scalability/generate_brac_data` and run `npm install`.
2. Edit the `data-config.json` doc with the main dataDirectory, preconditionDirectory data subdirectory and mainScriptDataDirectory data subdirectory.
3. Execute generate-brac-data.js.
4. Data is generated in the subdirectories configured in step 2. 

## Optional steps
5. You can change the following scripts variables in generate-brac-data.js to test with different sizes:
- numberOfDistrictHospitals
- numberOfManagersPerDistrictHospital
- numberOfHealthCentersPerDistrictHospital
- numberOfChwPerHealthCenter
- numberOfClinicsPerHealthCenter
- numberOfFamilyMembers

## Upload generated data to your local instance
6. Navigate to the data directory configured in step 2. 
7. Execute cht conf upload-docs create-users
