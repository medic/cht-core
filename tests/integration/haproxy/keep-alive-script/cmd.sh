#!/bin/sh

set -e

data='{"user":"'$USER'","password":"'$PASSWORD'"}'

curl -v POST 'http://api:5988/medic/login' -d "$data" -H 'Content-Type:application/json'

