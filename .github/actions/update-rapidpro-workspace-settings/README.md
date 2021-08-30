# update-rapidpro-workspace-settings Shared GitHub Action
The `update-rapidpro-workspace-settings` is a parameterised reusable GitHub action that updates app-settings prior to compiling and uploading to a running CHT instance.

This can be executed jointly with the deployment Github action.

## CHT App Requirements
* medic-conf@3.3 or above

## Example GitHub Action Step

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
        couch_node_name: myapp.couchdb.node.name
        username: ${{ secrets.CHT_STAGING_USERNAME }}
        password: ${{ secrets.CHT_STAGING_PASSWORD }}
        url: my.rapidpro.workspace.url
        token: ${{ secrets.RAPIDPRO_STAGING_TOKEN }}
        value_key: medic.credentials.key
        group: ${{ secrets.RAPIDPRO_STAGING_GROUP }}
        flows: ${{ secrets.RAPIDPRO_STAGING_FLOWS }}
        write_patient_state_flow: ${{ secrets.RAPIDPRO_STAGING_WRITE_PATIENT_STATE_FLOW }}
```

### Example Action Input Variables From RapidPro Workspace

#### token
```
Token cb9affcf72f787d6f0413a3394f32e8cfff0f8ec
```

#### group
```
79abde8c-5f65-4e04-9ee1-4cecdc8852e1
```

#### flows
```
{
  sample_flow_1_uuid: '3f6a48d3-703a-493b-bb10-f4a38a442cda',
  sample_flow_2_uuid: '064107cf-9bc5-4042-a657-825fdb5a92a4',
  ...
}
```
#### write_patient_state_flow
```
c80848e1-72f3-4e86-8e9e-ce002bee4906
```
