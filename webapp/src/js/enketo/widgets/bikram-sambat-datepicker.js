'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );
const bikram_sambat_bs = require( 'bikram-sambat-bootstrap' );

class Bikramsambatdatepicker extends Widget {
  static get selector() {
    return 'input[type=date]';
  }

  _init() {
    const el = this.element;

    window.CHTCore.Language
      .get()
      .then( function( language ) {
        const $el = $( el );

        // Here we support the appearance="bikram-sambat" attribute as
        // well to maintain compatibility with collect.
        if ( language.indexOf( 'ne' ) !== 0 &&
          $el.parent('.or-appearance-bikram-sambat').length === 0) {
          return;
        }

        const $parent = $el.parent();
        const $realDateInput = $parent.children( 'input[type=date]' );
        const initialVal = $realDateInput.val();

        // Remove datepicker-extended widget:
        $parent.children( '.widget.date' ).remove();
        // Hide standard date input (datepicker-extended may not have removed it
        // previously due to badSamsung bug).
        $realDateInput.hide();

        $parent.append( TEMPLATE );

        const $inputGroup = $parent.children( '.bikram-sambat-input-group' );

        bikram_sambat_bs.initListeners( $parent, $realDateInput );

        const $monthError = $parent.find( '.bs-month-error' );
        const $monthBtn = $parent.find( '.bs-month-dropdown-btn' );
        const $monthInput = $parent.find( 'input[name="month"]' );

        // Show error and clear real date when day/year entered without a month
        $parent.find( '.devanagari-number-input' ).on( 'change blur', function() {
          const hasDay = !!$parent.find( 'input[name="day"]' ).val();
          const hasYear = !!$parent.find( 'input[name="year"]' ).val();
          const hasMonth = !!$monthInput.val() && $monthInput.val() !== '0';
          if ( (hasDay || hasYear) && !hasMonth ) {
            $monthBtn.addClass( 'btn-danger' ).removeClass( 'btn-default' );
            $monthError.show();
            $realDateInput.val( '' ).trigger( 'change' );
          } else if ( hasMonth ) {
            $monthBtn.addClass( 'btn-default' ).removeClass( 'btn-danger' );
            $monthError.hide();
          }
        } );

        // Clear error state when month is selected
        $parent.find( '.dropdown-menu li' ).on( 'click', function() {
          $monthBtn.addClass( 'btn-default' ).removeClass( 'btn-danger' );
          $monthError.hide();
        } );

        // Set today's date in BS
        $parent.find( '.bs-today-btn' ).on( 'click', function() {
          const todayGreg = new Date().toISOString().split( 'T' )[0];
          bikram_sambat_bs.setDate_greg_text( $inputGroup, $realDateInput, todayGreg );
          $monthBtn.addClass( 'btn-default' ).removeClass( 'btn-danger' );
          $monthError.hide();
        } );

        // Clear all fields
        $parent.find( '.bs-clear-btn' ).on( 'click', function() {
          $parent.find( 'input[name="day"]' ).val( '' );
          $monthInput.val( '' );
          $parent.find( 'input[name="year"]' ).val( '' );
          $monthBtn
            .addClass( 'btn-default' )
            .removeClass( 'btn-danger' )
            .html( 'महिना <span class="caret"></span>' );
          $monthError.hide();
          $realDateInput.val( '' ).trigger( 'change' );
        } );

        if ( initialVal ) {
          bikram_sambat_bs.setDate_greg_text(
            $inputGroup,
            $realDateInput,
            initialVal
          );
        }
      });
  }
}

module.exports = Bikramsambatdatepicker;

const TEMPLATE =
  '<div class="input-group bikram-sambat-input-group">' +
    '<input name="day" type="tel" class="form-control devanagari-number-input" placeholder="गते" aria-label="गते" ' +
      'maxlength="2">' +
    '<input name="month" type="hidden">' +
    '<div class="input-group-btn">' +
      '<button type="button" class="btn btn-default dropdown-toggle bs-month-dropdown-btn" data-toggle="dropdown" ' +
        'aria-haspopup="true" aria-expanded="false">महिना <span class="caret"></span>' +
      '</button>' +
      '<ul class="dropdown-menu">' +
        '<li><a>बैशाख</a></li>' +
        '<li><a>जेठ</a></li>' +
        '<li><a>असार</a></li>' +
        '<li><a>साउन</a></li>' +
        '<li><a>भदौ</a></li>' +
        '<li><a>असोज</a></li>' +
        '<li><a>कार्तिक</a></li>' +
        '<li><a>मंसिर</a></li>' +
        '<li><a>पौष</a></li>' +
        '<li><a>माघ</a></li>' +
        '<li><a>फाल्गुन</a></li>' +
        '<li><a>चैत</a></li>' +
      '</ul>' +
    '</div>' +
    '<input name="year" type="tel" class="form-control devanagari-number-input" placeholder="साल" aria-label="साल" ' +
      'maxlength="4">' +
    '<div class="input-group-btn">' +
      '<button type="button" class="btn btn-default bs-today-btn" title="आजको मिति सेट गर्नुस्">आज</button>' +
      '<button type="button" class="btn btn-default bs-clear-btn" title="मिति हटाउनुस्">✕</button>' +
    '</div>' +
    '<span class="bs-month-error" style="display:none;color:#a94442;font-size:12px;margin-top:4px;">' +
      'महिना छान्नुस्' +
    '</span>' +
  '</div>';
