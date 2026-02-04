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
  .query('shared-contacts/contacts_by_phone', { key: phoneNumber })
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

// Set up enketo validation for data types
FormModel.prototype.types.tel = {
  validate: ( fieldValue ) => window.CHTCore.Settings.get()
    .then(settings => isContactPhoneValid(settings, fieldValue)),
};
FormModel.prototype.types.unique_tel = {
  validate: ( fieldValue ) => window.CHTCore.Settings.get()
    .then(settings => isContactPhoneValid(settings, fieldValue) && isContactPhoneUnique(settings, fieldValue)),
};

// Remove this when we no longer support the tel xlsxform type
const deprecated = {
  // 'string' questions with the `numbers` appearance also become input[type="tel"].
  // So, here we need to also specify the data-type-xml to avoid collisions.
  selector: 'input[type="tel"][data-type-xml="tel"]',
  isDeprecated: ($wrapper) => !$wrapper.hasClass('or-appearance-tel'),
};

/**
   * Allows validated phonenumber entry.
   *
   * @extends Widget
   */
class PhoneWidget extends Widget {
  _init() {
    const $input = $( this.element );
    const $wrapper = $input.closest('.question');
    const uniqueTel = $wrapper.attr('data-cht-unique_tel') === 'true' || deprecated.isDeprecated($wrapper);
    $input.attr('data-type-xml', uniqueTel ? 'unique_tel' : 'tel');

    // Add a proxy input field, which will send its input, formatted, to the real input field.
    const $proxyInput = $input.clone();
    $proxyInput.addClass('ignore');
    $proxyInput.removeAttr('data-relevant');
    $proxyInput.removeAttr('data-required');
    $proxyInput.removeAttr('name');
    $input.before( $proxyInput );
    $proxyInput.val( $input.val() );

    $input.hide();

    return window.CHTCore.Settings.get()
      .then(settings => formatAndCopy( $proxyInput, $input, settings ))
      .catch(err => {
        console.error('Error getting settings:', err);
        formatAndCopy( $proxyInput, $input, {} );
      });
  }

  static get selector() {
    return `.or-appearance-tel input, ${deprecated.selector}`;
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
