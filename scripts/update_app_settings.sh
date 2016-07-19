#!/bin/bash

# Usage : update_app_settings.sh ../app_settings_file.json

# Warning : this is meant to update pre-existing app_settings, not create new ones. Whatever fields are already
# in the settings will be updated by the new versions in the settings file you pass, and if the settings file
# doesn't contain some fields, the pre-existing versions of the fields will stick around.
# See https://github.com/medic/medic-webapp/blob/master/packages/app-settings/README.md#update-settings
set -eux

FILE="$1"

curl -v -d @"$FILE" -X PUT -H "Content-Type: application/json" ${COUCH_URL}/_design/medic/_rewrite/update_settings/medic?replace=1
