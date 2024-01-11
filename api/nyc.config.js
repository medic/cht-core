'use strict';

module.exports = {
  cwd: 'api',
  include: [
    'src/**/*.js'
  ],
  exclude: [
    'tests/mocha/**/*.js',
    'shared-libs/**/*.*',
  ],
  reporter: 'text-summary'
};
