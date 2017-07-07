if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';

    var Widget = require('@medic/enketo-core/src/js/Widget');
    var $ = require('jquery');

    require('@medic/enketo-core/src/js/plugins');

    var pluginName = 'zscorewidget';

    /**
     * Calculates a zscore from the axis of sex, x, and y using lookup tables
     * stored in the database.
     */
    function ZScoreWidget( element, options ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    ZScoreWidget.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    ZScoreWidget.prototype.constructor = ZScoreWidget;

    ZScoreWidget.prototype._init = function() {
        var self = this;
        var angularServices = angular.element(document.body).injector();
        this.zScoreService = angularServices.get('ZScore');
        this.group = $( this.element ).closest( '.or-appearance-zscore' );
        this.group.find('.or-appearance-zscore-sex, .or-appearance-zscore-age, .or-appearance-zscore-weight, .or-appearance-zscore-height')
                  .on('change change.bymap change.bysearch', function() {
            self._update(self);
        });
        this._update(self);
    };

    ZScoreWidget.prototype._round = function(num) {
        return num && (Math.round(num * 10) / 10);
    };

    ZScoreWidget.prototype._update = function(self) {
        var options = {
            sex: self.group.find( '.or-appearance-zscore-sex [data-checked=true] input' ).val(),
            age: self.group.find( '.or-appearance-zscore-age input' ).val(),
            weight: self.group.find( '.or-appearance-zscore-weight input' ).val(),
            height: self.group.find( '.or-appearance-zscore-height input' ).val()
        };
        self.zScoreService(options)
            .then(function(scores) {
                self.group.find('.or-appearance-zscore-weight-for-age input')
                          .val(self._round(scores.weightForAge))
                          .trigger( 'change' );
                self.group.find('.or-appearance-zscore-height-for-age input')
                          .val(self._round(scores.heightForAge))
                          .trigger( 'change' );
                self.group.find('.or-appearance-zscore-weight-for-height input')
                          .val(self._round(scores.weightForHeight))
                          .trigger( 'change' );
            })
            .catch(function(err) {
                console.error('Error calculating z-score', err);
            });
    };

    ZScoreWidget.prototype.destroy = function( /* element */ ) {};

    $.fn[ pluginName ] = function( options, event ) {
        return this.each( function() {
            var $this = $( this ),
                data = $this.data( pluginName );

            options = options || {};

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, ( data = new ZScoreWidget( this, options, event ) ) );
            } else if ( data && typeof options === 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': '.or-appearance-zscore',
    };
} );
