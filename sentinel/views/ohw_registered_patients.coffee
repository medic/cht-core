module.exports =
  map: (doc) ->
    { form, patient_identifiers } = doc
    if form is 'ORPT'
      patient_identifiers.forEach((id) ->
        emit(id, doc)
      )
