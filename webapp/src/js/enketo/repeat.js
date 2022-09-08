const $ = require('jquery');
const repeatModule = require( 'enketo-core/src/js/repeat' ).default;

module.exports = Object.assign(repeatModule, {
  // Overwrite the default function which pops a confirmation dialogue
  // https://github.com/enketo/enketo-core/blob/b48266e7e46a792d9bd3263dce92f15b626b51bc/src/js/repeat.js#L116
  confirmDelete: function (repeatEl) {
    this.remove( $( repeatEl ) );
  }
});
