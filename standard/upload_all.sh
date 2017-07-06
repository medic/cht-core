#!/bin/bash

# Upload all configurable bits for standard projects

# You'll need
# - a medic DB with webapp before running this script.
# - pyxform : https://github.com/medic/pyxform (including setup: install xlrd)
# - medic-webapp scripts : https://github.com/medic/medic-webapp/tree/master/scripts
# - cd medic-projects/scripts; npm install

# MacOS users : you'll need
# brew install gnu-sed --with-default-names
# brew install coreutils

# Checking for minimum sed support
(sed --version 2> /dev/null | grep GNU > /dev/null)
if [[ $? == 1 ]]; then
  echo "The GNU version of sed is required."
  echo "If you are MacOS you can achieve this with:"
  echo "  brew install gnu-sed --with-default-names"
  echo "Or by following other options presented in:"
  echo "  brew info gnu-sed"
  echo "(if you're on linux, congratulations on your impossibly minimal installation)"
  exit 1
fi

CURDIR=`/bin/pwd`

# Checking for realpath
(command -v grealpath || command -v realpath)
if [[ $? == 1 ]]; then
  echo "The realpath command is required"
  echo "If you are on MacOS you can achieve this with:"
  echo "  brew install coreutils"
  echo "(if you're on linux remember you chose this life!)"
  exit 1
fi

SELFPATH=$(grealpath "$0" 2>/dev/null || realpath "$0")
SELFDIR=$(dirname $SELFPATH)
SELF=$(basename $SELFPATH)

set -e

verbose='false'
getxlsforms='false'
rewriterules='false'

_usage () {
    echo ""
    echo ""
    echo "Usage:"
    echo "  $SELF [options] [-f form_names]"
    echo ""
    echo "Options:"
    echo "  -g get xlsforms from drive"
    echo "  -h show this help"
    echo "  -r rewrite the rules in app_settings.json"
    echo "  -v verbose"
    echo ""
    echo "Example: "
    echo "  COUCH_URL=http://localhost:8000/medic"
    echo "  PYTHON=C:/Program Files/Python/Python27/python.exe"
    echo "          ^ must be python 2 not 3"
    echo "  PYXFORM=/path/to/pyxform/pyxform/xls2xform.py"
    echo "  UPLOAD_SCRIPT=/path/to/medic-webapp/scripts/upload_xform.sh"
    echo "  CONVERT_SCRIPT=/path/to/medic-projects/scripts/convert.sh"
    echo "  $SELF"
    echo ""
    echo "NB: Relative paths in env vars are not supported!"
}

while getopts ':hgrv' flag; do
  case "${flag}" in
    h) _usage && exit 0 ;;
    g) getxlsforms='true' ;;
    r) rewriterules='true' ;;
    v) verbose='true' ;;
    *) echo "Unexpected option ${flag}" && _usage && exit 1 ;;
  esac
done

test "${verbose}" = 'true' && set -ex && verbose_flag="-v"


# All settings, including JSON forms
# - app_settings.json
echo
echo "UPLOADING APP SETTINGS"
"${SELFDIR}/../../scripts/upload_app_settings.sh" "${SELFDIR}/app_settings.json" ${verbose_flag}

if $rewriterules
then
  # Task, Target, and Contact summary
  # Pulls in edits from the following files into app settings:
  # - tasks-rules.js
  # - task-scheduled.js
  # - targets.json
  # - contact-summary.js
  echo
  echo "REUPLOADING APP SETTINGS WITH RULES, SUMMARY"
  "${SELFDIR}/../../scripts/update_tasks.sh" -u ${verbose_flag}
fi

if $getxlsforms
then
  # Get the latest XLSForms to add/edit People and Places
  echo
  echo "DOWNLOAD PERSON+PLACE XLSFORMS"
  pushd ..
  node "${SELFDIR}/../../scripts/download-xlsforms-from-drive.js"
  popd
  echo
fi

# XForms to add/edit People
# Converts and uploads the following contact forms
# - person-create.xlsx
# - person-edit.xlsx
echo
echo "UPLOADING PEOPLE FORMS"
pushd ..
"${SELFDIR}/../process_person_forms.sh" -u ${verbose_flag}
popd

# XForms to add/edit Places
# Converts the following into forms for each level of the hierarchy
# - PLACE_TYPE-create.xlsx
# - PLACE_TYPE-edit.xlsx
echo
echo "UPLOADING PLACE FORMS"
pushd ..
"${SELFDIR}/../process_place_forms.sh" -u ${verbose_flag}
popd

# XForms for actions
# Use -U, not -u, to avoid overwriting `tag="hidden"` in XML
# - {{form}}.xlsx
if $getxlsforms
then
  echo
  echo "DOWNLOAD ACTION XLSFORMS"
  node "${SELFDIR}/../../scripts/download-xlsforms-from-drive.js"
fi
echo
echo "UPLOADING ACTION FORMS"
# export XLSFORMS="${SELFDIR}/pregnancy ${SELFDIR}/pregnancy_visit ${SELFDIR}/delivery ${SELFDIR}/postnatal_visit ${SELFDIR}/immunization_visit"
export XLSFORMS="${SELFDIR}/pregnancy ${SELFDIR}/pregnancy_visit ${SELFDIR}/delivery"
"${SELFDIR}/../../scripts/convert.sh" -U ${verbose_flag}

# Translations
# - messages-{{locale_code}}.properties
echo
echo "UPLOADING TRANSLATIONS"
node "${SELFDIR}/../../scripts/upload_translations.js" "${COUCH_URL}"

# Icons
# - icons/{{icon_name}}.png
echo
echo "UPLOADING ICONS"
node "${SELFDIR}/../../scripts/upload_icons.js" "${COUCH_URL}"
