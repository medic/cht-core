function(doc) {
  if (doc.type === 'clinic') {
    var dh = doc.parent && doc.parent.parent,
        dh_id = dh && dh._id,
        dh_name = dh && dh.name,
        hc_id = doc.parent && doc.parent._id,
        hc_name = doc.parent && doc.parent.name,
        cl_name = doc.name,
        phone = doc.contact && doc.contact.phone;

    if (!cl_name && doc.contact) {
      if (doc.contact.name) {
        cl_name = doc.contact.name;
        if (doc.contact.rc_code) {
          cl_name += ' ' + doc.contact.rc_code;
        }
      } else {
        cl_name = doc.contact.rc_code;
      }
    }

    emit([
      dh_id,
      hc_id,
      doc._id,
      dh_name,
      hc_name,
      cl_name,
      phone
    ]);
  }
}
