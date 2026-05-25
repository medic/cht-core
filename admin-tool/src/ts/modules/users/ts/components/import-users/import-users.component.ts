import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { UsersService } from '@admin-tool-services/users.service';

type Screen = 'upload' | 'confirm' | 'processing' | 'summary';

export interface ImportSummary {
  total: number;
  successful: number;
  ignored: number;
  failed: number;
  outputFileUrl: string;
}

/**
 * Modal component for bulk importing users from a CSV file.
 * Mirrors the AngularJS MultipleUserCtrl flow:
 *   1. Upload — file picker
 *   2. Confirm — shows filename, asks to confirm
 *   3. Processing — spinner while API call runs
 *   4. Summary — shows counts and download link for status CSV
 */
@Component({
  selector: 'import-users',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './import-users.component.html',
  styleUrl: './import-users.component.less',
})
export class ImportUsersComponent {
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();

  screen: Screen = 'upload';
  filename = '';
  error: string | null = null;
  summary: ImportSummary | null = null;

  private uploadedFile: File | null = null;

  constructor(private usersService: UsersService) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.uploadedFile = file;
    this.filename = file.name;
    this.screen = 'confirm';
  }

  async processUpload() {
    if (!this.uploadedFile) {
      return;
    }
    this.screen = 'processing';
    this.error = null;

    try {
      const csv = await this.uploadedFile.text();
      const results: any[] = await this.usersService.createMultipleUsers(csv);

      const rows = Array.isArray(results) ? results : [];
      const successful = rows.filter((r) => !r.error).length;
      const failed = rows.filter((r) => !!r.error).length;
      const outputFileUrl = this.convertResultsToCSV(rows);

      this.summary = {
        total: rows.length,
        successful,
        ignored: 0,
        failed,
        outputFileUrl: outputFileUrl ?? '',
      };

      this.usersService.notifyUsersUpdated();
      this.screen = 'summary';
    } catch (err: any) {
      console.error('Error processing bulk user upload', err);
      this.error = err?.error?.message || err?.message || 'users.import.error';
      this.screen = 'upload';
    }
  }

  cancel() {
    this.reset();
    this.closed.emit();
  }

  backToUpload() {
    this.screen = 'upload';
    this.uploadedFile = null;
    this.filename = '';
  }

  finish() {
    this.reset();
    this.closed.emit();
  }

  private reset() {
    this.screen = 'upload';
    this.uploadedFile = null;
    this.filename = '';
    this.error = null;
    this.summary = null;
  }

  private convertResultsToCSV(results: any[]): string {
    const eol = '\r\n';
    const delimiter = ',';
    const columns = [
      'import.status:excluded',
      'import.message:excluded',
      'import.username:excluded',
    ];
    let output = columns.join(delimiter) + eol;

    results.forEach((record: any) => {
      const status = record.error ? 'error' : 'imported';
      const message = record.error
        ? typeof record.error === 'string'
          ? record.error
          : JSON.stringify(record.error)
        : 'imported on ' + new Date().toISOString();
      const username =
        record['user-settings']?.id?.replace('org.couchdb.user:', '') ?? '';
      output +=
        [
          this.escapeCSV(status),
          this.escapeCSV(message),
          this.escapeCSV(username),
        ].join(delimiter) + eol;
    });

    const file = new Blob([output], { type: 'text/csv;charset=utf-8;' });
    return URL.createObjectURL(file);
  }

  private escapeCSV(str: string): string {
    if (!str) {
      return str;
    }
    return '"' + str.replace(/"/g, '""') + '"';
  }
}
