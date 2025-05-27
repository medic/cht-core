import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { orderBy } from 'lodash-es';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TranslateService } from '@mm-services/translate.service';
import { DBSyncService } from '@mm-services/db-sync.service';

/* 
** avoid overloading app with too many notifications especially at once
** 24 for android >= 10
*/
const MAX_NOTIFICATIONS = 24;
export interface Notification {
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
export class TasksNotificationService {
  private readonly LAST_NOTIFICATION_TASK_TIMESTAMP = 'medic-last-task-notification-timestamp';

  constructor(
    private readonly rulesEngineService: RulesEngineService,
    private translateService: TranslateService,
    private readonly dbSyncService: DBSyncService
  ) { };

  private async fetchNotifications(): Promise<Notification[]> {
    try {
      let lastNotificationTimestamp = this.getLastNotificationTimestamp();
      const isEnabled = await this.rulesEngineService.isEnabled();
      const taskDocs = isEnabled ? await this.rulesEngineService.fetchTaskDocsForAllContacts() : [];
      let notifications = taskDocs
        .filter(task => {
          const today = moment().format('YYYY-MM-DD');
          return task.authoredOn > lastNotificationTimestamp && task.state === 'Ready' && task.emission.dueDate === today;
        })
        .map(task => ({
          _id: task._id,
          authoredOn: task.authoredOn,
          state: task.state,
          title: task.emission.title,
          contentText: this.translateContentText(task.emission.title, task.emission.contact.name),
          dueDate: task.emission.dueDate,
        }));

      notifications = orderBy(notifications, ['authoredOn'], ['desc']);
      notifications = notifications.slice(0, MAX_NOTIFICATIONS);
      lastNotificationTimestamp = notifications[0]?.authoredOn || this.getLastNotificationTimestamp();
      window.localStorage.setItem(this.LAST_NOTIFICATION_TASK_TIMESTAMP, String(lastNotificationTimestamp));
      return notifications;

    } catch (exception) {
      console.error('fetchNotifications(): Error fetching tasks', exception);
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
      return 0;
    }
    return Number(window.localStorage.getItem(this.LAST_NOTIFICATION_TASK_TIMESTAMP)) || 0;
  }

  private isSameDay(timestamp: number): boolean {
    const now = moment();
    const momentDate = moment(timestamp);
    return momentDate.isSame(now, 'day');
  }

  get(): Promise<Notification[]> {
    return this.dbSyncService.sync().then(async () => {
      return await this.fetchNotifications();
    });
  }
}