import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TranslateService } from '@mm-services/translate.service';

export type notificationTaskType = {
  _id: string,
  state: string,
  title: string,
  contentText: string,
  dueDate: string,
};

@Injectable({
  providedIn: 'root'
})
export class AndroidNotificationTasksService {

  constructor(
    private readonly rulesEngineService: RulesEngineService,
    private translateService:TranslateService,
  ) { };

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
            contentText: this.translateContentText(task.emission.title, task.emission.contact.name),
            dueDate: task.emission.dueDate,
          }));
        return tasks;

    } catch (exception) {
      console.error('AndroidNotificationTasks: Error fetching tasks', exception);
      return [];
    }
  }

  private translateContentText (task: string, contact: string): string {
    const key = 'android.notification.tasks.contentText';
    return this.translateService.instant(key, { task, contact });
  }

  get() {
    return this.fetchTasks();
  }
}