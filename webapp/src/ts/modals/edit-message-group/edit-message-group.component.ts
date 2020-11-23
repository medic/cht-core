import { Component, OnInit } from '@angular/core';
import * as moment from 'moment';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { EditGroupService } from '@mm-services/edit-group.service';
import { SettingsService } from '@mm-services/settings.service';
import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';

@Component({
  selector: 'edit-message-group',
  templateUrl: './edit-message-group.component.html',
})
export class EditMessageGroupComponent extends MmModalAbstract implements OnInit {
  constructor(
    bsModalRef:BsModalRef,
    private editGroupService:EditGroupService,
    private settingsService:SettingsService,
  ) {
    super(bsModalRef);
  }

  model:any = { group: {} };

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
    this.settingsService
      .get()
      .then((settings:any) => {
        $('#edit-message-group input.datepicker').each((index, element) => {
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
              const i = $(element).closest('fieldset').data('index');
              this.model.group.rows[i].due = date.toISOString();
            }
          );
        });
      });
  }

  ngOnInit() {
    this.initDatePickers();
  }

  deleteTask(task) {
    task.deleted = true;
    this.initDatePickers();
  }

  addTask() {
    this.model.group.rows.push({
      due: moment().toISOString(),
      added: true,
      group: this.model.group.number,
      state: 'scheduled',
      messages: [{ message: '' }],
    });
    this.initDatePickers();
  }

  submit() {
    this.setProcessing();
    this.editGroupService
      .edit(this.model?.report?._id, this.model?.group)
      .then(() => {
        this.setFinished();
        this.close();
      })
      .catch((err) => {
        this.setError(err, 'Error updating group');
      });
  }
}
