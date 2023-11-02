const FORM = (formId) => `form[data-form-id="${formId}"]`;
const ACTIVE = '.active'
const ACTIVE_SPAN = 'span' + ACTIVE;
const ACTIVE_OPTION_LABEL = '.option-label' + ACTIVE;
const SMS_NOTE = (formId) => `textarea[name="/${formId}/group_note/g_chw_sms"]`;
const FOLLOW_UP_SMS = (formId) => `span[data-value=" /${formId}/chw_sms "]`;

module.exports = {
  FORM,
  ACTIVE,
  ACTIVE_SPAN,
  ACTIVE_OPTION_LABEL,
  SMS_NOTE,
  FOLLOW_UP_SMS,
};
