# libphonenumber

To rebuild the `phoneformat.js` with the latest version of the Google libphonenumber library:

- Get the closure build file from https://raw.githubusercontent.com/albeebe/phoneformat.js/master/closure.txt
- Paste it into the left hand side of http://closure-compiler.appspot.com/home
- Hit "compile"
- Paste the result into libphonenumber/phoneformat.js without overwriting the last line: `exports.phonenumbers = i18n.phonenumbers;`
- Bump the version number in kanso.json to the revision at https://libphonenumber.googlecode.com/svn/trunk/javascript/i18n/phonenumbers/

Inspired by: https://github.com/albeebe/phoneformat.js