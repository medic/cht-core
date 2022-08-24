# deploy-with-medic-conf Shared GitHub Action
The `deploy-with-medic-conf` is a parameterised reusable GitHub action that deploys of CHT applications to a running CHT instance.

## CHT App Requirements
* medic-conf@3.3 or above

## Example GitHub Step

```
name: Example GitHub Workflow yml

on: ['deployment']

jobs:
  deployment:
    runs-on: ubuntu-22.04
    steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v1
      with:
        node-version: 10.x

    - name: Push my CHT app to staging
      uses: 'medic/cht-core/deploy-with-medic-conf@master'
      with:
        directory: 'my_app_folder'
        hostname: myapp.staging.company.org
        username: ${{ secrets.STAGING_USERNAME }}
        password: ${{ secrets.STAGING_PASSWORD }}
```
