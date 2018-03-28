#!/bin/sh

# DON'T EDIT THIS FILE DIRECTLY! Edit the original file in medic-projects (private to Medic Mobile),
# and update this one to reflect it.
# This file is to make the script publicly accessible.

set -e

SELF=$(basename $0)
SELF_DIR=$(dirname $0)
DIR=$(dirname $0)
SET_DIR=false
SETTINGS_FILE='app_settings.json'
RULES_FILE='task-rules.js'
SCHEDULES_FILE='task-schedules.json'
TARGETS_FILE='targets.json'
upload_only=false

_usage () {
    echo ""
    echo ""
    echo "Usage:"
    echo "  $SELF [options]"
    echo ""
    echo "Options:"
    echo "  -a <file> output file, for app_settings"
    echo "  -d <directory> use the files in this directory"
    echo "  -r <file> input file, for rules"
    echo "  -s <file> input file, for task schedules"
    echo "  -t <file> input file, for targets"
    echo "  -u upload after conversion"
    echo "  -U upload only, no conversion"
    echo "  -v verbose"
    echo "  -h show this help"
    echo ""
    echo "Examples: "
    echo "  COUCH_URL=http://localhost:8000/medic"
    echo "  PYTHON_PATH=C:/Program Files/Python/Python27/python.exe"
    echo "  $SELF -d 'project-name'"
    echo "  $SELF -r '/project-name/task-rules.js' -s '/project-name/task-schedules.json'"
}

while getopts ':a:d:r:s:t:huUv' flag; do
  case "${flag}" in
    a) SETTINGS_FILE="$OPTARG";;
    d) SET_DIR=true && DIR="${OPTARG%/}";;
    h) _usage && exit 0 ;;
    r) RULES_FILE="$OPTARG";;
    s) SCHEDULES_FILE="$OPTARG";;
    t) TARGETS_FILE="$OPTARG";;
    u) upload=true ;;
    U) upload_only=true ;;
    v) python -V && set -x ;;
    *) echo "Unexpected option ${flag}" && _usage && exit 1 ;;
  esac
done
shift $(expr $OPTIND - 1 )

if $SET_DIR
then
  echo "Using files in: '$DIR'"
  SETTINGS_FILE="$DIR/$SETTINGS_FILE"
  RULES_FILE="$DIR/$RULES_FILE"
  SCHEDULES_FILE="$DIR/$SCHEDULES_FILE"
  TARGETS_FILE="$DIR/$TARGETS_FILE"
fi

echo
echo "  Settings:   '$SETTINGS_FILE'"
echo "  Rules:      '$RULES_FILE'"
echo "  Schedules:  '$SCHEDULES_FILE'"
echo "  Targets:    '$TARGETS_FILE'"
echo

HOST_PATH="${SELF_DIR}/host.py"
if [ ! -f $HOST_PATH ]
then
  HOST_PATH="$(echo "/$0" | sed -e 's/\\/\//g' -e 's/://')"
  HOST_PATH="$(dirname $HOST_PATH)/host.py"
  echo "Cannot find host.py, trying: $HOST_PATH"
fi

FOUND_PYTHON=$(whereis python)
DEFAULT_PYTHON=${FOUND_PYTHON-C:/Program Files/Python/Python27/python.exe}
PYTHON_PATH="${PYTHON-$DEFAULT_PYTHON}"

DB="${COUCH_URL-http://127.0.0.1:5984/medic}"
HOST=$("${PYTHON_PATH}" ${HOST_PATH} "$DB")

SETTINGS_TMP_FILE="$DIR/app_settings.json.tmp"
SETTINGS_BAK_FILE="$DIR/app_settings[$(date +"%Y-%m-%d_%H-%M-%S")_from_${HOST}].json.bak"
SETTINGS_OLD_FILE="$DIR/app_settings[$(date +"%Y-%m-%d_%H-%M-%S")].json.old.bak"
TASKS_TMP_FILE="$DIR/tasks.json.tmp"

# Get app_settings to make sure we dont overwrite someone else's changes
curl ${DB}/api/v1/settings > "$SETTINGS_BAK_FILE"

if $upload_only
then
  upload=true
else
  # Backup local app_setting.json
  if [ -f "$SETTINGS_FILE" ]
  then
    cp "$SETTINGS_FILE" "$SETTINGS_OLD_FILE"
  fi

  # Combine task-rules.js and task-schedules.json into tasks.json.tmp
  if [ ! -f "$RULES_FILE" ]
  then
    echo "Cannot find rules file: '$RULES_FILE'"
    echo "If you only want to upload app_settings then make sure to use the -U option"
    echo
    _usage
    exit 1
  fi

  printf '{ "tasks": {"rules": "' > "$TASKS_TMP_FILE"
  sed -E -e 's_//.*$__' "$RULES_FILE" | tr -d '\n' >> "$TASKS_TMP_FILE"

  if [ -f "$SCHEDULES_FILE" ]
  then
    printf '",' >> "$TASKS_TMP_FILE"
    cat "$SCHEDULES_FILE" >> "$TASKS_TMP_FILE"
  else
    echo "Cannot find schedules file: '$SCHEDULES_FILE'"
    exit 1
  fi

  if [ -f "$TARGETS_FILE" ]
  then
    printf ', ' >> "$TASKS_TMP_FILE"
    cat "$TARGETS_FILE" >> "$TASKS_TMP_FILE"
  else
    echo "Cannot find targets file: '$TARGETS_FILE'"
    exit 1
  fi
  printf '} }' >> "$TASKS_TMP_FILE"

  # jq can't have brackets in file names
  cp "$SETTINGS_BAK_FILE" "$SETTINGS_TMP_FILE"

  # Push tasks.json.tmp into app_settings.json
  jq -s ".[0] * .[1]" "$SETTINGS_TMP_FILE" "$TASKS_TMP_FILE"  > "$SETTINGS_FILE"

  # Remove temp files
  # rm "$TASKS_TMP_FILE"
  rm "$SETTINGS_TMP_FILE"
fi

# Upload app_setting.json
test $upload && curl -v -d @"$SETTINGS_FILE" -X PUT -H "Content-Type: application/json" ${DB}/_design/medic/_rewrite/update_settings/medic?replace=1

echo "[$0] Completed successfully."
