#!/bin/bash
export SENTINEL_TEST=true

SOURCE="${BASH_SOURCE[0]}"
DIR="$( dirname "$SOURCE" )"
while [ -h "$SOURCE" ]
do
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
  DIR="$( cd -P "$( dirname "$SOURCE"  )" && pwd )"
done
DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
NODEUNIT="node $DIR/../node_modules/nodeunit/bin/nodeunit --reporter=minimal "
#NODEUNIT="node --debug-brk $DIR/../node_modules/nodeunit/bin/nodeunit --reporter=minimal "

cd $DIR
$NODEUNIT unit
