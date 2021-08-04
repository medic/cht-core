const messageTextBox = () => $('input#message');
const phoneNumberTextBox = () => $('input#from');
const sendMessageButton = () => $('//a[@test-id="sms-test-btn"]');

const goToAdminSms = async () => {
  await browser.url('/admin/#/sms/test');
  await (await messageTextBox()).waitForDisplayed();
};

//Input code and name in Message text box

const inputMessageInfoAndSubmit = async (messageValue, phoneNumber) => {
  await (await messageTextBox()).click();
  await (await messageTextBox()).addValue(messageValue);
  await (await phoneNumberTextBox()).click();
  await (await phoneNumberTextBox()).addValue(phoneNumber);
  await (await sendMessageButton()).click();
};

module.exports = {
  goToAdminSms,
  inputMessageInfoAndSubmit
};
