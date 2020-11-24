import { AfterViewChecked, AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { v4 as uuid } from 'uuid';

import { EditGroupService } from '@mm-services/edit-group.service';
import { SettingsService } from '@mm-services/settings.service';
import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';

@Component({
  selector: 'edit-message-group',
  templateUrl: './edit-message-group.component.html',
})
export class EditMessageGroupComponent extends MmModalAbstract
  implements AfterViewInit, OnInit, AfterViewChecked, OnDestroy {

  constructor(
    bsModalRef:BsModalRef,
    private editGroupService:EditGroupService,
    private settingsService:SettingsService,
  ) {
    super(bsModalRef);
  }

  model:any = { group: { rows: [] } };

  private shouldInitDatePickers = false;
  private settingsPromise;
  private datePickers = {};

  ngOnInit() {
    this.getSettings();
    // task_id variable is only used within this component, to uniquely identify each task in the group
    this.model?.group?.rows?.forEach(row => row.task_id = uuid());
  }

  private getSettings() {
    this.settingsPromise = this.settingsService.get();
  }

  private getNextHalfHour() {
    const time = moment()
      .second(0)
      .millisecond(0);
    if (time.minute() < 30) {
      time.minute(30);
    } else {
      time.minute(0);
      time.add(1, 'hours');
    }
    return time;
  }

  trackBy(index, task) {
    return task.task_id;
  }

  private initDatePickers() {
    this.settingsPromise.then((settings:any) => {
      $('#edit-message-group input.datepicker').each((index, element) => {
        const taskId = $(element).data('task-id');
        if (this.datePickers[taskId]) {
          // already has datepicker!
          return;
        }

        $(element).daterangepicker(
          {
            startDate: new Date(this.model.group.rows[index].due),
            singleDatePicker: true,
            timePicker: true,
            applyClass: 'btn-primary',
            cancelClass: 'btn-link',
            parentEl: '#edit-message-group',
            minDate: this.getNextHalfHour(),
            locale: {
              format: settings.reported_date_format,
            },
          },
          (date) => {
            const taskId = $(element).data('task-id');
            const task = this.model.group.rows.find(task => task.task_id === taskId);
            task.due = date.toISOString();
          }
        );
        this.datePickers[taskId] = $(element).data('daterangepicker');
      });
    });
  }

  private removeDatePickers(taskId?) {
    if (taskId) {
      this.datePickers[taskId]?.remove();
      delete this.datePickers[taskId];
      return;
    }

    Object.keys(this.datePickers).forEach((key) => {
      const datepicker = this.datePickers[key];
      datepicker && datepicker.remove();
      delete this.datePickers[key];
    });
  }

  ngAfterViewInit() {
    this.initDatePickers();
  }

  deleteTask(task) {
    if (!task) {
      return;
    }
    // remove datepicker BEFORE removing the html element
    this.removeDatePickers(task.id);
    task.deleted = true;
    this.shouldInitDatePickers = true;
  }

  addTask() {
    this.model.group.rows.push({
      due: moment().toISOString(),
      added: true,
      group: this.model.group.number,
      state: 'scheduled',
      messages: [{ message: '' }],
      task_id: uuid(),
    });
    this.shouldInitDatePickers = true;
  }

  ngAfterViewChecked() {
    if (this.shouldInitDatePickers) {
      this.initDatePickers();
      this.shouldInitDatePickers = false;
    }
  }

  submit() {
    this.setProcessing();
    return this.editGroupService
      .edit(this.model?.report?._id, this.model?.group)
      .then(() => {
        this.setFinished();
        this.close();
      })
      .catch((err) => {
        this.setError(err, 'Error updating group');
      });
  }

  ngOnDestroy() {
    this.removeDatePickers();
  }
}
