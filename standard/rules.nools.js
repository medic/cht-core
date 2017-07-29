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
    var now = new Date();
    var MS_IN_DAY = 24*60*60*1000;  // 1 day in ms
    var MAX_DAYS_IN_PREGNANCY = 44*7;  // 44 weeks
    var DAYS_IN_PNC = 42;

    var createTask = function(contact, schedule, report) {
      return new Task({
        // One task instance for each schedule event per form that triggers a task, not per contact
        // Otherwise they collide when contact has multiple reports of the same form
        _id: report._id + '-' + schedule.id,
        deleted: (contact.contact ? contact.contact.deleted : false) || (report ? report.deleted : false),
        doc: contact,
        contact: contact.contact,
        icon: schedule.icon,
        priority: schedule.description ? 'high' : null,
        priorityLabel: schedule.description ? schedule.description : '',
        icon: schedule.type,
        date: null,
        title: schedule.title,
        resolved: false,
        actions: []
      });
    };

    var emitTask = function(task, scheduleEvent) {
      if (Utils.isTimely(task.date, scheduleEvent)) {
        emit('task', task);
      }
    };

    var createTargetInstance = function(type, report, pass) {
      return new Target({
        _id: report._id + '-' + type,
        deleted: !!report.deleted,
        type: type,
        pass: pass,
        date: report.reported_date
      });
    };

    var emitTargetInstance = function(instance) {
      emit('target', instance);
    };

    var antenatalForms = [
      'V',
      'pregnancy_visit'
    ];

    var deliveryForms = [
      'D',
      'delivery'
    ];

    var postnatalForms = [
      'M',
      'postnatal_visit'
    ];

    var immunizationForms = [
      'V',
      'imm',
      'immunization_visit',
      'DT1',
      'DT2',
      'DT3',
      'BCG',
      'OPV0',
      'OPV1',
      'OPV2',
      'OPV3',
      'PCV1',
      'PCV2',
      'PCV3',
      'RV1',
      'RV2',
      'RV3',
      'VA',
      'MTV1',
      'MTV2',
      'MMR1',
      'MMR2',
      'MMRV1',
      'MMRV2',
      'MN1',
      'MN2',
      'MN3',
      'MN4',
      'FLU',
      'HA1',
      'HA2',
      'JE',
      'YF',
      'TY1',
      'TY2',
      'HPV1',
      'HPV2',
      'HPV3',
      'CH',
      'RB1',
      'RB2',
      'RB3',
      'TBE'
    ];

    var immunizations = [
      'bcg',
      'cholera_1',
      'cholera_2',
      'cholera_3',
      'hep_a_1',
      'hep_a_2',
      'hpv_1',
      'hpv_2',
      'hpv_3',
      'flu',
      'jap_enc',
      'meningococcal_1',
      'meningococcal_2',
      'meningococcal_3',
      'meningococcal_4',
      'mmr_1',
      'mmr_2',
      'mmrv_1',
      'mmrv_2',
      'polio_0',
      'polio_1',
      'polio_2',
      'polio_3',
      'penta_1',
      'penta_2',
      'penta_3',
      'pneumococcal_1',
      'pneumococcal_2',
      'pneumococcal_3',
      'pneumococcal_4',
      'rotavirus_1',
      'rotavirus_2',
      'rotavirus_3',
      'typhoid_1',
      'typhoid_2',
      'vitamin_a',
      'yellow_fever'
    ];

    var isFormFromArraySubmittedInWindow = function (reports, formsArray, startTime, endTime) {
      for ( var i=0; i < formsArray.length; i++ ) {
        if ( Utils.isFormSubmittedInWindow(reports, formsArray[i], startTime , endTime) ) {
          return true;
        }
      }
      return false;
    };

    var isCoveredByUseCase = function (contact, usecase) {      
      if (!contact) {
        // we have reached past the top parent, and have not found a parent with the use case
        return false;
      }
      else if (!contact.parent && !contact.hasOwnProperty('use_cases')) {
        // default is to show all use cases if the top parent doesn't have `use_cases`
        return true;
      }
      else if (contact.parent && contact.parent.use_cases && contact.parent.use_cases.split(' ').indexOf(usecase) !== -1) {
        // found parent with the use case, meaning person is covered by the use case
        return true;
      }
      else {
        // the parent place isn't covered by use case, but perhaps their parent is
        return isCoveredByUseCase(contact.parent, usecase);
      }
    };

    // From medic-sentinel/lib/utils.js
    var isFormCodeSame = function (formCode, test) {
      // case insensitive match with junk padding
      return (new RegExp('^\W*' + formCode + '\\W*$','i')).test(test);
    };
    
    var receivedVaccine = function (report, vaccine) {
      var fieldName = 'received_' + vaccine;
      if ( isFormCodeSame(report.form, vaccine)
        || (isFormCodeSame(report.form, 'immunization_visit') && report.fields.vaccines_received[fieldName] == 'yes')
        || (isFormCodeSame(report.form, 'imm') && report.fields.vaccines_received[fieldName] == 'yes') ) {
        return true;
      }
      else {
        return false;
      }
    };

    var isBcgReported = function (person) {
      var bcgReported = false;
      if (person && person.reports) {
        person.reports.forEach(function(r){
          if (receivedVaccine(r, 'bcg')) {
            bcgReported = true;
          }
        });
      }
      return bcgReported;
    };

    var countDoses = function (report) {
      var dosesGiven = 0;
      immunizations.forEach(function(i) {
        var vaccineDose = 'received_' + i;
        if(report.fields.vaccines_received[vaccineDose] == 'yes') {
          dosesGiven++;
        }
      });
      return dosesGiven;
    };

    // ==============================
    // GENERATE TARGETS
    // ==============================
    if (c.contact != null && c.contact.type === 'person') {

      // INIT
      var birthDate = new Date(c.contact.date_of_birth);
      var ageInMs = new Date(Date.now() - birthDate.getTime());
      var ageInMonths = (Math.abs(ageInMs.getFullYear() - 1970) * 12) + ageInMs.getMonth();
      // var ageInMsAtRegistration = age - c.contact.reported_date;

      // Get most recent of each form to avoid recalculating these
      // var newestPregnancy = Utils.getMostRecentReport(c.reports, 'P');
      var newestPregnancyTimestamp = Math.max(
                                        Utils.getMostRecentTimestamp(c.reports, 'P'),
                                        Utils.getMostRecentTimestamp(c.reports, 'pregnancy')
                                     );

      // var newestDelivery = Utils.getMostRecentReport(c.reports, 'D');
      var newestDeliveryTimestamp = Math.max(
                                      Utils.getMostRecentTimestamp(c.reports, 'D'),
                                      Utils.getMostRecentTimestamp(c.reports, 'delivery')
                                    );

      // ------------------------------
      // PERSON-BASED TARGETS
      // ------------------------------==============================

      // TARGETS FOR CHILDREN UNDER 5 YEARS
      if (ageInMonths < 60) {
        // IMM: CHILDREN REGISTERED THIS MONTH
        var instance = createTargetInstance('imm-children-registered-this-month', c.contact, ageInMonths < 60);
        instance.date = c.contact.reported_date;
        emitTargetInstance(instance);

        // IMM: CHILDREN WITH BCG REPORTED
        var instance = createTargetInstance('imm-children-with-bcg-reported', c.contact, isBcgReported(c));
        instance.date = now.getTime();
        emitTargetInstance(instance);

        // IMM: NUMBER OF CHILDREN
        var instance = createTargetInstance('imm-children-under-5-years', c.contact, true);
        instance.date = now.getTime();
        emitTargetInstance(instance);

        // IMM: CHILDREN WITH 1+ VISIT IN PAST 3 MONTHS
        var visits = 0;
        c.reports.forEach(function(r) {
          // count the number of visit forms sent within the past 3 months
          if (isFormFromArraySubmittedInWindow(c.reports, immunizationForms, Utils.addDate(now, 90 * -1).getTime(), now.getTime())) {
            visits++;
          }
        });
        var instance = createTargetInstance('imm-children-vaccinated-prev-3-months', c.contact, visits >= 1);
        instance.date = now.getTime();
        emitTargetInstance(instance);

        // IMM: CHILDREN WITH NO VISITS
        var noVaccine = true;
        c.reports.forEach(function(r) {
          if(immunizationForms.indexOf(r.form) != -1) {
            noVaccine = false;
          }
        });
        var instance = createTargetInstance('imm-no-vaccine-reported', c.contact, noVaccine);
        instance.date = now.getTime();
        emitTargetInstance(instance);
      }

      // ------------------------------
      // REPORT-BASED TARGETS
      // ------------------------------
      c.reports.forEach(function(r) {

        // IMM: VACCINES DISTRIBUTED THIS MONTH
        if(immunizationForms.indexOf(r.form) != -1) {
          if(r.form == 'immunization_visit' || r.form == 'imm') {
            // Multiple vaccine doses can be reported in a single XForm (app or collect)
            var totalDoses = countDoses(r);
            for(i=0; i<totalDoses; i++) {
              var instance = createTargetInstance('imm-vaccines-given-this-month', r, true);
              instance._id += i;
              emitTargetInstance(instance);
            }
          }
          else { // For TextForms each vaccine is separate report
            var instance = createTargetInstance('imm-vaccines-given-this-month', r, true);
            emitTargetInstance(instance);
          }
        }

        // Pregnancy related widgets
        if (r.reported_date === newestPregnancyTimestamp && (r.form === 'P' || r.form === 'pregnancy')) {

          var lmp = new Date(r.lmp_date);
          var maxEDD = new Date();
          maxEDD.setDate(lmp.getDate() + 294);

          // PREGNANCIES REGISTERED THIS MONTH
          var instance = createTargetInstance('pregnancy-registrations-this-month', r, true);
          // use contact id to avoid counting multiple pregnancies for same person
          instance._id = c.contact._id + '-' + 'pregnancy-registrations-this-month';
          emitTargetInstance(instance);

          // ACTIVE PREGNANCIES
          if ( newestDeliveryTimestamp == null || newestDeliveryTimestamp < newestPregnancyTimestamp || maxEDD < now ) {
            var instance = createTargetInstance('active-pregnancies', r, true);
            instance._id = c.contact._id + '-' + 'active-pregnancies';
            instance.date = now.getTime();
            emitTargetInstance(instance);

            // ACTIVE HIGH-RISK PREGNANCIES
            c.reports.forEach(function(r) {
              if (r.form === 'F') {
                var instance = createTargetInstance('active-pregnancies-high-risk', r, true);
                instance._id = c.contact._id + '-' + 'active-pregnancies-high-risk';
                instance.date = now.getTime();
                emitTargetInstance(instance);
              }
            });

            // UPCOMING EDD THIS MONTH
            var edd = new Date(r.expected_date);
            if (edd.getFullYear() == now.getFullYear() && edd.getMonth() == now.getMonth()) {
              var instance = createTargetInstance('expected-deliveries-this-month', r, true);
              instance._id = c.contact._id + '-' + 'expected-deliveries-this-month';
              instance.date = now.getTime();
              emitTargetInstance(instance);
            }

            // UPCOMING VISIT THIS MONTH
            // TODO: Need to check r.scheduled_tasks[].due for any messages going out this month
            // if () {
            //   var instance = createTargetInstance('expected-visits-this-month', r, true);
            //   instance._id = c.contact._id + '-' + 'expected-visits-this-month';
            //   emitTargetInstance(instance);
            // }
          }
        }

        // Birth related widgets
        if (r.reported_date === newestDeliveryTimestamp && (r.form === 'D' || r.form === 'delivery')) {

          // BIRTHS THIS MONTH
          var instance = createTargetInstance('births-this-month', r, true);
          instance._id = c.contact._id + '-' + 'births-this-month';
          emitTargetInstance(instance);

          // BIRTHS ALL-TIME TOTAL
          var instance = createTargetInstance('births-total', r, true);
          instance._id = c.contact._id + '-' + 'births-total';
          instance.date = now.getTime();
          emitTargetInstance(instance);

          // % DELIVERIES AT HEALTH FACILITY THIS MONTH
          var pass = r.fields.delivery_code && r.fields.delivery_code.toUpperCase() == 'F'; // toUpperCase() not ideal for special unicode chars
          var instance = createTargetInstance('delivery-at-facility-this-month', r, pass);
          emitTargetInstance(instance);

          // % DELIVERIES AT HEALTH FACILITY TOTAL
          var pass = r.fields.delivery_code && r.fields.delivery_code.toUpperCase() == 'F';
          var instance = createTargetInstance('delivery-at-facility-total', r, pass);
          instance.date = now.getTime();
          emitTargetInstance(instance);

          // % DELIVERIES ALL TIME WITH 1+ AND 4+ VISITS
          var visits = 0;
          c.reports.forEach(function(r) {
            // count the number of visit forms sent between pregnancy registration and delivery
            if (r.reported_date > newestPregnancyTimestamp && (r.form === 'V' || r.form === 'pregnancy_visit')) {
              visits++;
            }
          });
          var instance = createTargetInstance('delivery-with-min-1-visit', r, visits >= 1);
          instance.date = now.getTime();
          emitTargetInstance(instance);

          var instance = createTargetInstance('delivery-with-min-4-visits', r, visits >= 4);
          instance.date = now.getTime();
          emitTargetInstance(instance);

        }
      });
    }

    // ==============================
    // GENERATES TASKS
    // ==============================
    if (c.contact && c.contact.type === 'person') {
      // ------------------------------
      // PERSON-BASED TASKS
      // ------------------------------
      // None

      // ------------------------------
      // REPORT-BASED TASKS
      // ------------------------------
      c.reports.forEach(
        function(r) {

          switch(r.form) {

            case 'P':
            case 'pregnancy':

              // Pregnancy is high risk:
              // - if `pregnancy` form was used and has risk factors or danger signs in report
              // - if any Flag reports were submitted during time of pregnancy
              // It is ok to check past the delivery date because those tasks would be cleared anyhow
              var isHighRiskPregnancy = (r.form === 'pregnancy' && r.fields && (r.fields.risk_factors || r.fields.danger_signs))
                || Utils.isFormSubmittedInWindow(c.reports, 'F', r.reported_date, Utils.addDate(new Date(r.reported_date), MAX_DAYS_IN_PREGNANCY).getTime());

              if (r.scheduled_tasks) {

                // Assign a missing visit schedule to last SMS of each group
                for (var i = 0; i < r.scheduled_tasks.length; i++) {

                  // Associate tasks to the last message of each group, except the last one which needs a Missing Birth Report task. Be mindful of overflow when peaking ahead!
                  if (i+1 < r.scheduled_tasks.length && r.scheduled_tasks[i].group != r.scheduled_tasks[i+1].group) {
                    var schedule = Utils.getSchedule('pregnancy-missing-visit');
                    if (schedule) {
                      for (var k = 0; k < schedule.events.length; k++) {
                        var s = schedule.events[k];
                        var dueDate = new Date(r.scheduled_tasks[i].due);
                        var task = createTask(c, s, r);
                        // each group needs its own task, otherwise will be combined into one
                        task._id += '-' + i;
                        task.date = dueDate;
                        task.priority = isHighRiskPregnancy ? 'high' : null;
                        task.priorityLabel = isHighRiskPregnancy ? ( schedule.description ? schedule.description : 'High Risk' ) : '';
                        task.actions.push({
                          type: 'report',
                          form: 'pregnancy_visit',
                          label: 'Follow up',
                          content: {
                            source: 'task',
                            source_id: r._id,
                            contact: c.contact
                          }
                        });
                        // Resolved if there is a newer pregnancy, there has been a delivery, or visit received in window
                        task.resolved = r.reported_date < newestPregnancyTimestamp
                          || r.reported_date < newestDeliveryTimestamp
                          || isFormFromArraySubmittedInWindow(c.reports, antenatalForms, Utils.addDate(dueDate, s.start * -1).getTime(), Utils.addDate(dueDate, s.end).getTime());

                        emitTask(task, s);
                      }
                    }
                  }
                }

                // Attach the missing birth schedule to the last scheduled SMS
                var schedule = Utils.getSchedule('pregnancy-missing-birth');
                if (schedule) {
                  for (var k = 0; k < schedule.events.length; k++) {
                    var s = schedule.events[k];

                    var dueDate = new Date(r.scheduled_tasks[r.scheduled_tasks.length-1].due);
                    var task = createTask(c, s, r);
                    task.date = dueDate;
                    task.priority = isHighRiskPregnancy ? 'high' : null;
                    task.priorityLabel = isHighRiskPregnancy ? ( schedule.description ? schedule.description : 'High Risk' ) : '';
                    task.actions.push({
                      type: 'report',
                      form: 'delivery',
                      label: 'Follow up',
                      content: {
                        source: 'task',
                        source_id: r._id,
                        contact: c.contact
                      }
                    });
                    // Missing Birth Report
                    // Resolved only if a birth report was submitted
                    // TODO: Need to account for duplicates: multiple registrations for same pregnancy
                    task.resolved = isFormFromArraySubmittedInWindow(c.reports, deliveryForms, r.reported_date, now.getTime());
                    emitTask(task, s);
                  }
                }
              }
              break;

            case 'C':
            case 'immunization':

              if (r.scheduled_tasks) {

                // Assign a missing visit schedule to last SMS of each group
                for (var i = 0; i < r.scheduled_tasks.length; i++) {

                  // Associate tasks to the last message of each group. Be mindful of overflow when peaking ahead!
                  if (i+1 == r.scheduled_tasks.length
                    || i+1 < r.scheduled_tasks.length && r.scheduled_tasks[i].group != r.scheduled_tasks[i+1].group) {
                    var schedule = Utils.getSchedule('immunization-missing-visit');
                    if (schedule) {
                      for (var k = 0; k < schedule.events.length; k++) {
                        var s = schedule.events[k];
                        var dueDate = new Date(r.scheduled_tasks[i].due);
                        var task = createTask(c, s, r);
                        // each group needs its own task, otherwise will be combined into one
                        task._id += '-' + i;
                        task.date = dueDate;
                        task.actions.push({
                          type: 'report',
                          form: 'immunization_visit',
                          label: 'Follow up',
                          content: {
                            source: 'task',
                            source_id: r._id,
                            contact: c.contact
                          }
                        });
                        // Resolved if there an immunization report has been received in time window
                        task.resolved = isFormFromArraySubmittedInWindow(c.reports, immunizationForms, Utils.addDate(dueDate, s.start * -1).getTime(), Utils.addDate(dueDate, s.end).getTime());

                        emitTask(task, s);
                      }
                    }
                  }
                }
              }
              break;

            case 'D':
            case 'delivery':
            
              // Only show postnatal tasks if doing PNC
              if ( !isCoveredByUseCase(c.contact, 'pnc') ) {
                break;
              }

              var isHomeBirth = false;

              // PNC TASK 1: If a home delivery, needs clinic tasks
              if ( r.fields && r.fields.delivery_code && r.fields.delivery_code.toUpperCase() !== 'F' ) {
                isHomeBirth = true;
                var schedule = Utils.getSchedule('postnatal-home-birth');
                if (schedule) {
                  for (var k = 0; k < schedule.events.length; k++) {
                    var s = schedule.events[k];
                    var dueDate = new Date(r.reported_date);
                    var task = createTask(c, s, r);
                    task.date = dueDate;
                    task.actions.push({
                      type: 'report',
                      form: 'postnatal_visit',
                      label: 'Follow up',
                      content: {
                        source: 'task',
                        source_id: r._id,
                        contact: c.contact
                      }
                    });
                    // Resolved if there a visit report received in time window or a newer pregnancy
                    task.resolved = r.reported_date < newestDeliveryTimestamp
                          || r.reported_date < newestPregnancyTimestamp
                          || isFormFromArraySubmittedInWindow(c.reports, postnatalForms, Utils.addDate(dueDate, s.start * -1).getTime(), Utils.addDate(dueDate, s.end).getTime());

                    emitTask(task, s);
                  }
                }
              }

              // PNC TASK 2: if a F flag sent in 42 days since delivery needs clinic task
              if (Utils.isFormSubmittedInWindow(c.reports, 'F', r.reported_date, Utils.addDate(new Date(r.reported_date), DAYS_IN_PNC).getTime())) {
                var schedule = Utils.getSchedule('postnatal-danger-sign');
                if (schedule) {
                  for (var k = 0; k < schedule.events.length; k++) {
                    var s = schedule.events[k];
                    var dueDate = new Date(r.reported_date);
                    var task = createTask(c, s, r);
                    task.date = dueDate;
                    task.actions.push({
                      type: 'report',
                      form: 'postnatal_visit',
                      label: 'Follow up',
                      content: {
                        source: 'task',
                        source_id: r._id,
                        contact: c.contact
                      }
                    });
                    // Only resolved with PNC report received from nurse in time window or a newer pregnancy
                    task.resolved = r.reported_date < newestDeliveryTimestamp
                          || r.reported_date < newestPregnancyTimestamp
                          || isFormFromArraySubmittedInWindow(c.reports, 'postnatal_visit', Utils.addDate(dueDate, s.start * -1).getTime(), Utils.addDate(dueDate, s.end).getTime());

                    emitTask(task, s);
                  }
                }
              }

              // PNC TASK 3: Assign a missing visit schedule to last SMS of each group
              if (r.scheduled_tasks) {
                for (var i = 0; i < r.scheduled_tasks.length; i++) {

                  // Associate tasks to the last message of each group. Be mindful of overflow when peaking ahead!
                  if (i+1 == r.scheduled_tasks.length
                    || i+1 < r.scheduled_tasks.length && r.scheduled_tasks[i].group != r.scheduled_tasks[i+1].group) {
                    var schedule = Utils.getSchedule('postnatal-missing-visit');
                    if (schedule) {
                      for (var k = 0; k < schedule.events.length; k++) {
                        var s = schedule.events[k];
                        var dueDate = new Date(r.scheduled_tasks[i].due);
                        var task = createTask(c, s, r);
                        // each group needs its own task, otherwise will be combined into one
                        task._id += '-' + i;
                        task.date = dueDate;
                        task.priority = isHomeBirth ? 'high' : null;
                        task.priorityLabel = isHomeBirth ? ( schedule.description ? schedule.description : 'Home Birth' ) : '';
                        task.actions.push({
                          type: 'report',
                          form: 'postnatal_visit',
                          label: 'Follow up',
                          content: {
                            source: 'task',
                            source_id: r._id,
                            contact: c.contact
                          }
                        });
                        // Resolved if there a visit report received in time window or a newer pregnancy
                        task.resolved = r.reported_date < newestDeliveryTimestamp
                          || r.reported_date < newestPregnancyTimestamp
                          || isFormFromArraySubmittedInWindow(c.reports, postnatalForms, Utils.addDate(dueDate, s.start * -1).getTime(), Utils.addDate(dueDate, s.end).getTime());

                        emitTask(task, s);
                      }
                    }
                  }
                }
              }
              break;
          }
        }
      );
    }
    emit('_complete', { _id: true });
  }
}
