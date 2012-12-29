var db = require('./db'),
    mustache = require('mustache'),
    _ = require('underscore'),
    defaults,
    key = 'sentinel-translations',
    values = {};

function fetchConfig() {
    db.getDoc(key, function(err, doc) {
        if (err && err.error === 'not_found') {
            doc = {
                keys: defaults
            };
            db.saveDoc(key, doc, function(err) {
                if (err) {
                    console.log("Could not initialize translations. Exiting.");
                    console.log(err);
                    process.exit(1);
                } else {
                    fetchConfig();
                }
            });
        } else if (err) {
            console.log("Could not initialize translations. Exiting.");
            console.log(err);
            process.exit(1);
        } else {
            values = _.reduce(doc.keys, function(memo, translation) {
                memo[translation.key] = translation.value;
                return memo;
            });
            for (var i in doc.keys) {
                var pair = doc.keys[i];
                values[pair.key] = pair.value;
            }
        }
    });
}

fetchConfig();

defaults = [
  {
    key: "This is a reminder to submit your report for week {{week}} of {{year}}. Thank you!",
    value: "This is a reminder to submit your report for week {{week}} of {{year}}. Thank you!"
  },
  {
    key: "You have not yet submitted your report for week {{week}} of {{year}}. Please do so as soon as possible. Thanks!",
    value: "You have not yet submitted your report for week {{week}} of {{year}}. Please do so as soon as possible. Thanks!"
  },
  {
    key: "Thank you, {{clinicName}}. ANC counseling visit for {{patient_name}} has been recorded.",
    value: "Thank you, {{clinicName}}. ANC counseling visit for {{patient_name}} has been recorded."
  },
  {
    key: "No patient with id '{{patient_id}}' found.",
    value: "No patient with id '{{patient_id}}' found."
  },
  {
    key: "Thank you for your report.",
    value: "Thank you for your report."
  },
  {
    key: "{{clinicName}} has reported the child of {{patient_name}} as deceased.",
    value: "{{clinicName}} has reported the child of {{patient_name}} as deceased."
  },
  {
    key: "Thank you, {{clinicName}}.",
    value: "Thank you, {{clinicName}}."
  },
  {
    key: "Thank you, {{clinicName}}. This child is low birth weight. Provide extra thermal protection for baby, feed the baby every two hours, visit the family every day to check the baby for the first week, watch for signs of breathing difficulty. Refer danger signs immediately to health facility.",
    value: "Thank you, {{clinicName}}. This child is low birth weight. Provide extra thermal protection for baby, feed the baby every two hours, visit the family every day to check the baby for the first week, watch for signs of breathing difficulty. Refer danger signs immediately to health facility."
  },
  {
    key: "{{clinicName}} has reported the child of {{patient_name}} as {{birth_weight}} birth weight.",
    value: "{{clinicName}} has reported the child of {{patient_name}} as {{birth_weight}} birth weight."
  },
  {
    key: "Greetings, {{clinicName}}. {{patient_name}} is due for a PNC visit today.",
    value: "Greetings, {{clinicName}}. {{patient_name}} is due for a PNC visit today."
  },
  {
    key: "Thank you. Danger sign {{danger_sign}} has been recorded for {{patient_name}}.",
    value: "Thank you. Danger sign {{danger_sign}} has been recorded for {{patient_name}}."
  },
  {
    key: "Greetings, {{clinicName}}. {{patient_name}} is due to deliver soon. This pregnancy has been flagged as high-risk.",
    value: "Greetings, {{clinicName}}. {{patient_name}} is due to deliver soon. This pregnancy has been flagged as high-risk."
  },
  {
    key: "{{clinicName}} has reported danger sign {{danger_sign}} is present in {{patient_name}}. Please follow up.",
    value: "{{clinicName}} has reported danger sign {{danger_sign}} is present in {{patient_name}}. Please follow up."
  },
  {
    key: "Thank you {{clinicName}}. This pregnancy is high-risk. Call nearest health worker or SBA.",
    value: "Thank you {{clinicName}}. This pregnancy is high-risk. Call nearest health worker or SBA."
  },
  {
    key: "{{clinicName}} has reported labor has started for {{patient_name}}. This pregnancy is high-risk.",
    value: "{{clinicName}} has reported labor has started for {{patient_name}}. This pregnancy is high-risk."
  },
  {
    key: "Thank you {{clinicName}}. Please submit birth report after baby is delivered.",
    value: "Thank you {{clinicName}}. Please submit birth report after baby is delivered."
  },
  {
    key: "Thank you, {{clinicName}}. Notifications for {{patient_name}} have been turned on.",
    value: "Thank you, {{clinicName}}. Notifications for {{patient_name}} have been turned on."
  },
  {
    key: "Thank you, {{clinicName}}. All notifications for {{patient_name}} have been turned off.",
    value: "Thank you, {{clinicName}}. All notifications for {{patient_name}} have been turned off."
  },
  {
    key: "Thank you, {{clinicName}}. This child is low birth weight. provide extra thermal protection for baby, feed the baby every two hours, visit the family every day to check the baby for the first week, watch for signs of breathing difficulty. Refer danger signs immediately to health facility.",
    value: "Thank you, {{clinicName}}. This child is low birth weight. provide extra thermal protection for baby, feed the baby every two hours, visit the family every day to check the baby for the first week, watch for signs of breathing difficulty. Refer danger signs immediately to health facility."
  },
  {
    key: "Thank you, {{clinicName}}. PNC counseling visit has been recorded for {{patient_name}}.",
    value: "Thank you, {{clinicName}}. PNC counseling visit has been recorded for {{patient_name}}."
  },
  {
    key: "Thank you for registering {{patient_name}}. Patient ID is {{patient_id}}. Next ANC visit is in {{weeks}} weeks.",
    value: "Thank you for registering {{patient_name}}. Patient ID is {{patient_id}}. Next ANC visit is in {{weeks}} weeks."
  },
  {
    key: "Greetings, {{clinicName}}. {{patient_name}} is due for an ANC visit this week.",
    value: "Greetings, {{clinicName}}. {{patient_name}} is due for an ANC visit this week."
  },
  {
    key: "Greetings, {{clinicName}}. It's now {{patient_name}}'s 8th month of pregnancy. If you haven't given Miso, please distribute. Make birth plan now. Thank you!",
    value: "Greetings, {{clinicName}}. It's now {{patient_name}}'s 8th month of pregnancy. If you haven't given Miso, please distribute. Make birth plan now. Thank you!"
  },
  {
    key: "Greetings, {{clinicName}}. {{patient_name}} is due to deliver soon.",
    value: "Greetings, {{clinicName}}. {{patient_name}} is due to deliver soon."
  }
]

module.exports = function(key, context) {
    var s;

    context = context || {};

    s = values[key] || key;
    return mustache.to_html(s, context);
};
