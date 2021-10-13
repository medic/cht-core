const targetsUrl = '/#/analytics/targets';
const noSelectedTargetSelector = '.empty-selection';
const targetWrapSelector = '.page .targets';
const targetSelector = '.target';
const targetTitle = '.heading .title h2';
const targetGoal = '.body .count .goal';
const targetCountNumber = '.body .count .number';
const targetProgressNumber = '.body .target-progress .number';

const noSelectedTarget = () => $(noSelectedTargetSelector);

const targets = () => $$(targetSelector);

const targetWrap = () => $(targetWrapSelector);

const goToTargets = () => browser.url(targetsUrl);

const getTargetInfo = async (targetElement) => {
  const target = {
    title: await (await targetElement.$(targetTitle)).getText()
  };

  if (await (await targetElement.$(targetGoal)).isExisting()) {
    target.goal = await (await targetElement.$(`${targetGoal} p`)).getText();
  }

  if (await (await targetElement.$(targetCountNumber)).isExisting()) {
    target.count = await (await targetElement.$(targetCountNumber)).getText();
  }

  if (await (await targetElement.$(targetProgressNumber)).isExisting()) {
    target.percent = await (await targetElement.$(`${targetProgressNumber} .value`)).getText();
    target.percentCount = await (await targetElement.$(`${targetProgressNumber} span:nth-child(2)`)).getText();
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
};
