import { AfterViewChecked, AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment';
import { BsModalRef } from 'ngx-bootstrap/modal';

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

        const task = this.model.group.rows[index];
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
    const task = this.model.group.rows[index];
    if (!task) {
      return;
    }
    task.deleted = true;
  }

  addTask() {
    this.model.group.rows.push({
      due: moment().toISOString(),
      added: true,
      group: this.model.group.number,
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
