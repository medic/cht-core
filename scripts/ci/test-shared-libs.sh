#!/bin/bash
# test-shared-libs.sh
# Custom script to test all shared-libs sequentially and print a clean summary
# of any failing workspaces at the end.

set -e

# Force colors in mocha and other node tools even when piping
export FORCE_COLOR=1

# Disable exit on error temporarily so we can catch failing tests across the loop
set +e

FAILED_LIBS_DETAILS=""
FAILED_LIBS_SUMMARY=""
FAIL_COUNT=0
FINAL_EXIT_CODE=0
LIBS_DIR="shared-libs"
SEPARATOR="========================================================"

echo "--------------------------------------------------------"
echo "Starting Shared Libs Unit Tests..."
echo "--------------------------------------------------------"

for lib in "$LIBS_DIR"/*/; do
  # Skip if it's not a real directory
  [[ -d "$lib" ]] || continue

  if [[ ! -f "$lib/package.json" ]] || ! grep -q '"test":' "$lib/package.json" 2>/dev/null; then
    continue
  fi

  # Remove trailing slash and extract the pure folder name
  lib_name=$(basename "$lib")
  
  echo ""
  echo ">>> Testing shared-lib: $lib_name"
  echo "--------------------------------------------------------"
  
  # Run the unit test for this isolated workspace
  # Pipe through tee to capture output for identifying failing test names
  TEST_OUTPUT_FILE=$(mktemp "/tmp/cht_test_output_${lib_name}.XXXXXXXX.log")
  
  npm test --prefix "$lib" 2>&1 | tee "$TEST_OUTPUT_FILE"
  
  # Capture the exit status of the npm command (not tee)
  exit_status=${PIPESTATUS[0]}
  
  if [[ $exit_status -ne 0 ]]; then
    echo "shared-lib '$lib_name' FAILED."
    
    # Store the first failing exit code we encounter to use at the end
    if [[ "$FINAL_EXIT_CODE" -eq 0 ]]; then
      FINAL_EXIT_CODE=$exit_status
    fi

    FAILED_LIBS_SUMMARY="$FAILED_LIBS_SUMMARY\n  - $LIBS_DIR/$lib_name"
    
    # Extract failing test names for the short summary (stripping ANSI color codes)
    # We look for the Mocha failure summary section at the end of the log
    # We skip to the part after "[0-9]+ failing" to avoid catching progress logs
    FAIL_LINES=$(sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2};?)?)?[mGK]//g" "$TEST_OUTPUT_FILE" | \
      awk '/[0-9]+ failing/ { start=1; next } 
           start && /^[[:space:]]*[0-9]+\)/ { 
             sub(/^[[:space:]]*[0-9]+\) /, "");
             sub(/[[:space:]]*$/, "");
             line=$0; 
             if (getline > 0) {
               sub(/^[[:space:]]+/, "");
               sub(/[[:space:]]*$/, "");
               if ($0 != "" && $0 !~ /Error/ && $0 !~ /^[0-9]+\)/) {
                 print line " " $0 
               } else {
                 print line
               }
             } else {
               print line
             }
           }' | sort -u || true)
    
    if [[ -n "$FAIL_LINES" ]]; then
      while IFS= read -r test_name; do
        if [[ -n "$test_name" && "$test_name" != "null" ]]; then
          FAILED_LIBS_SUMMARY="$FAILED_LIBS_SUMMARY\n      ✖ $test_name"
        fi
      done <<< "$FAIL_LINES"
    fi

    # Extract the full failure details from the end of the log.
    # We look for the detailed failures section which appears after the summary line.
    DETAILS=$(sed -r "s/\x1B\[([0-9]{1,3}(;[0-9]{1,2};?)?)?[mGK]//g" "$TEST_OUTPUT_FILE" | \
      awk '/[0-9]+ failing/ { start=1; next } start && /^[[:space:]]*1\)/ { flag=1 } flag' || true)
    
    if [[ -z "$DETAILS" ]]; then
       # Fallback: if no mocha-style failures summary found, just capture the last 15 lines
       DETAILS=$(tail -n 15 "$TEST_OUTPUT_FILE")
    fi

    if [[ -n "$DETAILS" ]]; then
      FAILED_LIBS_DETAILS="$FAILED_LIBS_DETAILS\n\n$SEPARATOR\nFailures details for $lib_name:\n$DETAILS"
    fi
    
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  
  rm -f "$TEST_OUTPUT_FILE"
done

echo ""
echo "$SEPARATOR"
echo "Shared Libs Test Suite Complete"
echo "$SEPARATOR"

if [[ $FAIL_COUNT -gt 0 ]]; then
  echo -e "ERROR: The following $FAIL_COUNT shared lib(s) failed their tests:" >&2
  echo -e "$FAILED_LIBS_SUMMARY"
  echo -e "$FAILED_LIBS_DETAILS\n"
  echo "$SEPARATOR"
  exit "$FINAL_EXIT_CODE"
fi
