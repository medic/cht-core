# Applying Sample Custom Contact Types


1. Download the current JSON settings file from your instance.  This is found under the hamburger menu in the upper right under "App Management" -> "Backup app code" -> "Download current settings".  The resulting file will be named `settings_YEAR-MONTH-DAY.json`. We'll now refer to this as the `app_settings.json` file, as that's what it's called when using `medic-conf`. 
1. Edit the `app_settings.json` file and replace the existing `contact_types` JSON with the contents of [contact_types.json](contact_types.json)
1. Upload the changed  `app_settings.json` file by navigating to the same spot as it step #1, but choose "Upload application code" instead. 
1. Download the English language file from the "App Management" -> "Display" -> "Languages" -> "English" -> "Download"
1. Add the translation keys in [en_translations](en_translations.properties)
1. Upload the translation file from "App Management" -> "Display" -> "Languages" -> "English" -> "Upload" 
1. Upload the contact forms using medic-conf `medic-conf <instance> upload-contact-forms`
1. Now you will have a few custom contact types added to your instance. You can see the custom places at each level of the hierarchy
and the custom Doctor type. 
