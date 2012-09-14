_ = require('underscore')

module.exports =
  required_fields: 'form related_entities !related_entities.clinic'
  onMatch: (change) ->
    { doc } = change
    { from, related_entities } = doc

    # use reference id to find clinic if defined
    if doc.refid
        from = doc.refid
        view = 'clinic_by_refid'
    else
        view = 'clinic_by_phone'

    @db.view('kujua-base', view, key: [from], limit: 1, (err, data) =>
      if err
        @complete(err, false)
      else
        clinic = _.first(data.rows)?.value
        existing = related_entities.clinic or {}
        { _id, _rev } = existing
        if clinic and (clinic._id isnt _id or clinic._rev isnt _rev)
          related_entities.clinic = clinic
          # remove facility not found errors
          doc.errors = (e for e in doc.errors when e.code != 'facility_not_found')
          @complete(null, doc)
        else
          @complete(null, false)
    )
