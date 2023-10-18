const DEFAULT_NOTE = 'span[data-itext-id="/child_health_registration/group_note/default_chw_sms_note:label"].active';
const REGISTRATION_DETAILS =
  'span[data-itext-id="/child_health_registration/group_summary/r_patient_info:label"].active';
const FOLLOW_UP_SMS = 'span[data-itext-id="/child_health_registration/group_summary/r_followup_note1:label"].active';

const parentContactName = () => $(`${DEFAULT_NOTE} span[data-value=" /child_health_registration/chw_name "]`);
const parentContactPhone = () => $(`${DEFAULT_NOTE} span[data-value=" /child_health_registration/chw_phone "]`);
const defaultChwSmsText = () => $(DEFAULT_NOTE +
    ' span[data-value=" /child_health_registration/group_note/default_chw_sms_text "]');
const personalNote = () => $('textarea[name="/child_health_registration/group_note/g_chw_sms"]');

const sumChildName = () => $(`${REGISTRATION_DETAILS} span[data-value=" /child_health_registration/patient_name "]`);
const sumChildId = () => $(REGISTRATION_DETAILS +
  ' span[data-value=" /child_health_registration/group_summary/r_patient_id "]');
const sumFollowUpMsgParentContactName = () => $(FOLLOW_UP_SMS +
  ' span[data-value=" /child_health_registration/chw_name "]');
const sumFollowUpMsgParentContactPhone = () => $(FOLLOW_UP_SMS +
  ' span[data-value=" /child_health_registration/chw_phone "]');
const sumFollowUpSmsContent = () => $(
  'span[data-itext-id="/child_health_registration/group_summary/r_followup_note2:label"].active ' +
  'span[data-value=" /child_health_registration/chw_sms "]'
);

const getFormInformation = async () => {
  return {
    parentName: await parentContactName().getText(),
    parentPhone: await parentContactPhone().getText(),
    defaultSms: await defaultChwSmsText().getText(),
  };
};

const setPersonalNote = async (value = 'Test note') => {
  const note = await personalNote();
  await note.waitForDisplayed();
  await note.setValue(value);
};

const getSummaryInformation = async () => {
  return {
    childName: await sumChildName().getText(),
    childId: await sumChildId().getText(),
    parentContactName: await sumFollowUpMsgParentContactName().getText(),
    parentContactPhone: await sumFollowUpMsgParentContactPhone().getText(),
    smsContent: await sumFollowUpSmsContent().getText(),
  };
};

module.exports = {
  getFormInformation,
  setPersonalNote,
  getSummaryInformation,
};
