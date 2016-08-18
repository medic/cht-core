// WARNING: If updating this view also update the extractKeysFromDoc function in api/handlers/changes.js
function(doc) {

  var emitPlace = function(place) {
    if (!place) {
      emit([ '_unassigned' ]);
      return;
    }
    while (place) {
      if (place._id) {
        emit([ place._id ]);
      }
      place = place.parent;
    }
    return;
  };

  if (doc._id === 'resources' || doc._id === 'appcache') {
    emit([ '_all' ]);
    return;
  }

  switch (doc.type) {
    case 'data_record':
      var place;
      if (doc.kujua_message === true) {
        // outgoing message
        place = doc.tasks &&
                doc.tasks[0] &&
                doc.tasks[0].messages &&
                doc.tasks[0].messages[0] &&
                doc.tasks[0].messages[0].contact
      } else {
        // incoming message
        place = doc.contact;
      }
      if (place) {
        emit([ place._id ]);
      }
      return;
    case 'form':
    case 'translations':
      emit([ '_all' ]);
      return;
    case 'clinic':
    case 'district_hospital':
    case 'health_center':
    case 'person':
      emitPlace(doc);
      return;
  }
};
