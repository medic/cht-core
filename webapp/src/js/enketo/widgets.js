{
  const widgets = [
    require( 'enketo-core/src/widget/geo/geopicker' ).default,
    require( 'enketo-core/src/widget/table/tablewidget' ).default,
    require( 'enketo-core/src/widget/radio/radiopicker' ).default,
    require( 'enketo-core/src/widget/time/timepicker-extended' ).default,
    require( 'enketo-core/src/widget/columns/columns' ).default,
    require( 'enketo-core/src/widget/file/filepicker' ).default,
    require( 'enketo-core/src/widget/date/datepicker-extended' ).default,
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
}
