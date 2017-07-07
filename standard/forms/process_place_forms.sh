#!/bin/sh

# set -ex

SELF="$(basename $0)"
SELFPATH=$(grealpath "$0" 2>/dev/null || realpath "$0")
SELFDIR=$(dirname $SELFPATH)

OUTPUT_DIR="contact"
BACKUP_DIR="${OUTPUT_DIR}/_backups"

[ -d "${OUTPUT_DIR}" ] || mkdir -p "${OUTPUT_DIR}"
[ -d "${BACKUP_DIR}" ] || mkdir -p "${BACKUP_DIR}"

verbose='false'
upload='false'
upload_only='false'

CONVERTER="${CONVERT_SCRIPT-../scripts/convert.sh}"
UPLOADER="${UPLOAD_SCRIPT-upload_xform.sh}"

PLACE_TYPE_MARKER="PLACE_TYPE"
PLACE_NAME_MARKER="PLACE_NAME"

PLACE_TYPES=( district_hospital health_center clinic )
PLACE_NAMES=( "District" "Health Center" "Area" )

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
    echo "  PYTHON=C:/Program Files/Python/Python27/python.exe"
    echo "  PYXFORM=../../pyxform/"
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
    # COMMON FOR ALL PLACES

    [ -f "data.xlsx" ] && rm "data.xlsx"
    
    cp "${SELFDIR}/${PLACE_TYPE_MARKER}-${FORM_TYPES[$k]}.xlsx" data.xlsx

    "$CONVERTER" -f data

    # Remove unwanted labels
    sed -i.sedbak '/DELETE_THIS_LINE/d' data.xml
    sed -i.sedbak 's/NO_LABEL//' data.xml
    sed -i.sedbak 's/default=\"true()\" //' data.xml

    # Move place to above person
    #   eg mv <clinic>...</clinic> to just after </inputs>
    sed -e "/<${PLACE_TYPE_MARKER}>/,/<\/${PLACE_TYPE_MARKER}>/!d" data.xml > data.tmp \
    && sed -i.sedbak -e "/<${PLACE_TYPE_MARKER}>/,/<\/${PLACE_TYPE_MARKER}>/d" data.xml \
    && sed -i.sedbak -e '/<\/inputs>/ r data.tmp' data.xml

    # Move custom place field from init to within place form - so that it isn't saved in place doc
    sed -e '/<input ref="\/data\/init\/custom_place_name">/,/<\/input>/!d' data.xml > data.tmp \
    && sed -i.sedbak -e '/<input ref="\/data\/init\/custom_place_name">/,/<\/input>/d' data.xml \
    && sed -n -i.sedbak -e "/<input ref=\"\/data\/${PLACE_TYPE_MARKER}\/external_id\">/r data.tmp" -e 1x -e '2,${x;p}' -e '${x;p}' data.xml

    # Move new contact person to first page - move the group inside previous group
    if grep -q 'ref="\/data\/contact">' data.xml; then
        sed '/ref="\/data\/contact">/Q' data.xml > data.tmp # store everything until new contact group
        sed -i.sedbak '$ d' data.tmp # remove the closing group tag
        sed -n -e '/ref="\/data\/contact">/,$ p' data.xml | \
        sed -e '/ref="\/data\/contact">/{:a;n;/<\/group>/!ba;i\<\/group>' -e '}' >> data.tmp # print remainder with closing group tag after contact group
        mv data.tmp data.xml
    fi

    # Add space after output field https://github.com/medic/medic-webapp/issues/3324
    sed -i.sedbak 's/<value><output value=" \/data\/init\/contact_name "\/>का /<value><output value=" \/data\/init\/contact_name "\/> का /' data.xml
        
    # SPECIFIC FOR EACH PLACE
    for i in "${!PLACE_TYPES[@]}"
    do
      filename="${OUTPUT_DIR}/${PLACE_TYPES[$i]}-${FORM_TYPES[$k]}.xml"
      filename_bak="${BACKUP_DIR}/${PLACE_TYPES[$i]}-${FORM_TYPES[$k]}.xml.bak"
      
      #backup old one if it exists
      [ -f "${filename}" ] && mv "${filename}" "${filename_bak}"
      
      cp data.xml "${filename}"

      echo ""
      echo "[${i}] Converting the ${FORM_TYPES[$k]} ${PLACE_NAMES[$i]} form: ${filename}"

      sed -i.sedbak "s/${PLACE_TYPE_MARKER}/${PLACE_TYPES[$i]}/g" "${filename}"
      sed -i.sedbak "s/${PLACE_NAME_MARKER}/${PLACE_NAMES[$i]}/g" "${filename}"
      
      [ -f "${filename}.sedbak" ] && rm "${filename}.sedbak"

    done

    [ -f "data.tmp" ] && rm "data.tmp"
    [ -f "data.tmp.sedbak" ] && rm "data.tmp.sedbak"
    [ -f "data.xlsx" ] && rm "data.xlsx"
    [ -f "data.xml" ] && rm "data.xml"
    [ -f "data.xml.sedbak" ] && rm "data.xml.sedbak"

  fi

  # UPLOAD FILES
  if [ "${upload}" = 'true' ]
  then
    for i in "${!PLACE_TYPES[@]}"
    do
      filename="${PLACE_TYPES[$i]}-${FORM_TYPES[$k]}.xml"

      echo ""
      echo "[${i}] Uploading the ${FORM_TYPES[$k]} ${PLACE_NAMES[$i]} form: ${filename}"

      "${UPLOADER}" -f "contact:${PLACE_TYPES[$i]}:${FORM_TYPES[$k]}" "${filename}"
    done
  fi

done
