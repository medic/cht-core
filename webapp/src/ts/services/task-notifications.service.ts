import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { orderBy, get, find } from 'lodash-es';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { TranslateService } from '@mm-services/translate.service';
import { FormatDateService } from '@mm-services/format-date.service';

/* 
** avoid overloading app with too many notifications especially at once
** 24 for android >= 10
*/
const MAX_NOTIFICATIONS = 24;
const TASK_NOTIFICATION_STATE_TIMESTAMP = 'cht-task-notification-state-timestamp';
const LATEST_NOTIFICATION_TIMESTAMP = 'cht-latest-notification-timestamp';

export interface Notification {
  _id: string,
  readyAt: number,
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
    private readonly formatDateService: FormatDateService
  ) { }

  private async fetchNotifications(): Promise<Notification[]> {
    try {
      const isEnabled = await this.rulesEngineService.isEnabled();
      if (!isEnabled) {
        return [];
      }
      const today = moment().format('YYYY-MM-DD');
      let latestNotificationTimestamp = this.getLatestNotificationTimestamp();
      const taskDocs = await this.rulesEngineService.fetchTaskDocsForAllContacts();
      let notifications = taskDocs
        .map(task => ({
          _id: task._id,
          readyAt: get(find(task.stateHistory, { state: 'Ready' }), 'timestamp') || 0,
          title: task.emission.title,
          contentText: this.translateContentText(
            task.emission.title,
            task.emission.contact.name,
            task.emission.dueDate
          ),
          dueDate: task.emission.dueDate,
        }))
        .filter(notification => notification.dueDate <= today &&
          notification.readyAt > latestNotificationTimestamp);

      notifications = orderBy(notifications, ['readyAt'], ['desc']);
      notifications = notifications.slice(0, MAX_NOTIFICATIONS);
      latestNotificationTimestamp = notifications[0]?.readyAt ?? latestNotificationTimestamp;
      window.localStorage.setItem(LATEST_NOTIFICATION_TIMESTAMP, String(latestNotificationTimestamp));
      return notifications;

    } catch (exception) {
      console.error('fetchNotifications(): Error fetching tasks', exception);
      return [];
    }
  }

  private getLatestNotificationTimestamp(): number {
    if (this.isNewDay()) {
      window.localStorage.setItem(TASK_NOTIFICATION_STATE_TIMESTAMP, String(moment().startOf('day').valueOf()));
      return 0;
    }
    return Number(window.localStorage.getItem(LATEST_NOTIFICATION_TIMESTAMP));
  }

  private isNewDay(): boolean {
    const timestampToday = Number(window.localStorage.getItem(TASK_NOTIFICATION_STATE_TIMESTAMP));
    return !moment().isSame(timestampToday, 'day');
  }

  private translateContentText(taskName: string, contact: string, dueDate: string): string {
    const key = 'android.notification.tasks.contentText';
    const due = this.formatDateService.relative(dueDate, { task: true });
    return this.translateService.instant(key, { taskName, contact, due });
  }

  async get(): Promise<Notification[]> {
    return await this.fetchNotifications();
  }
}
