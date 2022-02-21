# dynamic-rapidpro-workspace Shared GitHub Action
The `dynamic-rapidpro-workspace-settings` is a parameterised reusable GitHub action that updates app-settings prior to compiling and uploading to a running CHT app.

### Background
This action is relevant for CHT apps that have either [outbound](https://docs.communityhealthtoolkit.org/apps/reference/app-settings/outbound/) integrations with RapidPro or logic that requires RapidPro workspace data GUIDs.
Normally, you would want a staging deployment to use the staging workspace and a production deployment to use the corresponding production workspace. This action automates the process of updating `app_settings.json` to use relevant UUIDs.

### How it works
1. It adds the configured `value_key` to CouchDB’s config storage to securely store the [credentials](https://docs.communityhealthtoolkit.org/apps/reference/app-settings/outbound/#credentials).
2. This action automatically updates the following details in outbound modules:
   - `base_url` and `value_key`
   - contact group UUID, if using the [groups endpoint](https://rapidpro.app.medicmobile.org/api/v2/groups). Note that the action was tested with one group.
   - flow UUID, if using the [flow starts endpoint](https://rapidpro.app.medicmobile.org/api/v2/flow_starts). Note that the action was tested with one flow in two modules.
3. It replaces contents of a file, `flows.js`, in the project repository with flow UUIDs obtained from RapidPro workspace through the API. To extract the UUIDs, you can simply use the API explorer, under `/api/v2/flows.json`. A sample `flows.js` would be as follows:

```
const RAPIDPRO_FLOWS = {
  sample_flow_1_uuid: '3f6a48d3-703a-493b-bb10-f4a38a442cda',
  sample_flow_2_uuid: '064107cf-9bc5-4042-a657-825fdb5a92a4',
  ...
};

module.exports = RAPIDPRO_FLOWS;
```

> **This action can be executed jointly with other Github actions like [deploy-with-medic-conf](https://github.com/medic/cht-core/tree/master/.github/actions/deploy-with-medic-conf). However, it must be executed before other actions to update dependencies prior to compiling app settings.** 

## CHT App Requirements
* cht-conf@3.3 or above

## Example GitHub Action Step

```
name: Example GitHub Workflow yml

on: ['workflow_dispatch']

jobs:
  workflow_dispatch:
    runs-on: ubuntu-18.04

    steps:
    - name: Update rapidpro workspace in app-settings 
      uses: 'medic/cht-core/.github/actions/dynamic-rapidpro-workspace-settings@master'
      with:
        directory: 'my_app_folder'
        hostname: myapp.staging.company.org
        couch_node_name: myapp.couchdb.node.name
        couch_username: ${{ secrets.CHT_STAGING_USERNAME }}
        couch_password: ${{ secrets.CHT_STAGING_PASSWORD }}
        rp_hostname: my.rapidpro.workspace.url
        rp_api_token: ${{ secrets.RAPIDPRO_STAGING_TOKEN }}
        value_key: medic.credentials.key
        rp_contact_group: ${{ secrets.RAPIDPRO_STAGING_GROUP }}
        rp_flows: ${{ secrets.RAPIDPRO_STAGING_FLOWS }}
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
