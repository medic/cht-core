# Demo Forms

## Intro

These forms can be used to quickly test specific XForm features. For example, if you load the `geopoint` form, you can test the Enketo Geopoint feature in an isolated way without having to worry if other form fields might be causing issues.

## Loading

The forms can be loaded via the [web admin GUI](https://docs.communityhealthtoolkit.org/apps/features/admin/) or through the command line using `medic-conf`.

### Admin Web GUI

1. Log into your CHT instance as an admin user. Go to the "App Forms" in "App Management" section at `/admin/#/forms`
1. At the top of the page under "Upload app forms", under "XML" choose "Browse..." and find the XML of the form you want to add in the `demo-forms` directory (eg. `geopoint.xml`).
1. Under "Meta" choose "Browse..." again and select `app-form.properties.json`
1. Submit the new form by clicking "Upload".  You should see a brief spinner and the "Upload app forms" section will reset to being empty as you first found it.
1. Navigate back to the reports page of the app at `/#/reports/` and under the lower left "Submit report", you should now see your new form (e.g. "Geopoint Demo Form").

### medic conf

1. Copy the form you want to upload from the `demo-forms` to the `config/default/forms/app` directory. For the `geopoint.xml` form, if you were in the root of this repo, that would be: `cp demo-forms/geopoint.xml config/default/forms/app/`
1. Change to the default config `cd config/default`
1. Run `medic-conf` specifying the `upload-app-forms` command along with the specific form you want to upload. This example uses the `geopoint` form.  Note that the trailing `.xml` is not included: `medic-conf --local upload-app-forms -- geopoint`


### Custom contact types

See [custom_contacts](custom_contacts/README.MD) for sample forms and config for a few custom contact types. 