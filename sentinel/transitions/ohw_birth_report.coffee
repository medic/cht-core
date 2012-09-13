_ = require('underscore')
ids = require('../lib/ids')

module.exports =
  form: 'OBIR'
  required_fields: 'related_entities.clinic patient_id'
  onMatch: (change) ->
    { doc } = change
    { birth_weight, days_since_delivery, outcome_child, patient_id, reported_date } = doc

    # replace date if we're faking the 'real' time
    reported_date = @date.getDate() if @date.isSynthetic()

    @getOHWRegistration(patient_id, (err, registration) =>
      if registration
        { patient_name } = registration
        clinic_phone = @getClinicPhone(registration)
        clinic_name = @getClinicName(registration)
        parent_phone = @getParentPhone(registration)
        registration.child_outcome = outcome_child
        registration.child_birth_weight = birth_weight

        child_birth_date = new Date(reported_date)
        child_birth_date.setHours(0, 0, 0, 0)
        child_birth_date.setDate(child_birth_date.getDate() - days_since_delivery)
        registration.child_birth_date = child_birth_date.getTime()

        if outcome_child is 'Deceased'
          @addMessage(doc, clinic_phone, @i18n("Thank you for your report."))
          @addMessage(doc, parent_phone, @i18n("{{clinic_name}} has reported the child of {{patient_name}} as deceased.", clinic_name: clinic_name, patient_name: patient_name))
        else
          if birth_weight is 'Normal'
            @addMessage(doc, clinic_phone, @i18n("Thank you, {{clinic_name}}.", clinic_name: clinic_name))
            @scheduleReminders(registration, @config.get('ohw_pnc_schedule_days'))
          else
            @addMessage(doc, clinic_phone, @i18n("Thank you, {{clinic_name}}. This child is low birth weight. Provide extra thermal protection for baby, feed the baby every two hours, visit the family every day to check the baby for the first week, watch for signs of breathing difficulty. Refer danger signs immediately to health facility.", clinic_name: clinic_name))
            @addMessage(doc, parent_phone, @i18n("{{clinic_name}} has reported the child of {{patient_name}} as {{birth_weight}} birth weight.", clinic_name: clinic_name, patient_name: patient_name, birth_weight: birth_weight))
            @scheduleReminders(registration, @config.get('ohw_low_weight_pnc_schedule_days'))
        @db.saveDoc(registration, (err, result) =>
          @complete(err, doc)
        )
      else
        clinic_phone = @getClinicPhone(doc)
        if clinic_phone
          @addMessage(doc, clinic_phone, @i18n("No patient with id '{{patient_id}}' found.", patient_id: patient_id))
          @complete(null, doc)
    )
  scheduleReminders: (registration, days...) ->
    @clearScheduledMessages(registration, 'anc_visit', 'miso_reminder', 'upcoming_delivery', 'pnc_visit', 'outcome_request')

    { child_birth_date, patient_name } = registration

    clinic_name = @getClinicName(registration)
    clinic_phone = @getClinicPhone(registration)

    birth = new Date(child_birth_date)
    now = @date.getDate()
    days = _.flatten(days)
    _.each(days, (day) ->
      marker = new Date(birth.getTime())
      marker.setDate(marker.getDate() + day)
      if marker > now
        @addScheduledMessage(registration,
          due: marker
          message: @i18n("Greetings, {{clinic_name}}. {{patient_name}} is due for a PNC visit today.", clinic_name: clinic_name, patient_name: patient_name)
          phone: clinic_phone
          type: 'pnc_visit'
        )
    , @)
