import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { orderBy } from 'lodash-es';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TranslateService } from '@mm-services/translate.service';
import { DBSyncService } from './db-sync.service';

export type notificationTaskType = {
  _id: string,
  authoredOn: number,
  state: string,
  title: string,
  contentText: string,
  dueDate: string,
};

@Injectable({
  providedIn: 'root'
})
export class AndroidNotificationTasksService {
  private readonly LAST_NOTIFICATION_TASK_TIMESTAMP = 'medic-last-task-notification-timestamp';

  constructor(
    private readonly rulesEngineService: RulesEngineService,
    private translateService: TranslateService,
    private readonly dbSyncService: DBSyncService
  ) { };

  private async fetchTasks(): Promise<notificationTaskType[]> {
    try {
      let lastTaskTimestamp = this.getLastNotificationTimestamp();
      const isEnabled = await this.rulesEngineService.isEnabled();
      const taskDocs = isEnabled ? await this.rulesEngineService.fetchTaskDocsForAllContacts() : [];
      const tasks = taskDocs
        .filter(task => {
          const today = moment().format('YYYY-MM-DD');
          return task.authoredOn > lastTaskTimestamp && task.state === 'Ready' && task.emission.dueDate === today;
        })
        .map(task => ({
          _id: task._id,
          authoredOn: task.authoredOn,
          state: task.state,
          title: task.emission.title,
          contentText: this.translateContentText(task.emission.title, task.emission.contact.name),
          dueDate: task.emission.dueDate,
        }));

      const sortedTasks = orderBy(tasks, ['authoredOn'], ['desc']);
      lastTaskTimestamp = sortedTasks[0]?.authoredOn || this.getLastNotificationTimestamp();
      window.localStorage.setItem(this.LAST_NOTIFICATION_TASK_TIMESTAMP, String(lastTaskTimestamp));
      return sortedTasks;

    } catch (exception) {
      console.error('AndroidNotificationTasks: Error fetching tasks', exception);
      return [];
    }
  }

  private translateContentText(task: string, contact: string): string {
    const key = 'android.notification.tasks.contentText';
    return this.translateService.instant(key, { task, contact });
  }

  private getLastNotificationTimestamp(): number {
    const lastNotifcationTimestamp = Number(window.localStorage.getItem(this.LAST_NOTIFICATION_TASK_TIMESTAMP));
  
    if (!this.isSameDay(lastNotifcationTimestamp)) {
      console.log('New day detected, resetting last notification timestamp');
      return 0;
    }
    return Number(window.localStorage.getItem(this.LAST_NOTIFICATION_TASK_TIMESTAMP)) || 0;
  }

  private isSameDay(timestamp: number): boolean {
    const now = moment();
    const momentDate = moment(timestamp);
    return momentDate.isSame(now, 'day');
  }

  get() {
    return this.dbSyncService.sync().then(async () => {
      return await this.fetchTasks();
    });
  }
}