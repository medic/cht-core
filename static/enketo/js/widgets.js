if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    widgets = [
        require( '../../../node_modules/enketo-core/src/widget/note/notewidget' ),
        require( '../../../node_modules/enketo-core/src/widget/select-mobile/selectpicker' ),
        require( '../../../node_modules/enketo-core/src/widget/table/tablewidget' ),
        require( '../../../node_modules/enketo-core/src/widget/radio/radiopicker' ),
        require( '../../../node_modules/enketo-core/src/widget/date/datepicker-extended' ),
        require( '../../../node_modules/enketo-core/src/widget/time/timepicker-extended' ),
        require( '../../../node_modules/enketo-core/src/widget/datetime/datetimepicker-extended' ),
    ];

    module.exports = widgets;
} );
