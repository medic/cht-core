# Applying Sample Custom Contact Types


1. Download the current JSON settings file from your instance.  This is found under the hamburger menu in the upper right under "App Management" -> "Backup app code" -> "Download current settings".  The resulting file will be named `settings_YEAR-MONTH-DAY.json`. We'll now refer to this as the `app_settings.json` file, as that's what it's called when using `medic-conf`. 
1. Edit the `app_settings.json` file and replace the existing `contact_types` JSON with the contents of [contact_types.json](contact_types.json).  Use care to ensure the JSON file is still valid.  If the JSON isn't valid, you will see a red "Upload failed" below the upload button.
1. Upload the changed  `app_settings.json` file by navigating to the same spot as it step #1, but choose "Upload application code" instead. 
1. Download the English language file from the "App Management" -> "Display" -> "Languages" -> "English" -> "Download"
1. Add the translation keys in [en_translations](en_translations.properties) to the end of the `messages-en.properties` file you downloaded in the prior step.
1. Upload the edited `messages-en.properties` translation file from "App Management" -> "Display" -> "Languages" -> "English" -> "Upload" 
1. Upload the included contact forms with `medic-conf`. Ensure you're in the `cht-core/demo-forms/custom_contacts` directory and call:  `medic-conf <instance> upload-contact-forms`
1. Now you will have a few custom contact types added to your instance. For example if you choose to "Add place" the option for "New NGO" will now be visible and you when you select "Add Person" for a facility you will see "New Doctor".
