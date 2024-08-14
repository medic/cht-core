'use strict';
const FormModel = require( 'enketo-core' ).FormModel;
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
const phoneNumber = require('@medic/phone-number');
require( 'enketo-core/src/js/plugins' );

const isContactPhoneValid = (settings, fieldValue) => {
  if (phoneNumber.validate(settings, fieldValue)) {
    return true;
  }

  console.error( 'invalid phone number: "' + fieldValue + '"' );
  return false;
};

const getContactIdsForPhone = (phoneNumber) => window.CHTCore.DB
  .get()
  .query('medic-client/contacts_by_phone', { key: phoneNumber })
  .then(results => results.rows.map(row => row.id));

const isContactPhoneUnique = async (settings, fieldValue) => {
  const normalizedNumber = phoneNumber.normalize(settings, fieldValue);
  const contactIds = await getContactIdsForPhone(normalizedNumber);
  const contactBeingEdited = $('#contact-form').attr('data-editing');
  if (!contactIds.length || contactBeingEdited && contactIds.includes(contactBeingEdited)) {
    return true;
  }

  console.error('phone number not unique: "' + fieldValue + '"');
  return false;
};


// Set up enketo validation for `phone` input type
FormModel.prototype.types.tel = {
  validate: ( fieldValue ) => window.CHTCore.Settings.get()
    .then(settings => isContactPhoneValid(settings, fieldValue) && isContactPhoneUnique(settings, fieldValue)),
};

/**
   * Allows validated phonenumber entry.
   *
   * @extends Widget
   */
class PhoneWidget extends Widget {
  constructor( element, options, Settings = window.CHTCore.Settings ) {
    super(element, options);

    const $input = $( this.element );

    // Add a proxy input field, which will send its input, formatted, to the real input field.
    // TODO(estellecomment): format the visible field onBlur to user-friendly format.
    const $proxyInput = $input.clone();
    $proxyInput.addClass('ignore');
    $proxyInput.removeAttr('data-relevant');
    $proxyInput.removeAttr('data-required');
    $proxyInput.removeAttr('name');
    $input.before( $proxyInput );
    $proxyInput.val( $input.val() );

    $input.hide();

    // TODO(estellecomment): move this to a catch clause, when settings aren't found.
    formatAndCopy( $proxyInput, $input, {} );

    return Settings.get()
      .then( function( settings ) {
        formatAndCopy( $proxyInput, $input, settings );
      } );
  }

  static get selector() {
    // 'string' questions with the `numbers` appearance also become input[type="tel"].
    // So, here we need to also specify the data-type-xml to avoid collisions.
    return 'input[type="tel"][data-type-xml="tel"]';
  }
}

const formatAndCopy = ( $from, $to, settings ) => {
  $from.change( function() {
    // Also trigger the change() event, since input was not by user.
    $to.val( getFormattedValue( settings, $from.val() ) ).change();
  } );
};

const getFormattedValue = ( settings, value ) => {
  // If invalid, return the non-formatted value,
  // so that the "invalid value" error can display.
  return phoneNumber.normalize( settings, value ) || value;
};

module.exports = PhoneWidget;
