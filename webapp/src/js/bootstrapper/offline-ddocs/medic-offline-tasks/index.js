const tasksByContact = require('./tasks_by_contact');

const packageView = ({ map }) => ({ map: map.toString() });

module.exports = {
  _id: '_design/medic-offline-tasks',
  views: {
    tasks_by_contact: packageView(tasksByContact),
  }
};
