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
const TODAY_TIMESTAMP = 'cht-today-timestamp';
const LATEST_NOTIFICATION_TIMESTAMP = 'cht-latest-notification-timestamp';

export interface Notification {
  _id: string,
  authoredOn: number,
  state: string,
  title: string,
  contentText: string,
  dueDate: string,
}

@Injectable({
  providedIn: 'root'
})
export class TasksNotificationService {

  constructor(
    private readonly rulesEngineService: RulesEngineService,
    private readonly translateService: TranslateService,
    private readonly dbSyncService: DBSyncService
  ) { }

  private async fetchNotifications(): Promise<Notification[]> {
    try {
      const today = moment().format('YYYY-MM-DD');
      let latestNotificationTimestamp = this.getLatestNotificationTimestamp();
      const isEnabled = await this.rulesEngineService.isEnabled();
      const taskDocs = isEnabled ? await this.rulesEngineService.fetchTaskDocsForAllContacts() : [];
      
      let notifications = taskDocs
        .filter(task => {
          return task.state === 'Ready' && task.emission.dueDate === today && 
            task.authoredOn > latestNotificationTimestamp;
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
      latestNotificationTimestamp = notifications[0]?.authoredOn ?? latestNotificationTimestamp;
      window.localStorage.setItem(LATEST_NOTIFICATION_TIMESTAMP, String(latestNotificationTimestamp));
      return notifications;

    } catch (exception) {
      console.error('fetchNotifications(): Error fetching tasks', exception);
      return [];
    }
  }

  private getLatestNotificationTimestamp(): number {
    if (this.isNewDay()) {
      return 0;
    }
    return Number(window.localStorage.getItem(LATEST_NOTIFICATION_TIMESTAMP));
  }

  private isNewDay(): boolean {
    const now = moment();
    const timestampToday = Number(window.localStorage.getItem(TODAY_TIMESTAMP));
    if (!now.isSame(timestampToday, 'day')) {
      window.localStorage.setItem(TODAY_TIMESTAMP, String(moment().startOf('day').valueOf()));
      return true;
    }
    return false;
  }

  private translateContentText(task: string, contact: string): string {
    const key = 'android.notification.tasks.contentText';
    return this.translateService.instant(key, { task, contact });
  }

  async get(): Promise<Notification[]> {
    return Promise.race([
      this.dbSyncService.sync(),
      new Promise(resolve => setTimeout(() => resolve([]), 5 * 1000))
    ]).then(() => {
      return this.fetchNotifications();
    }).catch((error) => {
      console.error('get(): notifications error syncing db', error);
      return this.fetchNotifications();
    });
  }
}
