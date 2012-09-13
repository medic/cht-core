db = require('./db')
mustache = require('mustache')
_ = require('underscore')

values = {}

key = 'sentinel-translations'

fetchConfig = (count = 0) ->
  db.getDoc(key, (err, doc) ->
    if err and count is 0
      doc =
        keys: defaults
      db.saveDoc(key, doc, (err) ->
        if err
          throw err
        else
          fetchConfig(count++)
      )
    else if err
      throw err
    else
      values = _.reduce(doc.keys, (memo, translation) ->
        { key, value } = translation
        memo[key] = value
        memo
      , {})
  )

fetchConfig()

defaults = [
  {
    key: "This is a reminder to submit your report for week {{week}} of {{year}}. Thank you!"
    value: "This is a reminder to submit your report for week {{week}} of {{year}}. Thank you!"
  }
  {
    key: "You have not yet submitted your report for week {{week}} of {{year}}. Please do so as soon as possible. Thanks!"
    value: "You have not yet submitted your report for week {{week}} of {{year}}. Please do so as soon as possible. Thanks!"
  }
  {
    key: "Thank you, {{clinic_name}}. ANC counseling visit for {{patient_name}} has been recorded."
    value: "Thank you, {{clinic_name}}. ANC counseling visit for {{patient_name}} has been recorded."
  }
  {
    key: "No patient with id '{{patient_id}}' found."
    value: "No patient with id '{{patient_id}}' found."
  }
  {
    key: "Thank you for your report."
    value: "Thank you for your report."
  }
  {
    key: "{{clinic_name}} has reported the child of {{patient_name}} as deceased."
    value: "{{clinic_name}} has reported the child of {{patient_name}} as deceased."
  }
  {
    key: "Thank you, {{clinic_name}}."
    value: "Thank you, {{clinic_name}}."
  }
  {
    key: "Thank you, {{clinic_name}}. This child is low birth weight. Provide extra thermal protection for baby, feed the baby every two hours, visit the family every day to check the baby for the first week, watch for signs of breathing difficulty. Refer danger signs immediately to health facility."
    value: "Thank you, {{clinic_name}}. This child is low birth weight. Provide extra thermal protection for baby, feed the baby every two hours, visit the family every day to check the baby for the first week, watch for signs of breathing difficulty. Refer danger signs immediately to health facility."
  }
  {
    key: "{{clinic_name}} has reported the child of {{patient_name}} as {{birth_weight}} birth weight."
    value: "{{clinic_name}} has reported the child of {{patient_name}} as {{birth_weight}} birth weight."
  }
  {
    key: "Greetings, {{clinic_name}}. {{patient_name}} is due for a PNC visit today."
    value: "Greetings, {{clinic_name}}. {{patient_name}} is due for a PNC visit today."
  }
  {
    key: "Thank you. Danger sign {{danger_sign}} has been recorded for {{patient_name}}."
    value: "Thank you. Danger sign {{danger_sign}} has been recorded for {{patient_name}}."
  }
  {
    key: "Greetings, {{clinic_name}}. {{patient_name}} is due to deliver soon. This pregnancy has been flagged as high-risk."
    value: "Greetings, {{clinic_name}}. {{patient_name}} is due to deliver soon. This pregnancy has been flagged as high-risk."
  }
  {
    key: "{{clinic_name}} has reported danger sign {{danger_sign}} is present in {{patient_name}}. Please follow up."
    value: "{{clinic_name}} has reported danger sign {{danger_sign}} is present in {{patient_name}}. Please follow up."
  }
  {
    key: "Thank you {{clinic_name}}. This pregnancy is high-risk. Call nearest health worker or SBA."
    value: "Thank you {{clinic_name}}. This pregnancy is high-risk. Call nearest health worker or SBA."
  }
  {
    key: "{{clinic_name}} has reported labor has started for {{patient_name}}. This pregnancy is high-risk."
    value: "{{clinic_name}} has reported labor has started for {{patient_name}}. This pregnancy is high-risk."
  }
  {
    key: "Thank you {{clinic_name}}. Please submit birth report after baby is delivered."
    value: "Thank you {{clinic_name}}. Please submit birth report after baby is delivered."
  }
  {
    key: "Thank you, {{clinic_name}}. Notifications for {{patient_name}} have been turned on."
    value: "Thank you, {{clinic_name}}. Notifications for {{patient_name}} have been turned on."
  }
  {
    key: "Thank you, {{clinic_name}}. All notifications for {{patient_name}} have been turned off."
    value: "Thank you, {{clinic_name}}. All notifications for {{patient_name}} have been turned off."
  }
  {
    key: "Thank you, {{clinic_name}}. This child is low birth weight. provide extra thermal protection for baby, feed the baby every two hours, visit the family every day to check the baby for the first week, watch for signs of breathing difficulty. Refer danger signs immediately to health facility."
    value: "Thank you, {{clinic_name}}. This child is low birth weight. provide extra thermal protection for baby, feed the baby every two hours, visit the family every day to check the baby for the first week, watch for signs of breathing difficulty. Refer danger signs immediately to health facility."
  }
  {
    key: "Thank you, {{clinic_name}}. PNC counseling visit has been recorded for {{patient_name}}."
    value: "Thank you, {{clinic_name}}. PNC counseling visit has been recorded for {{patient_name}}."
  }
  {
    key: "Thank you for registering {{patient_name}}. Patient ID is {{patient_id}}. Next ANC visit is in {{weeks}} weeks."
    value: "Thank you for registering {{patient_name}}. Patient ID is {{patient_id}}. Next ANC visit is in {{weeks}} weeks."
  }
  {
    key: "Greetings, {{clinic_name}}. {{patient_name}} is due for an ANC visit this week."
    value: "Greetings, {{clinic_name}}. {{patient_name}} is due for an ANC visit this week."
  }
  {
    key: "Greetings, {{clinic_name}}. It's now {{patient_name}}'s 8th month of pregnancy. If you haven't given Miso, please distribute. Make birth plan now. Thank you!"
    value: "Greetings, {{clinic_name}}. It's now {{patient_name}}'s 8th month of pregnancy. If you haven't given Miso, please distribute. Make birth plan now. Thank you!"
  }
  {
    key: "Greetings, {{clinic_name}}. {{patient_name}} is due to deliver soon."
    value: "Greetings, {{clinic_name}}. {{patient_name}} is due to deliver soon."
  }
]

module.exports = (key, context = {}) ->
  s = values[key] or key
  mustache.to_html(s, context)
