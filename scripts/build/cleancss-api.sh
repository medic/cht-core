#!/bin/bash

set -e

echo "cleancss-api: cleaning"
cleancss api/build/static/login/style.css > out.css
mv out.css api/build/static/login/style.css
echo "cleancss-api: done"
