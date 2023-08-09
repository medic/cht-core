import { AfterViewChecked, AfterViewInit, Component, OnDestroy, OnInit, Inject } from '@angular/core';
import * as moment from 'moment';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { EditGroupService } from '@mm-services/edit-group.service';
import { SettingsService } from '@mm-services/settings.service';

@Component({
  selector: 'edit-message-group',
  templateUrl: './edit-message-group.component.html',
})
export class EditMessageGroupComponent implements AfterViewInit, OnInit, AfterViewChecked, OnDestroy {

  constructor(
    private editGroupService:EditGroupService,
    private settingsService:SettingsService,
    private matDialogRef: MatDialogRef<EditMessageGroupComponent>,
    @Inject(MAT_DIALOG_DATA) public matDialogData: Record<string, any>,
  ) {
    this.group = this.matDialogData?.group;
    this.report = this.matDialogData?.report;
  }

  group;
  report;
  error;
  processing = false;

  private shouldInitDatePickers = false;
  private settingsPromise;
  private datePickers: any[] = [];

  ngOnInit() {
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

  private initDatePickers() {
    this.settingsPromise.then((settings:any) => {
      $('#edit-message-group input.datepicker').each((idx, element) => {
        const $element = $(element);
        const index = $element.data('index');
        if (this.datePickers[index]) {
          // already has datepicker!
          return;
        }

        const task = this.group.rows[index];
        $element.daterangepicker(
          {
            startDate: new Date(task.due),
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
            task.due = date.toISOString();
          }
        );
        this.datePickers[index] = $element.data('daterangepicker');
      });
    });
  }

  private removeDatePickers(index?) {
    if (index !== undefined) {
      this.datePickers[index]?.remove();
      this.datePickers[index] = null;
      return;
    }

    this.datePickers.forEach((datepicker, index) => {
      datepicker?.remove();
      // ngx-bootstrap modals have an issue where they don't release objects properly
      // https://github.com/valor-software/ngx-bootstrap/issues/5971
      // so explicitly delete these to free up memory
      this.datePickers[index] = null;
    });
  }

  ngAfterViewInit() {
    this.initDatePickers();
  }

  deleteTask(index) {
    // remove datepicker BEFORE removing the html element
    this.removeDatePickers(index);
    const task = this.group.rows[index];
    if (!task) {
      return;
    }
    task.deleted = true;
  }

  addTask() {
    this.group.rows.push({
      due: moment().toISOString(),
      added: true,
      group: this.group.number,
      state: 'scheduled',
      messages: [{ message: '' }],
    });
    this.shouldInitDatePickers = true;
  }

  ngAfterViewChecked() {
    if (this.shouldInitDatePickers) {
      this.initDatePickers();
      this.shouldInitDatePickers = false;
    }
  }

  close() {
    this.matDialogRef.close();
  }

  submit() {
    this.processing = true;
    return this.editGroupService
      .edit(this.report?._id, this.group)
      .then(() => this.close())
      .catch(error => {
        this.error = 'Error updating group';
        console.error(this.error, error);
      })
      .finally(() => this.processing = false);
  }

  ngOnDestroy() {
    this.removeDatePickers();
  }
}
