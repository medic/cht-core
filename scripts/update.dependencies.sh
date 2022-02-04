
# install updates package
#sudo npm i -g updates

# run npm ci to install versions based on package.json
#npm ci
#npm ci --prefix ./admin
#npm ci --prefix ./api
#npm ci --prefix ./sentinel
#npm ci --prefix ./webapp
#npm ci --prefix ./shared-libs/bulk-docs-utils
#npm ci --prefix ./shared-libs/cht-script-api
#npm ci --prefix ./shared-libs/infodoc
#npm ci --prefix ./shared-libs/memdown
#npm ci --prefix ./shared-libs/outbound
#npm ci --prefix ./shared-libs/purging-utils
#npm ci --prefix ./shared-libs/rules-engine
#npm ci --prefix ./shared-libs/server-checks
#npm ci --prefix ./shared-libs/task-utils
#npm ci --prefix ./shared-libs/transitions
#npm ci --prefix ./shared-libs/validation
#npm ci --prefix ./shared-libs/calendar-interval
#npm ci --prefix ./shared-libs/contact-types-utils
#npm ci --prefix ./shared-libs/lineage
#npm ci --prefix ./shared-libs/message-utils
#npm ci --prefix ./shared-libs/phone-number
#npm ci --prefix ./shared-libs/registration-utils
#npm ci --prefix ./shared-libs/search
#npm ci --prefix ./shared-libs/settings
#npm ci --prefix ./shared-libs/tombstone-utils
#npm ci --prefix ./shared-libs/translation-utils
#npm ci --prefix ./shared-libs/view-map-utils

# record minor updates
cat /dev/null > ../minor.txt
echo "core" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,loadash,helmet >> ../minor.txt
echo "">> ../minor.txt
echo "admin" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./admin >> ../minor.txt
echo "">> ../minor.txt
echo "api" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./api >> ../minor.txt
echo "">> ../minor.txt
echo "sentinel" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./sentinel >> ../minor.txt
echo "">> ../minor.txt
echo "webapp" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./webapp >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/bulk-docs-utils" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/bulk-docs-utils >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/cht-script-api" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/cht-script-api >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/infodoc" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/infodoc >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/memdown" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/memdown >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/outbound" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/outbound >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/purging-utils" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/purging-utils >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/rules-engine" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/rules-engine >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/server-checks" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/server-checks >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/task-utils" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/task-utils >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/transitions" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/transitions >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/validation" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/validation >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/calendar-interval" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/calendar-interval >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/contact-types-utils" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/contact-types-utils >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/lineage" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/lineage >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/message-utils" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/message-utils >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/phone-number" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/phone-number >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/registration-utils" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/registration-utils >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/search" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/search >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/settings" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/settings >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/tombstone-utils" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/tombstone-utils >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/translation-utils" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/translation-utils >> ../minor.txt
echo "">> ../minor.txt
echo "shared-libs/view-map-utils" >> ../minor.txt
updates --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/view-map-utils >> ../minor.txt


# save minor updates
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,loadash,helmet
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./admin
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./api
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./sentinel
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./webapp
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/bulk-docs-utils
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/cht-script-api
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/infodoc
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/memdown
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/outbound
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/purging-utils
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/rules-engine
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/server-checks
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/task-utils
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/transitions
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/validation
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/calendar-interval
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/contact-types-utils
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/lineage
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/message-utils
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/phone-number
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/registration-utils
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/search
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/settings
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/tombstone-utils
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/translation-utils
updates -u --minor  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/view-map-utils


# re-run npm ci to install updated versions based on updated package.json
npm install
npm install --prefix ./admin
npm install --prefix ./api
npm install --prefix ./sentinel
npm install --prefix ./webapp
npm install --prefix ./shared-libs/bulk-docs-utils
npm install --prefix ./shared-libs/cht-script-api
npm install --prefix ./shared-libs/infodoc
npm install --prefix ./shared-libs/memdown
npm install --prefix ./shared-libs/outbound
npm install --prefix ./shared-libs/purging-utils
npm install --prefix ./shared-libs/rules-engine
npm install --prefix ./shared-libs/server-checks
npm install --prefix ./shared-libs/task-utils
npm install --prefix ./shared-libs/transitions
npm install --prefix ./shared-libs/validation
npm install --prefix ./shared-libs/calendar-interval
npm install --prefix ./shared-libs/contact-types-utils
npm install --prefix ./shared-libs/lineage
npm install --prefix ./shared-libs/message-utils
npm install --prefix ./shared-libs/phone-number
npm install --prefix ./shared-libs/registration-utils
npm install --prefix ./shared-libs/search
npm install --prefix ./shared-libs/settings
npm install --prefix ./shared-libs/tombstone-utils
npm install --prefix ./shared-libs/translation-utils
npm install --prefix ./shared-libs/view-map-utils

