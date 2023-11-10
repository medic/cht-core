const form = (formId) => `form[data-form-id="${formId}"]`;
const ACTIVE = '.active';
const ACTIVE_SPAN = 'span' + ACTIVE;
const ACTIVE_OPTION_LABEL = '.option-label' + ACTIVE;
const smsNote = (formId) => `textarea[name="/${formId}/group_note/g_chw_sms"]`;
const followUpSmsNote1 = (formId) => `span[data-itext-id="/${formId}/group_review/r_followup_note1:label"]${ACTIVE}`;
const followUpSmsNote2 = (formId) => `span[data-itext-id="/${formId}/group_review/r_followup_note2:label"]${ACTIVE}`;
const patientIdSummary = (formId) => `span[data-value=" /${formId}/group_review/r_patient_id "]`;
const patientNameSummary = (formId) => `span[data-value=" /${formId}/patient_name "]`;

module.exports = {
  form,
  ACTIVE,
  ACTIVE_SPAN,
  ACTIVE_OPTION_LABEL,
  smsNote,
  followUpSmsNote1,
  followUpSmsNote2,
  patientIdSummary,
  patientNameSummary,
};
