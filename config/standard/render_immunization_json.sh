#!/bin/bash

# Very simple script to generate the json for forms. It creates the json for the "forms" section, as well as that for the "patient_reports" section. You'll have to manually copy the output text into app_settings.

GENERATED_FORMS="generated_forms.json.tmp"
GENERATED_PATIENT_REPORTS="generated_patient_reports.json.tmp"

rm "${GENERATED_FORMS}"
rm "${GENERATED_PATIENT_REPORTS}"

set -e

while IFS=, read col1 col2
do
    echo "| $col1 | $col2 |"
    cat template_form.json.ish >> "${GENERATED_FORMS}"
    sed -i -r -e "s/\{\{FORM_CODE\}\}/$col1/g" "${GENERATED_FORMS}"
    sed -i -r -e "s/\{\{FORM_NAME\}\}/$col2/g" "${GENERATED_FORMS}"

    cat template_patient_report.json.ish >> "${GENERATED_PATIENT_REPORTS}"
    sed -i -r -e "s/\{\{FORM_CODE\}\}/$col1/g" "${GENERATED_PATIENT_REPORTS}"
    sed -i -r -e "s/\{\{FORM_NAME\}\}/$col2/g" "${GENERATED_PATIENT_REPORTS}"

done < immunization_forms.csv
