# Example usage of cht-form

This simple web page provides an example of how to use the `cht-form` web component. Simply build the web component and then open the [`index.html` file](index.html) in a browser.

## Building the web component

To build the web component, run the following command from the `./webapp` directory:

```shell
npm run build:cht-form
```

This will build the `cht-form` component and place the build artifacts in the `./build/cht-form` directory (where they are referenced by the example `index.html`).

## Loading new forms

_NOTE: Requires Node 18+_

By default, this example page just displays the `enketo_widgets` form.  However, additional forms can be fetched to display by using the `fetchFormData.js` script.  This script will fetch the form data from the configured (running) CHT instance and save it in this directory. Simply set the `COUCH_URL` envar to your desired instance and run the script with the form id (the `_id` value of the form document in the CouchDB) as the argument.  For example:

```shell
COUCH_URL=http://medic:password@localhost:5984/medic node fetchFormData.js form:delivery
```
