# update-rapidpro-workspace-settings Shared GitHub Action
The `update-rapidpro-workspace-settings` is a parameterised reusable GitHub action that updates app-settings prior to compiling and uploading to a running CHT instance.

This can be executed jointly with the deployment Github action.

## CHT App Requirements
* medic-conf@3.3 or above

## Example GitHub Step

```
name: Example GitHub Workflow yml

on: ['workflow_dispatch']

jobs:
  workflow_dispatch:
    runs-on: ubuntu-18.04

    steps:
    - name: Update rapidpro workspace in app-settings 
      uses: 'medic/cht-core/.github/actions/update-rapidpro-workspace-settings@master'
      with:
        directory: 'my_app_folder'
        hostname: myapp.staging.company.org
        username: ${{ secrets.STAGING_USERNAME }}
        password: ${{ secrets.STAGING_PASSWORD }}
        url: my.rapidpro.workspace.url
        token: ${{ secrets.STAGING_TOKEN }}
        value_key: medic.credentials.key
        group: ${{ secrets.STAGING_GROUP }}
        flows: ${{ secrets.STAGING_FLOWS }}
        write_patient_state_flow: ${{ secrets.STAGING_WRITE_PATIENT_STATE_FLOW }}
```