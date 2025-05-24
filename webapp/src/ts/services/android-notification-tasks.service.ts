import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { RulesEngineService } from '@mm-services/rules-engine.service';

export type notificationTaskType = {
  _id: string,
  state: string,
  title: string,
  contact: string,
  dueDate: string,
};

@Injectable({
  providedIn: 'root'
})
export class AndroidNotificationTasksService {

  constructor(private readonly rulesEngineService: RulesEngineService) { };

  async fetchTasks(): Promise<notificationTaskType[]> {
    try {
        const isEnabled = await this.rulesEngineService.isEnabled();
        const taskDocs = isEnabled ? await this.rulesEngineService.fetchTaskDocsForAllContacts() : [];
        const tasks = taskDocs
          .filter(task => {
            const today = moment().format('YYYY-MM-DD');
            return task.state === 'Ready' && task.emission.dueDate === today;
          })
          .map(task => ({
            _id: task._id,
            state: task.state,
            title: task.emission.title,
            contact: task.emission.contact.name,
            dueDate: task.emission.dueDate,
          }));
        return tasks;

    } catch (exception) {
      console.error('AndroidTaskNotification: Error getting tasks for all contacts', exception);
      return [];
    }
  }


  get() {
    return this.fetchTasks();
  }
}