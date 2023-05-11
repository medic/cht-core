let cards = [];
let context = {};
let fields = [];
if (contact.type === "person") {
  fields = [{ label: "test.pid", value: contact.patient_id, width: 3 }];
  if (targetDoc) {
    const card = {
      label: "Activity this month",
      fields: [],
    };
    card.fields.push({ label: "Last updated", value: targetDoc.date_updated });
    targetDoc.targets.forEach(target => {
      let value;
      if (target.type === 'percent') {
        value = (target.value.total ? target.value.pass * 100 / target.value.total : 0) + "%";
      } else {
        value = target.value.pass;
      }
      card.fields.push({ label: target.title.en, value: value });
    });
    cards.push(card);
  }
}
return {
  fields: fields,
  cards: cards,
  context: context
};
