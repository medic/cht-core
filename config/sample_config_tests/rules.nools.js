define Target {
    _id: null,
    deleted: null,
    type: null,
    pass: null,
    date: null
  }

  define Contact {
    contact: null,
    reports: null
  }

  define Task {
    _id: null,
    deleted: null,
    doc: null,
    contact: null,
    icon: null,
    date: null,
    title: null,
    fields: null,
    resolved: null,
    priority: null,
    priorityLabel: null,
    reports: null,
    actions: null
  }

  rule GenerateEvents {
    when {
      c: Contact
    }
    then {
        var schedule = Utils.getSchedule(c.reports[0].form);
        schedule.events.forEach(function(event){
        var t = new Task({
            _id: c.reports[0]._id + '-' + event.id,
            deleted: (c.contact ? c.contact.deleted : false),
            doc: c,
            contact: c.contact,
            priority: 'high',
            priorityLabel: 'this is a test',
            date: null,
            title: event.title,
            fields: [],
            resolved: false,
            actions: schedule.events
        });
        emit('task', t);
        });
    }
  }