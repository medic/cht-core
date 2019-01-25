#!/bin/bash
dirsToAudit=$(find . -type f -not -path "*/node_modules*/*" -not -path '*/scripts/*' -name "package.json" | awk '{print substr($0,0,length()-13);}' | sort)
filter='| select(.value.severity | contains("high","critical"))'

if [[ $1 == "--all" ]]; then
   filter=''
fi

for i in ${dirsToAudit[@]}; do
  (cd $i && npm audit --package-lock-only --json | jq -r ".advisories | to_entries[] $filter | \"[\(.value.severity)] \(.value.title) in \(.value.module_name) (#\(.key))\""  | sed "s|$| in ${i}|")
done
