_ = require('underscore')

module.exports =
  form: 'ODGR'
  required_fields: 'patient_id related_entities.clinic'
  onMatch: (change) ->
    { doc } = change
    { danger_sign, patient_id, tasks } = doc
    parent_phone = @getParentPhone(doc)
    @getOHWRegistration(patient_id, (err, registration) =>
      if registration
        { danger_signs, patient_name, scheduled_tasks } = registration

        clinic_name = @getClinicName(registration)
        clinic_phone = @getClinicPhone(registration)
        @addMessage(doc, clinic_phone, @i18n("Thank you. Danger sign {{danger_sign}} has been recorded for {{patient_name}}.", danger_sign: danger_sign, patient_name: patient_name))

        danger_signs ?= []
        danger_signs.push(doc.danger_sign)
        registration.danger_signs = _.unique(danger_signs)

        _.each(scheduled_tasks, (task) ->
          { messages, type } = task
          if type is 'upcoming_delivery'
            messages[0].message = @i18n("Greetings, {{clinic_name}}. {{patient_name}} is due to deliver soon. This pregnancy has been flagged as high-risk.", clinic_name: clinic_name, patient_name: patient_name)
        , @)
        if parent_phone
          @addMessage(doc, parent_phone, @i18n("{{clinic_name}} has reported danger sign {{danger_sign}} is present in {{patient_name}}. Please follow up.", clinic_name: clinic_name, danger_sign: danger_sign, patient_name: patient_name))
        @db.saveDoc(registration, (err) =>
          @complete(err, doc)
        )
      else
        clinic_phone = @getClinicPhone(doc)
        if clinic_phone
          @addMessage(doc, clinic_phone, @i18n("No patient with id '{{patient_id}}' found.", patient_id: patient_id))
          @complete(null, doc)
    )
