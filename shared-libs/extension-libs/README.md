# Extension libraries

The `extension-libs` CouchDB document contains trusted JavaScript attachments supplied by an application.
CHT Core loads each attachment as a CommonJS module and exposes its `module.exports` value to supported runtime APIs.

Function exports can be used as Mustache section helpers in translations and outgoing message templates. The helper name
is the attachment filename without a trailing `.js`:

```js
// Attachment: to_devanagari.js
module.exports = value => value.replace(/\d/g, digit => '०१२३४५६७८९'[digit]);
```

```mustache
ID: {{#to_devanagari}}{{patient_id}}{{/to_devanagari}}
```

Extension libraries are trusted configuration and are not sandboxed. Only authorized administrators should be allowed
to update the document.

## Failure and naming behavior

- Test every configured template before deployment. Mustache omits the content of a positive section when its name is
  missing or misspelled; CHT Core logs a warning when it detects this.
- An extension helper is ignored when its name conflicts with a built-in helper or a top-level template data property.
- If multiple attachments map to the same helper name, the first helper is used and the duplicate is ignored.
- If a helper throws while rendering, CHT Core logs the error and uses the rendered, untransformed section content.
- The webapp loads libraries before rendering and reloads them when the `extension-libs` document changes. API and
  Sentinel also reload on document changes, while App Management loads the current document for each queue query.
