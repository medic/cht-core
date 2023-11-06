import { Injectable } from '@angular/core';
import { forEach as _forEach, filter as _filter } from 'lodash-es';

import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class EditGroupService {
  constructor(
    private dbService:DbService,
  ) {
  }

  private getTo(dataRecord, group) {
    let to;
    if (
      group.rows &&
      group.rows.length &&
      group.rows[0].messages &&
      group.rows[0].messages.length
    ) {
      to = group.rows[0].messages[0].to;
    }
    return to || dataRecord.from;
  }

  private add(dataRecord, group) {
    let changed = false;
    const to = this.getTo(dataRecord, group);
    _forEach(group.rows, (updatedTask) => {
      if (updatedTask.added) {
        changed = true;
        dataRecord.scheduled_tasks.push({
          messages: [{ to: to }],
          state: 'scheduled',
          group: group.number,
          type: group.type,
        });
      }
    });
    return changed;
  }

  private update(dataRecord, group) {
    let changed = false;
    const tasks = _filter(dataRecord.scheduled_tasks, { group: group.number });
    _forEach(group.rows, (updatedTask, i) => {
      if (updatedTask.state === 'scheduled') {
        changed = true;
        tasks[i].due = updatedTask.due;
        if (!updatedTask.translation_key) {
          _forEach(updatedTask.messages, (updatedMessage, j) => {
            tasks[i].messages[j].message = updatedMessage.message;
          });
        }
      }
    });
    return changed;
  }

  private remove(dataRecord, group) {
    let changed = false;
    let groupIndex = group.rows.length - 1;
    for (let i = dataRecord.scheduled_tasks.length - 1; i >= 0; i--) {
      if (dataRecord.scheduled_tasks[i].group === group.number) {
        if (group.rows[groupIndex]?.deleted) {
          changed = true;
          dataRecord.scheduled_tasks.splice(i, 1);
        }
        groupIndex--;
      }
    }
    return changed;
  }

  edit(recordId, group) {
    return this.dbService
      .get()
      .get(recordId)
      .then((dataRecord) => {
        const additions = this.add(dataRecord, group);
        const mutations = this.update(dataRecord, group);
        const deletions = this.remove(dataRecord, group);
        if (additions || mutations || deletions) {
          return this.dbService
            .get()
            .put(dataRecord)
            .then(() => dataRecord);
        }
        return dataRecord;
      });
  }
}

