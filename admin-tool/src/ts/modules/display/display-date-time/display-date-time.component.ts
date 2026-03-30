import { SettingsService } from '@admin-tool-services/settings.service';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import moment from 'moment';
import { ResponseStatus } from '../display-interfaces';

/**
 * Component for configuring the date and datetime display formats
 * shown across the admin tool interface.
 *
 * Loads the current formats from the API on init, validates them against
 * Moment.js, and allows the user to select from a list of standard formats
 * or keep a custom one if it was previously saved and is still valid.
 */
@Component({
  selector: 'display-date-time',
  imports: [FormsModule],
  templateUrl: './display-date-time.component.html',
  styleUrl: './display-date-time.component.less',
})
export class DisplayDateTimeComponent implements OnInit {
  /** Standard date formats available in the dropdown */
  standardDateFormats: string[] = ['DD-MMM-YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY'];

  /** Standard datetime formats available in the dropdown */
  standardDatetimeFormats: string[] = ['DD-MMM-YYYY HH:mm:ss', 'DD/MM/YYYY HH:mm:ss', 'MM/DD/YYYY HH:mm:ss'];

  /** Currently selected date format */
  dateFormatSelection!: string;

  /** Currently selected datetime format */
  dateTimeFormatSelection!: string;

  /** Live example of the selected date format applied to the current date */
  dateFormatExample!: string;

  /** Live example of the selected datetime format applied to the current date */
  dateTimeFormatExample!: string;

  /**
   * Tracks the state of the save operation.
   * Controls visibility of the loader, success, and error messages in the template.
   */
  responseStatus: ResponseStatus = {};

  constructor(private settingsService: SettingsService) {}

  /**
   * Loads the saved date and datetime formats from the API and resolves
   * them against the standard format lists. If a saved format is valid
   * but not in the standard list, it gets added dynamically so the
   * dropdown reflects the current configuration.
   */
  async ngOnInit(): Promise<void> {
    try {
      const settings = await this.settingsService.getDateTimeSettings();
      this.dateFormatSelection = this.resolveDateFormat(settings.dateFormat, this.standardDateFormats);
      this.dateTimeFormatSelection = this.resolveDateFormat(settings.dateTimeFormat, this.standardDatetimeFormats);
      this.dateFormatExample = moment().format(this.dateFormatSelection);
      this.dateTimeFormatExample = moment().format(this.dateTimeFormatSelection);
    } catch (error) {
      console.error('Error getting settings', error);
    }
  }

  /**
   * Checks whether a string is a valid Moment.js date format.
   * Rejects empty strings, and formats that produce an invalid date when parsed back strictly.
   *
   * @param {string} format - the format string to validate (e.g. 'DD/MM/YYYY')
   * @returns {boolean} true if the format produces a valid and re-parseable date
   */
  private isValidMomentDateFormat(format: string): boolean {
    if (!format || !format.trim()) {
      return false;
    }

    const formatted = moment().format(format);

    if (formatted === format) {
      return false;
    }
    return formatted !== 'Invalid date' && moment(formatted, format, true).isValid();
  }

  /**
   * Resolves which format to use as the initial selection.
   * If the saved format is valid, it is used and added to the list if missing.
   * Falls back to the first entry in the standard list if the format is invalid.
   *
   * @param {string} format - the format retrieved from saved settings
   * @param {string[]} standardFormats - the dropdown list to resolve against
   * @returns {string} the format to use as the initial selection
   */
  private resolveDateFormat(format: string, standardFormats: string[]): string {
    if (format && this.isValidMomentDateFormat(format)) {
      if (!standardFormats.includes(format)) {
        standardFormats.push(format);
      }
      return format;
    }
    return standardFormats[0];
  }

  /**
   * Updates the selected date format and refreshes the live example.
   * @param {string} date - the date format selected by the user
   */
  onDateFormatSelected(date: string) {
    this.dateFormatSelection = date;
    this.dateFormatExample = moment().format(this.dateFormatSelection);
  }

  /**
   * Updates the selected datetime format and refreshes the live example.
   * @param {string} date - the datetime format selected by the user
   */
  onDateTimeFormatSelected(date: string) {
    this.dateTimeFormatSelection = date;
    this.dateTimeFormatExample = moment().format(this.dateTimeFormatSelection);
  }

  /**
   * Saves the selected date and datetime formats via the SettingsService.
   * Shows a loader during the operation and displays success or error feedback.
   * The success message clears automatically after 3 seconds.
   */
  async setSettingsDate(): Promise<void> {
    this.responseStatus = { state: 'loading' };

    try {
      await this.settingsService.updateDateTimeSettings({
        dateFormat: this.dateFormatSelection,
        dateTimeFormat: this.dateTimeFormatSelection,
      });

      this.responseStatus = { state: 'success', msg: 'Saved' };
      setTimeout(() => {
        if (this.responseStatus.state === 'success') {
          this.responseStatus = {};
        }
      }, 3000);
    } catch (error) {
      console.error('Error updating settings', error);
      this.responseStatus = { state: 'error', msg: 'Error updating settings' };
    }
  }
}
