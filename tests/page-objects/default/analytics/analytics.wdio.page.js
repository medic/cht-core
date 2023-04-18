const goToTargets = () => browser.url('/#/analytics/targets');

const noSelectedTarget = () => $('.empty-selection');

const targets = () => $$('.target');

const targetWrap = () => $('.page .targets');

const targetTitle = (targetElement) => targetElement.$('.heading .title h2');

const targetGoal = (targetElement) => targetElement.$('.body .count .goal');

const targetCountNumber = (targetElement) => targetElement.$('.body .count .number');

const targetProgressNumber = (targetElement) => targetElement.$('.body .target-progress .number');

const targetNumberPercent = (targetElement) => targetElement.$('.body .target-progress .number .value');

const targetNumberPercentCount = (targetElement) => targetElement.$('.body .target-progress .number span:nth-child(2)');

const targetGoalValue = (targetElement) => targetElement.$('.body .count .goal p');

const emptySelectionError = () => $('.content-pane .item-content.empty-selection.selection-error');

const emptySelectionNoError = () => $('.content-pane .item-content.empty-selection:not(.selection-error)');

const getTargetInfo = async (targetElement) => {
  const target = {
    title: await (await targetTitle(targetElement)).getText()
  };

  if (await (await targetGoal(targetElement)).isExisting()) {
    target.goal = await (await targetGoalValue(targetElement)).getText();
  }

  if (await (await targetCountNumber(targetElement)).isExisting()) {
    target.count = await (await targetCountNumber(targetElement)).getText();
  }

  if (await (await targetProgressNumber(targetElement)).isExisting()) {
    target.percent = await (await targetNumberPercent(targetElement)).getText();
    target.percentCount = await (await targetNumberPercentCount(targetElement)).getText();
  }

  return target;
};

const getTargets = async () => {
  await (await targetWrap()).waitForDisplayed();
  const displayedTargets = await targets();

  const targetList = [];
  for (const target of displayedTargets) {
    const info = await getTargetInfo(target);
    targetList.push(info);
  }

  return targetList;
};

module.exports = {
  noSelectedTarget,
  goToTargets,
  getTargets,
  emptySelectionError,
  emptySelectionNoError,
};

