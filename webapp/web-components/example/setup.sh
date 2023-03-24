#cp ../../dist/cht-form/main.* ./cht-form.main.js
#cp ../../dist/cht-form/polyfills.* ./cht-form.polyfills.js
#cp ../../dist/cht-form/styles.* ./cht-form.styles.css

#cp ../../dist/info-box/main.* ./info-box.main.js
#cp ../../dist/info-box/polyfills.* ./info-box.polyfills.js


#cp ../../dist/info-box/styles.* ./info-box.css
#cat ../../dist/info-box/runtime*.js ../../dist/info-box/polyfills*.js ../../dist/info-box/main*.js > info-box.js

cp ../../dist/cht-form/styles.* ./cht-form.css
cat ../../dist/cht-form/runtime*.js ../../dist/cht-form/polyfills*.js ../../dist/cht-form/main*.js > cht-form.js
