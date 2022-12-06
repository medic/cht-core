let cards = [];
let context = {};
let fields = [
  {
    label: "uhc_stats_count",
    value: uhcStats.homeVisits ? uhcStats.homeVisits.count : '',
    width: 3
  },
  {
    label: "uhc_stats_count_goal",
    value: uhcStats.homeVisits ? uhcStats.homeVisits.countGoal : '',
    width: 3
  },
  {
    label: "uhc_stats_last_visited_date",
    value: uhcStats.homeVisits ? uhcStats.homeVisits.lastVisitedDate : '',
    width: 3
  },
  {
    label: "uhc_stats_interval_start",
    value: uhcStats.uhcInterval ? uhcStats.uhcInterval.start : '',
    width: 3
  },
  {
    label: "uhc_stats_interval_end",
    value: uhcStats.uhcInterval ? uhcStats.uhcInterval.end : '',
    width: 3
  },
  {
    label: "can_configure",
    value: cht.v1.hasPermissions('can_configure'),
    width: 3
  },
  {
    label: "can_edit_or_can_create_people",
    value: cht.v1.hasAnyPermission([['can_edit'], ['can_create_people']]),
    width: 3
  }
];

if (contact.type === "person") {
  fields.push({ label: "test_pid", value: contact.patient_id, width: 3 });
  fields.push({ label: "test_sex", value: contact.sex, width: 3 });

  Object.keys(contact.linked_docs).forEach(key => {
    const linkedDoc = contact.linked_docs[key];
    if (!linkedDoc) {
      return;
    }

    if (linkedDoc.type === 'data_record') {
      fields.push({
        label: key,
        value: linkedDoc.form,
        width: 3,
      });
    } else {
      fields.push({
        label: key,
        value: linkedDoc.name + ' ' + linkedDoc.phone,
        width: 3,
      });
    }
  });
  let pregnancy;
  let pregnancyDate;
  reports.forEach(report => {
    if (report.form === "P") {
      const subsequentDeliveries = reports.filter(report2 => {
        return report2.form === "D" && report2.reported_date > report.reported_date;
      });
      if (subsequentDeliveries.length > 0) {
        return;
      }
      const subsequentVisits = reports.filter(report2 => {
        return report2.form === "V" && report2.reported_date > report.reported_date;
      });
      context.pregnant = true;
      if (!pregnancy || pregnancyDate < report.reported_date) {
        pregnancyDate = report.reported_date;
        pregnancy = {
          label: "test.pregnancy",
          fields: [
            { label: "test.visits", value: subsequentVisits.length }
          ]
        };
      }
    }
  });
  if (pregnancy) {
    cards.push(pregnancy);
  }
}
return {
  fields: fields,
  cards: cards,
  context: context
};
