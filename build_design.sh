#!/bin/bash
KANSO=node_modules/kanso/bin/kanso

$KANSO install designs
$KANSO show designs > designs/base.json
