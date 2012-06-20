_ = require('underscore')

module.exports =
  form: 'OPNC'
  required_fields: 'related_entities.clinic'
  onMatch: (change) ->
    { doc } = change
    { child_weight, patient_id } = doc

    clinic_phone = @getClinicPhone(doc)
    clinic_name = @getClinicName(doc)

    @getOHWRegistration(patient_id, (err, registration) =>
      if err
        @complete(err, null)
      else
        if registration
          { child_birth_weight, patient_name } = registration
          previous_weight = registration.child_weight or child_birth_weight
          if child_weight isnt 'Normal' and previous_weight is 'Normal'
            @addMessage(doc, clinic_phone, @i18n("Thank you, {{clinic_name}}. This child is low birth weight. provide extra thermal protection for baby, feed the baby every two hours, visit the family every day to check the baby for the first week, watch for signs of breathing difficulty. Refer danger signs immediately to health facility.", clinic_name: clinic_name))
          else
            @addMessage(doc, clinic_phone, @i18n("Thank you, {{clinic_name}}. PNC counseling visit has been recorded for {{patient_name}}.", clinic_name: clinic_name, patient_name: patient_name))
          registration.child_weight = child_weight
          @db.saveDoc(registration, (err, result) =>
            @complete(err, doc)
          )
        else
          clinic_phone = @getClinicPhone(doc)
          if clinic_phone
            @addMessage(doc, clinic_phone, @i18n("No patient with id '{{patient_id}}' found.", patient_id: patient_id))
            @complete(null, doc)
    )
