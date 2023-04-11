import { Injectable } from '@angular/core';
import { some as _some, forEach as _forEach } from 'lodash-es';
import * as taskUtils from '@medic/task-utils';

import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class MessageStateService {
  constructor(
    private dbService:DbService,
  ) {
  }

  any (group, state) {
    return _some(group.rows, (msg) => msg.state === state);
  }

  set(recordId, group, fromState, toState) {
    return this.dbService
      .get()
      .get(recordId)
      .then((doc) => {
        let changed = false;
        _forEach(doc.scheduled_tasks, (task) => {
          if (task.group === group && task.state === fromState) {
            changed = true;
            SetTaskStateService.set(task, toState);
          }
        });
        if (!changed) {
          return;
        }
        return this.dbService.get().put(doc);
      });
  }
}

@Injectable()
export class SetTaskStateService {
  static set(task, state, details?) {
    return taskUtils.setTaskState(task, state, details);
  }
}
