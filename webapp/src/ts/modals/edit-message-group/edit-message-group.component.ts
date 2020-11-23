import { AfterViewChecked, AfterViewInit, Component, OnInit } from '@angular/core';
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
export class EditMessageGroupComponent extends MmModalAbstract implements AfterViewInit, OnInit, AfterViewChecked {
  constructor(
    bsModalRef:BsModalRef,
    private editGroupService:EditGroupService,
    private settingsService:SettingsService,
  ) {
    super(bsModalRef);
  }

  model:any = { group: { rows: [] } };

  private shouldInitDatepickers = false;
  private settingsPromise;
  private datepickers = {};

  ngOnInit() {
    this.getSettings();
    this.model?.group?.rows?.forEach(row => row.id = uuid());
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
    return task.id;
  }

  private initDatePickers() {
    this.settingsPromise.then((settings:any) => {
      $('#edit-message-group input.datepicker').each((index, element) => {
        const taskId = $(element).data('task-id');
        if (this.datepickers[taskId]) {
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
            const task = this.model.group.rows.find(task => task.id === taskId);
            task.due = date.toISOString();
          }
        );
        this.datepickers[taskId] = $(element).data('daterangepicker');
      });
    });
  }

  private removeDatePickers(taskId?) {
    if (taskId) {
      this.datepickers[taskId]?.remove();
      delete this.datepickers[taskId];
      return;
    }

    Object.keys(this.datepickers).forEach((key) => {
      const datepicker = this.datepickers[key];
      datepicker && datepicker.remove();
      delete this.datepickers[key];
    });
  }

  ngAfterViewInit() {
    this.initDatePickers();
  }

  deleteTask(task) {
    // remove datepicker BEFORE removing the html element
    this.removeDatePickers(task.id);
    task.deleted = true;
    this.shouldInitDatepickers = true;
  }

  addTask() {
    this.model.group.rows.push({
      due: moment().toISOString(),
      added: true,
      group: this.model.group.number,
      state: 'scheduled',
      messages: [{ message: '' }],
      id: uuid(),
    });
    this.shouldInitDatepickers = true;
  }

  ngAfterViewChecked() {
    if (this.shouldInitDatepickers) {
      this.initDatePickers();
      this.shouldInitDatepickers = false;
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

  beforeHide() {
    this.removeDatePickers();
  }
}
