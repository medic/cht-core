#!/bin/bash

set -e

echo "Checking for dangerous _blank links..."

if (git grep -E 'target\\?="_blank"' -- webapp/src admin/src | grep -Ev 'target\\?="_blank" rel\\?="noopener noreferrer"' | grep -Ev '^\\s*//'); then
  echo 'ERROR: Links found with target="_blank" but no rel="noopener noreferrer" set.  Please add required rel attribute.'
  exit -1;
else
  echo 'No dangerous links found';
fi
