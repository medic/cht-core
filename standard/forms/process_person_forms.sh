#!/bin/sh

# set -ex

SELF="$(basename $0)"
SELFPATH=$(grealpath "$0" 2>/dev/null || realpath "$0")
SELFDIR=$(dirname $SELFPATH)

verbose='false'
upload='false'
upload_only='false'

CONVERTER="${CONVERT_SCRIPT-../scripts/convert.sh}"
UPLOADER="${UPLOAD_SCRIPT-upload_xform.sh}"

PLACE_TYPE_MARKER="PLACE_TYPE"
PLACE_NAME_MARKER="PLACE_NAME"

FORM_TYPES=("create" "edit")

_usage () {
    echo ""
    echo "This script converts and uploads forms to edit and create places. It can generate the forms for different place types from a single seed file."
    echo ""
    echo "Usage:"
    echo "  $SELF [options]"
    echo ""
    echo "Options:"
    echo "  -u upload after conversion"
    echo "  -U upload only, no conversion"
    echo "  -v verbose"
    echo "  -h show this help"
    echo ""
    echo "Example: "
    echo "  COUCH_URL=http://user:password@localhost:8000/medic"
    echo "  PYTHON_PATH=C:/Program Files/Python/Python27/python.exe"
    echo "  PYXFORM_PATH=../../pyxform/pyxform/xls2xform.py"
    echo "  CONVERT_SCRIPT=/path/to/medic-projects/scripts/convert.sh"
    echo "  UPLOAD_SCRIPT=/path/to/medic-webapp/scripts/upload_xform.sh"
    echo "  $SELF -u"
}

while getopts 'f:huUv' flag; do
  case "${flag}" in
    f) FORMS=($OPTARG) ;;
    h) _usage && exit 0 ;;
    u) upload='true' ;;
    U) upload_only='true' ;;
    v) verbose='true' ;;
    *) echo "Unexpected option ${flag}" && _usage && exit 1 ;;
  esac
done

test "${verbose}" = 'true' && set -x

for k in "${!FORM_TYPES[@]}"
do
  # CONVERT FILES
  if [ "${upload_only}" = 'true' ]
  then
    upload='true'
  else

    cp "${SELFDIR}/person-${FORM_TYPES[$k]}.xlsx" data.xlsx

    echo ""
    echo "Converting the ${FORM_TYPES[$k]} Person form: person-${FORM_TYPES[$k]}.xlsx"

    "$CONVERTER" -f data

    sed -i.sedbak '/DELETE_THIS_LINE/d' data.xml
    sed -i.sedbak 's/NO_LABEL//' data.xml
    sed -i.sedbak 's/default=\"true()\" //' data.xml

    # Move person to above edit_parent
    #   mv <person>...</person> to just after </inputs>
    sed -e '/<person>/,/<\/person>/!d' data.xml > data.tmp \
    && sed -i.sedbak -e '/<person>/,/<\/person>/d' data.xml \
    && sed -i.sedbak -e '/<\/inputs>/ r data.tmp' data.xml

    cp data.xml "person-${FORM_TYPES[$k]}.xml"

    rm *.sedbak

    rm data.tmp
    rm data.xml
    rm data.xlsx

  fi

  # UPLOAD FILES
  if [ "${upload}" = 'true' ]
  then
      filename="person-${FORM_TYPES[$k]}.xml"

      echo ""
      echo "Uploading the ${FORM_TYPES[$k]} Person form: ${filename}"

      "${UPLOADER}" -f "contact:person:${FORM_TYPES[$k]}" "${filename}"
  fi

done
