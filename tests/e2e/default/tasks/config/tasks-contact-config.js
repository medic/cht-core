const { CONTACT_TYPES } = require('@medic/constants');

module.exports = [
  {
    name: 'add_household_members_task',
    title: 'Add Household Members',
    appliesTo: 'contacts',
    appliesToType: ['clinic'],
    resolvedIf: () => false,
    events: [{
      id: 'add_household_members_task_event_id',
      days: 0,
      start: 0,
      end: 1,
    }],
    actions: [
      {
        type: 'contact',
        modifyContent: (content, { contact }) => {
          content.type = CONTACT_TYPES.PERSON;
          content.parent_id = contact._id;
        },
      }
    ],
  },
  {
    name: 'edit_contact_task',
    title: 'Edit Person',
    appliesTo: 'contacts',
    appliesToType: [CONTACT_TYPES.PERSON],
    resolvedIf: () => false,
    events: [{
      id: 'edit_contact_event_id',
      days: 0,
      start: 0,
      end: 1,
    }],
    actions: [{
      type: 'contact',
      modifyContent: (content, { contact }) => {
        content.edit_id = contact._id;
      },
    }],
  }
];
