module.exports =
  form: 'ONOT'
  required_fields: 'related_entities.clinic patient_id'
  onMatch: (change) ->
    { doc } = change
    { notifications, patient_id, reason_for_deactivation } = doc

    clinic_phone = @getClinicPhone(doc)
    clinic_name = @getClinicName(doc)

    @getOHWRegistration(patient_id, (err, registration) =>
      if err
        @complete(err, false)
      else
        { patient_name } = registration

        if notifications
          @unmuteScheduledMessages(registration)
          @addMessage(doc, clinic_phone, @i18n("Thank you, {{clinic_name}}. Notifications for {{patient_name}} have been turned on.", clinic_name: clinic_name, patient_name: patient_name))
        else
          @muteScheduledMessages(registration)
          @addMessage(doc, clinic_phone, @i18n("Thank you, {{clinic_name}}. All notifications for {{patient_name}} have been turned off.", clinic_name: clinic_name, patient_name: patient_name))

        registration.muted = not notifications

        @db.saveDoc(registration, (err) =>
          @complete(err, doc)
        )
    )