# npm dedupe - remove duplicated dependencies
npm dedupe
npm dedupe --prefix ./admin
npm dedupe --prefix ./api
npm dedupe --prefix ./sentinel
npm dedupe --prefix ./webapp
npm dedupe --prefix ./shared-libs/bulk-docs-utils
npm dedupe --prefix ./shared-libs/cht-script-api
npm dedupe --prefix ./shared-libs/infodoc
npm dedupe --prefix ./shared-libs/memdown
npm dedupe --prefix ./shared-libs/outbound
npm dedupe --prefix ./shared-libs/purging-utils
npm dedupe --prefix ./shared-libs/rules-engine
npm dedupe --prefix ./shared-libs/server-checks
npm dedupe --prefix ./shared-libs/task-utils
npm dedupe --prefix ./shared-libs/transitions
npm dedupe --prefix ./shared-libs/validation
npm dedupe --prefix ./shared-libs/calendar-interval
npm dedupe --prefix ./shared-libs/contact-types-utils
npm dedupe --prefix ./shared-libs/lineage
npm dedupe --prefix ./shared-libs/message-utils
npm dedupe --prefix ./shared-libs/phone-number
npm dedupe --prefix ./shared-libs/registration-utils
npm dedupe --prefix ./shared-libs/search
npm dedupe --prefix ./shared-libs/settings
npm dedupe --prefix ./shared-libs/tombstone-utils
npm dedupe --prefix ./shared-libs/translation-utils
npm dedupe --prefix ./shared-libs/view-map-utils

# npm audit fix - automatically fix any nested dependencies with vulnerabilities
npm audit fix
npm audit fix --prefix ./admin
npm audit fix --prefix ./api
npm audit fix --prefix ./sentinel
npm audit fix --prefix ./webapp
npm audit fix --prefix ./shared-libs/bulk-docs-utils
npm audit fix --prefix ./shared-libs/cht-script-api
npm audit fix --prefix ./shared-libs/infodoc
npm audit fix --prefix ./shared-libs/memdown
npm audit fix --prefix ./shared-libs/outbound
npm audit fix --prefix ./shared-libs/purging-utils
npm audit fix --prefix ./shared-libs/rules-engine
npm audit fix --prefix ./shared-libs/server-checks
npm audit fix --prefix ./shared-libs/task-utils
npm audit fix --prefix ./shared-libs/transitions
npm audit fix --prefix ./shared-libs/validation
npm audit fix --prefix ./shared-libs/calendar-interval
npm audit fix --prefix ./shared-libs/contact-types-utils
npm audit fix --prefix ./shared-libs/lineage
npm audit fix --prefix ./shared-libs/message-utils
npm audit fix --prefix ./shared-libs/phone-number
npm audit fix --prefix ./shared-libs/registration-utils
npm audit fix --prefix ./shared-libs/search
npm audit fix --prefix ./shared-libs/settings
npm audit fix --prefix ./shared-libs/tombstone-utils
npm audit fix --prefix ./shared-libs/translation-utils
npm audit fix --prefix ./shared-libs/view-map-utils



# record major updates
cat /dev/null > ../major.txt
echo "core" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,loadash,helmet >> ../major.txt
echo "" >> ../major.txt
echo "admin" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./admin >> ../major.txt
echo "" >> ../major.txt
echo "api" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./api >> ../major.txt
echo "" >> ../major.txt
echo "sentinel" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./sentinel >> ../major.txt
echo "" >> ../major.txt
echo "webapp" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./webapp >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/bulk-docs-utils" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/bulk-docs-utils >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/cht-script-api" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/cht-script-api >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/infodoc" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/infodoc >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/memdown" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/memdown >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/outbound" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/outbound >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/purging-utils" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/purging-utils >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/rules-engine" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/rules-engine >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/server-checks" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/server-checks >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/task-utils" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/task-utils >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/transitions" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/transitions >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/validation" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/validation >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/calendar-interval" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/calendar-interval >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/contact-types-utils" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/contact-types-utils >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/lineage" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/lineage >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/message-utils" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/message-utils >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/phone-number" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/phone-number >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/registration-utils" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/registration-utils >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/search" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/search >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/settings" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/settings >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/tombstone-utils" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/tombstone-utils >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/translation-utils" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/translation-utils >> ../major.txt
echo "" >> ../major.txt
echo "shared-libs/view-map-utils" >> ../major.txt
updates  -e bootstrap,bootstrap-daterangepicker,select2,jquery,helmet -f ./shared-libs/view-map-utils >> ../major.txt
