#!/bin/bash

set -e

echo "cleancss-admin: cleaning"
cleancss api/build/static/admin/css/main.css > out.css
mv out.css api/build/static/admin/css/main.css
echo "cleancss-admin: done"
