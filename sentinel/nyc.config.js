'use strict';

module.exports = {
  cwd: 'sentinel',
  include: [
    'src/**/*.js'
  ],
  exclude: [
    'tests/**/*.js',
    'shared-libs/**/*.*',
  ],
  reporter: 'text-summary'
};
