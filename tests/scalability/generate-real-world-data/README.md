# Real World Data Generator Script (first draft)

## Introduction

This script is to generate real world test data.

Initially it only creates places, persons, users and reports (pregnancy, assessment and assessment follow up). Taking into account hierarchies.

It also creates `../replicate-real-world-docs/config.json` file to be used by the second phase script `add-docs-to-remote.js`

Relevant factories exist in `tests/factories/real-world`.

## Requirements

- NodeJS
- a target medic instance with a real world config loaded

## Steps to execute it
1. Clone cht-core repo.
2. Run npm ci in cht-core root directory.
3. Go to `tests/scalability/generate-real-world-data/` and execute the script with command `node generate-real-world-data.js [thread-name] [data-directory-path] [medic-instance]`.
4. Data is generated in the `[data-directory-path]` passed as parameter in step 3. The structure is as follows:
```
.
+--data_directory
|  +--precondition_data_directory
|  |  +--users.csv
|  |  +--json_directory
|  +--main_script_data_directory
|  |  +--userx_data_directory
```

## Optional steps
7. You can change the following scripts variables in `size-config.json` to test with different sizes:
- number_of_district_hospitals
- number_of_managers_per_district_hospitals
- number_of_health_centers_per_district_hospital
- number_of_chw_per_health_center
- number_of_clinics_per_health_center
- number_of_family_members

## Upload generated data to your local instance
8. Navigate to the `data_directory` configured in step 3.
9. Execute cht --url=https://{user}:{password}@{instance}:{port} upload-docs create-users
10. Login as user to check if everything looks good (use credentials generated in `/data_directory/precondition_data_directory/users.csv`)
