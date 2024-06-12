#!/bin/bash

pathToDocs="/home/mrjones/Documents/MedicMobile/cht-docs/content/en/core/releases/"

## declare an array variable
declare -a arr=("4.0.0" "4.0.1" "4.1.0" "4.1.1" "4.1.2" "4.2.0" "4.2.1" "4.2.2" "4.2.3" "4.2.4" "4.3.0" "4.3.1" "4.3.2" "4.4.0" "4.4.1" "4.4.2" "4.5.0" "4.5.1" "4.5.2" "4.6.0" "4.7.0" "4.7.1" "4.8.0")

for current in "${arr[@]}"
do
   if [[ $current == "4.0.0" ]]; then
     prior="3.17.2"
   fi
   echo "saving version $current to ${pathToDocs}$current.md"
   node index.js cht-core $current $prior >> ${pathToDocs}$current.md
   prior=$current
done
