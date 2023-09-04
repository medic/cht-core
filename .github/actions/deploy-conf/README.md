# deploy-conf Shared GitHub Action
The `deploy-conf` is a parameterised reusable GitHub action that deploys of CHT applications to a running CHT instance.

## CHT App Requirements
* cht-conf@3.3 or above

## Example GitHub Step

```
name: Example GitHub Workflow yml

on: ['deployment']

jobs:
  deployment:
    runs-on: ubuntu-22.04
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18.x

    - name: Push my CHT app to staging
      uses: 'medic/cht-core/deploy-conf@master'
      with:
        directory: 'my_app_folder'
        hostname: myapp.staging.company.org
        username: ${{ secrets.STAGING_USERNAME }}
        password: ${{ secrets.STAGING_PASSWORD }}
```
