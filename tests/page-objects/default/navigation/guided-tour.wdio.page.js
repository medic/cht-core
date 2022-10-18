const rhsMenuButton = () => $('.fa-bars');
const guidedTourMenuOption = () => $('i.fa-graduation-cap');
const messageTourStartButton = () => $('.tour-option-messages');
const tourStepSelector = (tourStepId) => $(`.tour-messages-${tourStepId}`);

const nextButton = () => $('//button[@data-role="next"]');
const endTourButton = () => $('[data-role="end"]');
const tourPopupSelector = () => $('.popover tour');

const runGuidedTour = async (endTour = true) => {
  await (await rhsMenuButton()).waitForDisplayed();
  await (await rhsMenuButton()).click();
  await (await guidedTourMenuOption()).waitForDisplayed();
  await (await guidedTourMenuOption()).click();

  await (await messageTourStartButton()).waitForDisplayed();
  await (await messageTourStartButton()).click();

  const noOfTourSteps = 7;
  for (let stepId = 0; stepId <= noOfTourSteps - 1; stepId++) {
    await (await tourStepSelector(stepId)).waitForDisplayed();
    await (await nextButton()).click();
  }

  if(endTour) {
    await (await endTourButton()).waitForDisplayed();
    await (await endTourButton()).click();
  }
};

const isGuidedTourOpen = async () => {
  return await (await tourPopupSelector()).isDisplayed();
};

module.exports = {
  runGuidedTour,
  isGuidedTourOpen
};
