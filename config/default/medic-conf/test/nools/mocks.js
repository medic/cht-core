let idCounter;
const TEST_DATE = 1431143098575;
// make the tests work in any timezone.  TODO it's not clear if this is a hack,
// or actually correct.  see https://github.com/medic/medic-webapp/issues/4928
const TEST_DAY = new Date(TEST_DATE);
TEST_DAY.setHours(0, 0, 0, 0);

function aReportBasedTask() {
  return aTask('reports');
}

function aPersonBasedTask() {
  var task = aTask('contacts');
  task.appliesToType = ['person'];
  return task;
}

function aPlaceBasedTask() {
  var task = aTask('contacts');
  task.appliesToType = ['clinic'];
  return task;
}

function aTask(type) {
  ++idCounter;
  return {
    appliesTo: type,
    name: `task-${idCounter}`,
    title: [ { locale:'en', content:`Task ${idCounter}` } ],
    actions: [ { form:'example-form' } ],
    events: [ {
      id: `task`,
      days:0, start:0, end:1,
    } ],
    resolvedIf: function() { return false; },
  };
}

function aScheduledTaskBasedTask() {
  ++idCounter;
  return {
    appliesTo: 'scheduled_tasks',
    name: `task-${idCounter}`,
    title: [ { locale:'en', content:`Task ${idCounter}` } ],
    actions: [],
    events: [ {
      id: `task-${idCounter}`,
      days:0, start:0, end:1,
    } ],
    resolvedIf: function() { return false; },
    appliesIf: function() { return true; },
  };
}

function aPersonBasedTarget() {
  ++idCounter;
  return {
    id: `pT-${idCounter}`,
    appliesTo: 'contacts',
    appliesToType: ['person'],
  };
}

function aPlaceBasedTarget() {
  ++idCounter;
  return {
    id: `plT-${idCounter}`,
    appliesTo: 'contacts',
    appliesToType: ['clinic'],
  };
}

function aReportBasedTarget() {
  ++idCounter;
  return {
    id: `rT-${idCounter}`,
    appliesTo: 'reports',
  };
}

function aReport() {
  ++idCounter;
  return { _id:`r-${idCounter}`, form:'F', reported_date:TEST_DATE };
}

function aReportWithScheduledTasks(scheduledTaskCount) {
  ++idCounter;

  const scheduled_tasks = [];
  while(scheduledTaskCount--) scheduled_tasks.push({ due:TEST_DATE });

  return { _id:`r-${idCounter}`, form:'F', scheduled_tasks };
}

function personWithoutReports() {
  return personWithReports();
}

function personWithReports(...reports) {
  ++idCounter;
  return { contact:{ _id:`c-${idCounter}`, type:'person', reported_date:TEST_DATE }, reports };
}

function configurableHierarchyPersonWithReports(...reports) {
  ++idCounter;
  return { contact: { _id:`c-${idCounter}`, type:`contact`, contact_type:`custom`, reported_date:TEST_DATE }, reports };
}

function placeWithoutReports() {
  return placeWithReports();
}

function placeWithReports(...reports) {
  ++idCounter;
  return { contact:{ _id:`c-${idCounter}`, type:'clinic', reported_date:TEST_DATE }, reports };
}

function unknownContactWithReports(...reports) {
  return { reports };
}

function aRandomTimestamp() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

module.exports = {
  reset: () => { idCounter = 0; },
  TEST_DATE,
  TEST_DAY,
  aReportBasedTask,
  aPersonBasedTask,
  aPlaceBasedTask,
  aTask,
  aScheduledTaskBasedTask,
  aPersonBasedTarget,
  aPlaceBasedTarget,
  aReportBasedTarget,
  aReport,
  aReportWithScheduledTasks,
  personWithoutReports,
  configurableHierarchyPersonWithReports,
  personWithReports,
  placeWithoutReports,
  placeWithReports,
  unknownContactWithReports,
  aRandomTimestamp,
};