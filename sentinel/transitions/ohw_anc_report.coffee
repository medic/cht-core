module.exports =
  form: 'OANC'
  required_fields: 'related_entities.clinic'
  onMatch: (change) ->
    { doc } = change
    { from, patient_id, tasks } = doc
    clinic_phone = @getClinicPhone(doc)
    clinic_name = @getClinicName(doc)
    @getOHWRegistration(patient_id, (err, registration) =>
      if err
        @complete(err, null)
      else
        if registration
          { patient_name } = registration
          @addMessage(doc, clinic_phone, @i18n("Thank you, {{clinic_name}}. ANC counseling visit for {{patient_name}} has been recorded.", clinic_name: clinic_name, patient_name: patient_name))
          before = @date.getDate()
          before.setDate(before.getDate() + @config.get('ohw_obsolete_anc_reminders_days'))
          obsoleteMessages = @obsoleteScheduledMessages(registration, 'anc_visit', before.getTime())
          if obsoleteMessages
            @db.saveDoc(registration, (err) =>
              @complete(err, doc)
            )
          else
            @complete(null, doc)
        else
          clinic_phone = @getClinicPhone(doc)
          if clinic_phone
            @addMessage(doc, clinic_phone, @i18n("No patient with id '{{patient_id}}' found.", patient_id: patient_id))
            @complete(null, doc)
          else
            @complete(null, false)
    )
