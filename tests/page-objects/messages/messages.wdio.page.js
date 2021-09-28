//LHS Elements
const messageByIndex = index => $(`#message-list li:nth-child(${index})`);
const messageInList = identifier => $(`#message-list li[test-id="${identifier}"]`);
const waitForMessagesInLHS = async () => await browser.waitUntil(
  async () => await (await messageByIndex(1)).waitForDisplayed(),
  5000,
  { timeoutMsg: 'Failed waiting for the first left hand side message' });

const listMessageHeading = (listElement) => listElement.$('.heading h4');
const listMessageSummary = (listElement) => listElement.$('.summary p');

//RHS Elements

const messageDetailsHeader = () => $('#message-header .name');

const clickLhsEntry = async (entryId, entryName) => {
  entryName = entryName || entryId;
  await (await messageInList(entryId)).click();
  return browser.waitUntil(async () => {
    const blah = await (await messageDetailsHeader()).waitForDisplayed();
    console.log('blah is');
    console.log(blah);
    const text = await (await messageDetailsHeader()).getText();
    return text === entryName;
  }, 2000);
};
const messageContentIndex = (index = 1) => $(`#message-content li:nth-child(${index})`);
const messageContentText = (messageContentElement) => messageContentElement.$('.data p:first-child');


module.exports = {
  messageByIndex,
  waitForMessagesInLHS,
  listMessageHeading,
  listMessageSummary,
  clickLhsEntry,
  messageDetailsHeader,
  messageContentText,
  messageContentIndex
};
