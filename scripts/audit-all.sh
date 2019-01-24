#!/bin/bash
dirsToAudit=$(find . -type f -not -path "*/node_modules*/*" -name "package.json" | awk '{print substr($0,0,length()-13);}')

for i in ${dirsToAudit[@]}; do
  (cd $i && npm audit --package-lock-only --json | jq -r '.advisories | to_entries[] | "[\(.value.severity)] \(.value.title) in \(.value.module_name) (#\(.key))"' | sed "s|$| in ${i}|")
done
