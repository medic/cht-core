# CHT Script API

The CHT Script API library is intended to be agnostic and simple. It provides a versioned API from feature modules.

## API v1

The API v1 is defined as follows:

| Function | Arguments | Description |
| -------- | --------- | ----------- |
| hasPermissions | String or array of permission name(s).<br>Array of user roles.<br>Object of configured permissions in CHT-Core's settings. | Returns true if the user has the permission(s), otherwise returns false |
| hasAnyPermission | Array of groups of permission name(s).<br>Array of user roles.<br>Object of configured permissions in CHT-Core's settings. | Returns true if the user has all the permissions of any of the provided groups, otherwise returns false |
