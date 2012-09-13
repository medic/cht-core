_ = require('underscore')

module.exports =
  form: 'OLAB'
  required_fields: 'related_entities.clinic patient_id'
  onMatch: (change) ->
    { doc } = change
    { patient_id } = doc
    @getOHWRegistration(patient_id, (err, registration) =>
      @complete(err, false) if err
      if registration
        { patient_name } = registration
        clinic_phone = @getClinicPhone(registration) # in case different?
        clinic_name = @getClinicName(registration)
        parent_phone = @getParentPhone(registration)
        high_risk = registration.danger_signs?.length > 0
        if high_risk
          @addMessage(doc, clinic_phone, @i18n("Thank you {{clinic_name}}. This pregnancy is high-risk. Call nearest health worker or SBA.", clinic_name: clinic_name))
          @addMessage(doc, parent_phone, @i18n("{{clinic_name}} has reported labor has started for {{patient_name}}. This pregnancy is high-risk.", clinic_name: clinic_name, patient_name: patient_name))
        else
          @addMessage(doc, clinic_phone, @i18n("Thank you {{clinic_name}}. Please submit birth report after baby is delivered.", clinic_name: clinic_name))
      else
        clinic_phone = @getClinicPhone(registration)
        @addMessage(doc, clinic_phone, @i18n("No patient with id '{{patient_id}}' found.", patient_id: patient_id))

      @complete(null, doc)
    )
