const cards = [];
const context = {};
let fields = [];
// eslint-disable-next-line no-undef
if (contact.type === 'person') {
  // eslint-disable-next-line no-undef
  fields = [{ label: 'test.pid', value: contact.patient_id, width: 3 }];
}
// eslint-disable-next-line no-undef
const targetDocs = cht.v1.analytics.getTargetDocs();
if (targetDocs) {
  // eslint-disable-next-line no-undef
  const targetIdx = contact.type === 'person' ? 0 : 1;
  // eslint-disable-next-line no-undef
  const targetDoc = targetDocs[targetIdx];
  const card = {
    label: 'Activity this month',
    fields: [],
  };
  // eslint-disable-next-line no-undef
  card.fields.push({ label: 'Last updated', value: targetDoc.date_updated });
  card.fields.push({ label: 'Reporting period', value: targetDoc.reporting_period });

  // eslint-disable-next-line no-undef
  targetDoc.targets.forEach(target => {
    let value;
    if (target.type === 'percent') {
      value = (target.value.total ? target.value.pass * 100 / target.value.total : 0) + '%';
    } else {
      value = target.value.pass;
    }
    card.fields.push({ label: target.title.en, value: value });
  });
  cards.push(card);
}
return {
  fields: fields,
  cards: cards,
  context: context
};
