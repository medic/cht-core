{
  const fileManager = require( 'enketo-core/src/js/file-manager' );
  fileManager.isTooLarge = function( file ) {
    return file && file.size > 32 * 1024;
  };

  const widgets = [
    require( 'enketo-core/src/widget/geo/geopicker' ),
    require( 'enketo-core/src/widget/table/tablewidget' ),
    require( 'enketo-core/src/widget/radio/radiopicker' ),
    require( 'enketo-core/src/widget/date/datepicker-extended' ),
    require( 'enketo-core/src/widget/time/timepicker-extended' ),
    require( 'enketo-core/src/widget/file/filepicker' ),
    require( 'enketo-core/src/widget/datetime/datetimepicker-extended' ),
    require( 'enketo-core/src/widget/horizontal-choices/horizontalchoices' ),
    require( './widgets/notewidget' ),
    require( './widgets/countdown-widget' ),
    require( './widgets/db-object-widget' ),
    require( './widgets/phone-widget' ),
    require( './widgets/unselectable-radios' ),
    require( './widgets/android-datepicker' ),
    require( './widgets/bikram-sambat-datepicker' ),
    require( './widgets/simprints' ),
    require( './widgets/mrdt' ),
    require( './widgets/rdtoolkit-provisioning' ),
  ];

  module.exports = widgets;
}
