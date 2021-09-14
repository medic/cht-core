const aggregateList = () => $('#target-aggregates-list');
const analytics = () => $$('ul.mm-navigation-menu li a span');
const targetAggregatesItems = () => $$(`.content .heading h4 span`);
const meta = ('div.body.meta > div >');
const aggregateHeading = () => $(`${meta} div.row.heading > div.heading-content > h2`);
const aggregateLabel = () => $(`${meta} div.cell > label`);
const aggregateSummary = () => $(`${meta} div.cell > p`);

const getAllAggregates = async () => {
  await (await aggregateList()).waitForDisplayed();
  return Promise.all((await targetAggregatesItems()).map(filter => filter.getText()));
};

module.exports = {
  analytics,
  targetAggregatesItems,
  aggregateSummary,
  aggregateLabel,
  aggregateHeading,
  getAllAggregates
};
