const form = (formId) => `form[data-form-id="${formId}"]`;
const ACTIVE = '.active';
const ACTIVE_SPAN = 'span' + ACTIVE;
const ACTIVE_OPTION_LABEL = '.option-label' + ACTIVE;
const smsNote = (formId) => `textarea[name="/${formId}/group_note/g_chw_sms"]`;
const followUpSms = (formId) => `span[data-value=" /${formId}/chw_sms "]`;

module.exports = {
  form,
  ACTIVE,
  ACTIVE_SPAN,
  ACTIVE_OPTION_LABEL,
  smsNote,
  followUpSms,
};
