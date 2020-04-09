if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
  var define = function( factory ) { // eslint-disable-line
    factory( require, exports, module );
  };
}

define( function( require, exports, module ) {

  const widgets = [
    require( 'enketo-core/src/widget/geo/geopicker' ),
    require( 'enketo-core/src/widget/table/tablewidget' ),
    require( 'enketo-core/src/widget/radio/radiopicker' ),
    require( 'enketo-core/src/widget/time/timepicker-extended' ),
    require( 'enketo-core/src/widget/columns/columns' ),
    require( './widgets/filepicker-widget' ),
    require( './widgets/datepicker-widget' ),
    require( './widgets/horizontal-choices' ),
    require( './widgets/countdown-widget' ),
    require( './widgets/db-object-widget' ),
    require( './widgets/phone-widget' ),
    require( './widgets/unselectable-radios' ),
    require( './widgets/android-datepicker' ),
    require( './widgets/bikram-sambat-datepicker' ),
    require( './widgets/simprints' ),
    require( './widgets/mrdt' ),
  ];

  module.exports = widgets;
} );
