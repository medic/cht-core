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

const labels = () => $$('.content-pane .meta > div > .card .row label');
const meta = () => $$('.content-pane .meta > div > .card .row p');
const rows = () => $$('.content-pane .meta > div > .card .row p');
const pane = () => $$('.content-pane .meta > div > .card .row label');

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
const expectModulesToBeAvailable = async (modules) => {
  //await helper.waitUntilReadyNative(element(by.css('.mm-navigation-menu')));
  for (const module of modules) {
    const element = await $(`.mm-navigation-menu li a[href="${module}"]`);
    expect(await element.isExisting()).to.be.true;
  }
};

const goToTargetAggregates = async (enabled) => {
  //await helper.waitUntilReadyNative(element(by.css('.mm-navigation-menu')));
  await (await $(`.mm-navigation-menu li a[href="#/analytics/target-aggregates"]`)).click();
  if (enabled) {
    await (await $('#target-aggregates-list')).waitForDisplayed();
  } else {
    await (await $('.page .item-content.disabled')).waitForDisplayed();
  }
};

module.exports = {
  noSelectedTarget,
  goToTargets,
  getTargets,
  expectModulesToBeAvailable,
  goToTargetAggregates,
  labels,
  meta,
  pane,
  rows,
};
