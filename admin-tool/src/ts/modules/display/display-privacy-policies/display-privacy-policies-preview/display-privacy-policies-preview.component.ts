import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PrivacyPolicyAttachment } from '../../display-interfaces';

/**
 * Modal component for previewing the HTML content of a privacy policy document.
 * Supports two sources: a saved attachment loaded from CouchDB as base64,
 * or a staged File selected by the user but not yet saved.
 * Decodes base64 attachments using the Unicode percent-encoding trick to handle multibyte characters.
 * Reads staged files using the FileReader API with UTF-8 encoding.
 * Shows an error message if the content type is not text/html.
 * Controlled by the parent via the visible input.
 * Emits closed when the modal is dismissed.
 */
@Component({
  selector: 'display-privacy-policies-preview',
  imports: [TranslatePipe],
  templateUrl: './display-privacy-policies-preview.component.html',
  styleUrl: './display-privacy-policies-preview.component.less'
})
export class DisplayPrivacyPoliciesPreviewComponent implements OnChanges{

  /** Controls visibility of the modal */
  @Input() visible = false;

  /** Display name of the language whose policy is being previewed */
  @Input() languageName: string = '';

  /** Saved attachment from CouchDB to preview, null if previewing a staged file */
  @Input() attachment: PrivacyPolicyAttachment | null = null;

  /** Staged file selected by the user to preview, null if previewing a saved attachment */
  @Input() stagedFile: File | null = null;

  /** Emitted when the modal is dismissed */
  @Output() closed = new EventEmitter<void>();

  /** Reference to the modal body element for resetting scroll position on modal open */
  @ViewChild('modalBody') modalBody!: ElementRef<HTMLDivElement>;

  /** Sanitized HTML content to render inside the modal body */
  content: string | null = null;

  /** Translation key for the error message shown when content_type is not text/html or FileReader fails */
  errorKey: string | null = null;

  constructor(private sanitizer: DomSanitizer){}

  /**
   * Initializes the modal content when it becomes visible.
   * Resets content and errorKey on every open.
   * For saved attachments, decodes the base64 data using the Unicode trick and sanitizes the HTML.
   * For staged files, reads the file as UTF-8 text using FileReader.
   * Sets errorKey and returns early if the content_type is not text/html for either source.
   * Resets the modal body scroll position to the top on every open using requestAnimationFrame.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.content = null;
      this.errorKey = null;

      if (this.attachment) {
        if (this.attachment.content_type !== 'text/html') {
          this.errorKey = 'display.privacy.policies.preview.wrong.type';
          return;
        }
        this.content = this.sanitizer.sanitize(
          SecurityContext.HTML, 
          this.decodeBase64Html(this.attachment.data as string)
        );
      } else if (this.stagedFile) {
        if (this.stagedFile.type !== 'text/html') {
          this.errorKey = 'display.privacy.policies.preview.wrong.type';
          return;
        }
        this.readFileAsHtml(this.stagedFile);
      }
      (window.requestAnimationFrame || (window as any).webkitRequestAnimationFrame)(() => {
        if (this.modalBody) {
          this.modalBody.nativeElement.scrollTop = 0;
        }
      });
    }
  }

  /**
   * Decodes a base64-encoded HTML string that may contain Unicode characters.
   * Uses the percent-encoding trick to handle multibyte UTF-8 characters that atob() cannot decode directly.
   * Converts each byte from the decoded byte stream to a percent-encoded hex sequence,
   * then uses decodeURIComponent to reconstruct the original Unicode string.
   *
   * @param {string} data - the base64-encoded HTML string from a CouchDB attachment
   * @returns {string} the decoded HTML string with Unicode characters preserved
   */
  private decodeBase64Html(data: string): string {
    const unicodeCharArray = atob(data)
      .split('')
      .map(char => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
      .join('');
    return decodeURIComponent(unicodeCharArray);
  }

  /**
   * Reads a File object as UTF-8 text using the FileReader API.
   * Sets content to the sanitized HTML on successful read.
   * Sets errorKey on read failure.
   *
   * @param {File} file - the staged HTML file to read
   */
  private readFileAsHtml(file: File): void {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      this.content = this.sanitizer.sanitize(SecurityContext.HTML, reader.result as string);
    });
    reader.addEventListener('error', () => {
      console.error('Error reading file', reader.error);
      this.errorKey = 'display.privacy.policies.preview.wrong.type';
    });
    reader.readAsText(file, 'utf-8');
  }

  /**
   * Dismisses the modal without saving by emitting the closed event.
   */
  cancel(): void {
    this.closed.emit();
  }

}
