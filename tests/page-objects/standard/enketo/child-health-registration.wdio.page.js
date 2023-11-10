const enketoCommonPage = require('@page-objects/standard/enketo/enketo.wdio.page.js');

const DEFAULT_NOTE =
  `span[data-itext-id="/child_health_registration/group_note/default_chw_sms_note:label"]${enketoCommonPage.ACTIVE}`;
const REGISTRATION_DETAILS =
  `span[data-itext-id="/child_health_registration/group_summary/r_patient_info:label"]${enketoCommonPage.ACTIVE} `;
const FOLLOW_UP_SMS =
  `span[data-itext-id="/child_health_registration/group_summary/r_followup_note1:label"]${enketoCommonPage.ACTIVE}`;

const chwName = () => $(`${DEFAULT_NOTE} span[data-value=" /child_health_registration/chw_name "]`);
const chwPhone = () => $(`${DEFAULT_NOTE} span[data-value=" /child_health_registration/chw_phone "]`);
const defaultChwSmsText = () => $(DEFAULT_NOTE +
    ' span[data-value=" /child_health_registration/group_note/default_chw_sms_text "]');
const personalNote = () => $('textarea[name="/child_health_registration/group_note/g_chw_sms"]');

const sumChildName = () => $(REGISTRATION_DETAILS +
  enketoCommonPage.patientNameSummary('child_health_registration'));
const sumChildId = () => $(REGISTRATION_DETAILS +
  'span[data-value=" /child_health_registration/group_summary/r_patient_id "]');
const sumFollowUpMsgChwName = () => $(FOLLOW_UP_SMS +
  ' span[data-value=" /child_health_registration/chw_name "]');
const sumFollowUpMsgChwPhone = () => $(FOLLOW_UP_SMS +
  ' span[data-value=" /child_health_registration/chw_phone "]');
const sumFollowUpSmsContent = () => $(
  `span[data-itext-id="/child_health_registration/group_summary/r_followup_note2:label"]${enketoCommonPage.ACTIVE}`
);

const getFormInformation = async () => {
  return {
    chwName: await chwName().getText(),
    chwPhone: await chwPhone().getText(),
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
    chwName: await sumFollowUpMsgChwName().getText(),
    chwPhone: await sumFollowUpMsgChwPhone().getText(),
    smsContent: await sumFollowUpSmsContent().getText(),
  };
};

module.exports = {
  getFormInformation,
  setPersonalNote,
  getSummaryInformation,
};
