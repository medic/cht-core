#!/usr/bin/env node

const args = process.argv.slice(2);

const libphonenumber = require('google-libphonenumber');

const utils = libphonenumber.PhoneNumberUtil.getInstance();

console.log('Number   \t| Valid?');
console.log('----------------+-------');
while(args.length) {
  testNumber(args.shift());
}

function testNumber(number) {
  const valid = utils.isValidNumber(utils.parseAndKeepRawInput(number));
  console.log(`${number}\t| ${valid}`);
}
