const TARGET_MET_COLOR = '#76b0b0';

const TARGET_UNMET_COLOR = '#000000';

const goToTargets = () => browser.url('/#/analytics/targets');

const noSelectedTarget = () => $('.empty-selection');

const targets = () => $$('.target');

const targetWrap = () => $('.page .targets');

const targetTitle = (targetElement) => targetElement.$('.heading .title h2');

const targetGoal = (targetElement) => targetElement.$('.body .count .goal');

const targetCountNumber = (targetElement) => targetElement.$('.body .count .number');

const targetCountNumberColor = (targetElement) => targetElement.$('.body .count .number:not(.goal-met)');

const targetProgressNumber = (targetElement) => targetElement.$('.body .target-progress .number');

const targetNumberPercent = (targetElement) => targetElement.$('.body .target-progress .number .value');

const targetNumberPercentCount = (targetElement) => targetElement.$('.body .target-progress .number span:nth-child(2)');

const targetGoalValue = (targetElement) => targetElement.$('.body .count .goal');

const EMPTY_SELECTION = '.content-pane .item-content.empty-selection';

const emptySelectionError = () => $(`${EMPTY_SELECTION}.selection-error`);

const emptySelectionNoError = () => $(`${EMPTY_SELECTION}:not(.selection-error)`);

const getTargetInfo = async (targetElement) => {
  const target = {
    title: await (await targetTitle(targetElement)).getText()
  };

  if (await (await targetGoal(targetElement)).isExisting()) {
    const fullText = await (await targetGoalValue(targetElement)).getText();
    target.goal = fullText.split(' ').pop();
  }

  if (await (await targetCountNumber(targetElement)).isExisting()) {
    target.count = await (await targetCountNumber(targetElement)).getText();
  }

  if (await (await targetCountNumberColor(targetElement)).isExisting()) {
    target.countNumberColor = (await (await targetCountNumberColor(targetElement)).getCSSProperty('color')).parsed.hex;
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
  TARGET_MET_COLOR,
  TARGET_UNMET_COLOR
};

