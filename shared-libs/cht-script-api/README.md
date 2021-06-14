# CHT Script API

The CHT Script API library provides the following functions:

| Function | Arguments | Description |
| -------- | --------- | ----------- |
| setChtCoreSettingsDoc | Object, CHT-Core settings DB document | Sets the library's cache to access this document synchronously |
| setUserSettingsDoc | Object, user settings DB document | Sets the library's cache to access this document synchronously |
| getApi | | Returns an object of api versions, where every version contains the available functions, example: `v1.hasPermission('can_edit')` |

## API v1

The API v1 is defined as follows:

| Function | Arguments | Description |
| -------- | --------- | ----------- |
| hasPermission | String, permission name | Returns true if the current user has the permission, otherwise returns false |
