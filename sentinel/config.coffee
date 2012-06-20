db = require('./db')

config =
  ohw_anc_reminder_schedule_weeks: [16, 24, 32, 36]
  ohw_miso_reminder_weeks: 32
  ohw_upcoming_delivery_weeks: 37
  ohw_outcome_request_weeks: 41
  ohw_pnc_schedule_days: [1, 3, 7]
  ohw_low_weight_pnc_schedule_days: [1..7]
  ohw_obsolete_anc_reminders_days: 21
  cdc_send_reminders: false
  id_format: '111111'

key = 'sentinel-configuration'

fetchConfig = (callback, count = 0) ->
  db.getDoc(key, (err, doc) ->
    if err
      if count is 0
        db.saveDoc(key, config, fetchConfig(callback, count++))
      else
        throw err
    else
      config = doc
      callback()
  )

module.exports =
  get: (key) ->
    config[key]
  load: fetchConfig
