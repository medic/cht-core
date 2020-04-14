'use strict';
const Columns = require( 'enketo-core/src/widget/columns/columns' ).default;

function HorizontalChoices( element, options ) {
  Object.assign(this, new Columns(element, options));
}

//copy the prototype functions from the Columns super class
HorizontalChoices.prototype = Object.create( Columns.prototype );

HorizontalChoices.selector =
  '.or-appearance-horizontal, .or-appearance-horizontal-compact';
HorizontalChoices.condition = function() { return true; };

module.exports = HorizontalChoices;
