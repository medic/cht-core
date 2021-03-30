import { Injectable } from '@angular/core';
import * as moment from 'moment';

import { ContactTypesService } from '@mm-services/contact-types.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';

@Injectable({
  providedIn: 'root'
})
export class TasksForContactService {
  constructor(
    private contactTypesService:ContactTypesService,
    private rulesEngineService:RulesEngineService
  ) { }

  private getIdsForTasks(model) {
    const contactIds = [];
    if (!model?.type?.person && model?.children) {
      model.children.forEach(child => {
        if (child?.type?.person && child?.contacts?.length) {
          contactIds.push(...child.contacts.map(contact => contact.id));
        }
      });
    }
    contactIds.push(model.doc._id);
    return contactIds;
  }

  private areTasksEnabled(type) {
    if (!type) {
      return Promise.resolve(false);
    }

    return this.rulesEngineService
      .isEnabled()
      .then(isRulesEngineEnabled => {
        if (!isRulesEngineEnabled) {
          return false;
        }

        // must be either a person type
        if (type?.person) {
          return true;
        }

        // ... or a leaf place type
        return this.contactTypesService
          .getAll()
          .then(types => {
            const hasChild = types.some(t => !t.person && t.parents && t.parents.includes(type?.id));
            return !hasChild;
          });
      });
  }

  private decorateAndSortTasks(tasks) {
    tasks.forEach((task) => {
      const dueDate = moment(task.emission.dueDate, 'YYYY-MM-DD');
      task.emission.overdue = dueDate.isBefore(moment());
    });

    tasks.sort((a, b) => {
      return a.emission.dueDate < b.emission.dueDate ? -1 : 1;
    });

    return tasks;
  }

  get(model) {
    return this
      .areTasksEnabled(model.type)
      .then(enabled => {
        if (!enabled) {
          return [];
        }

        const contactIds = this.getIdsForTasks(model);
        return this.rulesEngineService
          .fetchTaskDocsFor(contactIds)
          .then(tasks => this.decorateAndSortTasks(tasks));
      });
  }
}
