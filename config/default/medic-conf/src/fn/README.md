# Actions

Actions are defined as usable if they exist in this directory.

Their module should look something like this:

```js
module.exports = {
  requiresInstance: true,
  execute: async () => {
    ...
  }
};
```

## Module Exports

|Field|Required|Notes|
|---|---|---|
|`requiresInstance`|Optional, defaults to `true`|The action needs the user to have provided a instance location, e.g. via `--local` or `--instance`|
|`execute`|Required|The function that is run when the action is executed.|
