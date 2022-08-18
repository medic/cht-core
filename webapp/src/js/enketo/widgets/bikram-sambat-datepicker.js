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

        bikram_sambat_bs.initListeners( $parent, $realDateInput );

        if ( initialVal ) {
          bikram_sambat_bs.setDate_greg_text(
            $parent.children( '.bikram-sambat-input-group' ),
            $realDateInput,
            initialVal );
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
      '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" ' +
        'aria-expanded="false">महिना <span class="caret"></span>' +
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
  '</div>';
