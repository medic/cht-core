# CHT Script API

The CHT Script API library is intended to be agnostic and simple. It provides a versioned API from feature modules.

| Function | Arguments | Description |
| -------- | --------- | ----------- |
| setChtCoreSettingsDoc | Object, CHT-Core settings DB document | Sets the library's cache to access this document synchronously |
| setUserSettingsDoc | Object, user settings DB document | Sets the library's cache to access this document synchronously |
| getApi | | Returns an object of versioned APIs, where every version contains the available functions, for example: `v1.hasPermission('can_edit')` |

## API v1

The API v1 is defined as follows:

| Function | Arguments | Description |
| -------- | --------- | ----------- |
| hasPermissions | String or array of strings, permission(s) name.<br>Object, User settings document.<br>Object, CHT-Core settings document  | Returns true if the user has the permission(s), otherwise returns false |
| hasAnyPermission | Array of groups of permission(s) name.<br>Object, User settings document.<br>Object, CHT-Core settings document  | Returns true if the user has all the permissions of any of the provided groups, otherwise returns false |
