import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges,
  ViewChild, ElementRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { CreateUserService } from '@admin-tool-services/create-user.service';
import { Select2SearchService } from '@admin-tool-services/select2search.service';
import { SettingsService } from '@admin-tool-services/settings.service';
import { UsersService } from '@admin-tool-services/users.service';
import { CreateUserErrors } from '@admin-tool-modules/users/users-interfaces';

const passwordTester = require('simple-password-tester');
const phoneNumber = require('@medic/phone-number');
const PASSWORD_MINIMUM_LENGTH = 8;
const PASSWORD_MINIMUM_SCORE = 50;

const getInitialModel = () => ({
  username: '',
  fullname: '',
  email: '',
  phone: '',
  roles: [] as string[],
  place: null as string | null,
  contact: null as string | null,
  token_login: false,
  oidc_username: '',
  password: '',
  passwordConfirm: '',
  showPassword: false,
});

/**
 * Modal component for creating a new user.
 * Controlled by the parent via the `visible` input.
 * Emits `closed` when the modal is dismissed and `userCreated` when a user is created successfully.
 */
@Component({
  selector: 'create-user',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './create-user.component.html',
  styleUrl: './create-user.component.less'
})
export class CreateUserComponent implements OnInit, OnChanges {

  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();
  @Output() userCreated = new EventEmitter<void>();

  @ViewChild('facilitySelect') facilitySelectRef!: ElementRef<HTMLSelectElement>;
  @ViewChild('contactSelect') contactSelectRef!: ElementRef<HTMLSelectElement>;

  loading = false;
  errors: CreateUserErrors = {};
  availableRoles: { key: string; label: string }[] = [];
  isOfflineRole = false;

  // Settings-driven feature flags
  allowTokenLogin = false;
  allowSSOLogin = false;

  model = getInitialModel();

  private settingsRoles: Record<string, { name: string; offline?: boolean }> = {};
  private cachedSettings: any = null;

  constructor(
    private createUserService: CreateUserService,
    private http: HttpClient,
    private select2SearchService: Select2SearchService,
    private settingsService: SettingsService,
    private usersService: UsersService,
  ) {}

  ngOnInit() {
    this.loadSettings();
  }

  /**
   * Initialises the Select2 dropdowns when the modal becomes visible.
   * Uses ngOnChanges so Select2 is only wired up after the DOM is rendered.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      // Defer to next tick so the modal DOM is fully rendered before Select2 init
      setTimeout(() => this.initSelect2(), 0);
    }
  }

  /**
   * Loads roles and feature flags from CHT settings.
   * The `_admin` role is excluded — it is managed at the DB level.
   * Token Login and SSO availability are determined from settings.
   */
  private async loadSettings() {
    try {
      this.cachedSettings = await this.settingsService.get();
      this.settingsRoles = this.cachedSettings.roles ?? {};
      this.availableRoles = Object.entries(this.settingsRoles)
        .filter(([key]) => key !== '_admin')
        .map(([key, role]: [string, any]) => ({ key, label: role.name }));
      this.allowTokenLogin = !!this.cachedSettings.token_login?.enabled;
      this.allowSSOLogin = !!this.cachedSettings.oidc_provider;
    } catch (err) {
      console.error('Error loading settings', err);
    }
  }

  /**
   * Initialises the facility and contact Select2 dropdowns.
   * Called when the modal becomes visible.
   */
  private async initSelect2() {
    if (this.facilitySelectRef?.nativeElement) {
      await this.select2SearchService.initPlaceSelect(this.facilitySelectRef.nativeElement);
    }
    if (this.contactSelectRef?.nativeElement) {
      await this.select2SearchService.initPersonSelect(this.contactSelectRef.nativeElement);
    }
  }

  /**
   * Reads the current facility and contact values from the Select2 DOM elements
   * and writes them into the model. Called before validation and submit.
   * Mirrors the old controller's computeFields() pattern.
   */
  private computeFields() {
    if (this.facilitySelectRef?.nativeElement) {
      const val = $(this.facilitySelectRef.nativeElement).val();
      // Only use the value if it's a string or array of strings, not a jQuery object
      if (typeof val === 'string' || Array.isArray(val)) {
        this.model.place = Array.isArray(val) && val.length === 0 ? null : val as string;
      }
    }
    if (this.contactSelectRef?.nativeElement) {
      const val = $(this.contactSelectRef.nativeElement).val();
      if (typeof val === 'string') {
        this.model.contact = val || null;
      }
    }
  }

  /**
   * Determines if any of the currently selected roles is an offline role.
   * Offline roles require a facility and associated contact.
   */
  private isOfflineUser(): boolean {
    return this.model.roles.some(role => this.settingsRoles[role]?.offline === true);
  }

  /**
   * Returns true if password fields should be hidden.
   * Password is not required when Token Login or SSO login is active.
   */
  get passwordHidden(): boolean {
    return (this.allowTokenLogin && this.model.token_login) ||
           (this.allowSSOLogin && !!this.model.oidc_username);
  }

  /**
   * Closes the modal and resets the form.
   */
  cancel() {
    this.reset();
    this.closed.emit();
  }

  /**
   * Toggles password field visibility between plain text and masked.
   */
  togglePassword() {
    this.model.showPassword = !this.model.showPassword;
  }

  /**
   * Toggles a role selection on or off and updates the offline role flag.
   * @param key the role key to toggle
   */
  toggleRole(key: string) {
    const index = this.model.roles.indexOf(key);
    if (index === -1) {
      this.model.roles.push(key);
    } else {
      this.model.roles.splice(index, 1);
    }
    this.isOfflineRole = this.isOfflineUser();
  }

  /**
   * Validates the username field.
   */
  private validateUsername() {
    if (!this.model.username) {
      this.errors.username = 'field.required';
    } else if (!/^[a-z0-9_-]+$/.test(this.model.username)) {
      this.errors.username = 'username.invalid';
    }
  }

  /**
   * Validates the email field (optional, format check only).
   */
  private validateEmail() {
    if (this.model.email && !/^[^\s@]+@[^\s@]+$/.test(this.model.email)) {
      this.errors.email = 'email.invalid';
    }
  }

  /**
   * Validates the roles field.
   */
  private validateRoles() {
    if (!this.model.roles.length) {
      this.errors.roles = 'field.required';
    }
  }

  /**
   * Validates the phone field.
   * Phone is required and must be valid when Token Login is enabled.
   */
  private validatePhone() {
    if (!this.model.token_login) {
      return;
    }

    if (!this.model.phone) {
      this.errors.phone = 'field.required';
    } else if (!phoneNumber.validate(this.cachedSettings, this.model.phone)) {
      this.errors.phone = 'configuration.enable.token.login.phone';
    }
  }

  /**
   * Validates the facility and contact fields.
   * Both are required for offline roles; facility is also required for online
   * users who have selected a contact.
   */
  private validateFacilityAndContact() {
    if (this.isOfflineUser()) {
      if (!this.model.place) {
        this.errors.place = 'field.required';
      }
      if (!this.model.contact) {
        this.errors.contact = 'field.required';
      }
    } else if (this.model.contact && !this.model.place) {
      this.errors.place = 'field.required';
    }
  }

  /**
   * Validates the password fields.
   * Skipped entirely when Token Login or SSO is active.
   */
  private validatePassword() {
    if (this.passwordHidden) {
      return;
    }

    if (!this.model.password) {
      this.errors.password = 'field.required';
    } else if (this.model.password.length < PASSWORD_MINIMUM_LENGTH) {
      this.errors.password = 'password.length.minimum';
    } else if (passwordTester(this.model.password) < PASSWORD_MINIMUM_SCORE) {
      this.errors.password = 'password.weak';
    }

    if (!this.model.passwordConfirm) {
      this.errors.passwordConfirm = 'field.required';
    } else if (this.model.password !== this.model.passwordConfirm) {
      this.errors.passwordConfirm = 'Passwords must match';
    }
  }

  /**
   * Validates all form fields and populates the errors object.
   * @returns true if the form is valid, false otherwise
   */
  private validate(): boolean {
    this.errors = {};
    this.validateUsername();
    this.validateEmail();
    this.validateRoles();
    this.validatePhone();
    this.validateFacilityAndContact();
    this.validatePassword();
    return Object.keys(this.errors).length === 0;
  }

  /**
   * Validates that the selected contact is a descendant of the selected facility.
   * Only runs for offline users who have both fields populated.
   * @returns true if valid or not applicable
   */
  private async validateContactInPlace(): Promise<boolean> {
    if (!this.isOfflineUser() || !this.model.contact || !this.model.place) {
      return true;
    }

    const placeIds = Array.isArray(this.model.place) ? this.model.place : [this.model.place];
    const valid = await this.select2SearchService.isContactInPlace(this.model.contact, placeIds);

    if (!valid) {
      this.errors.contact = 'configuration.user.place.contact';
    }

    return valid;
  }

  /**
   * Checks the replication limit for offline users.
   * Calls GET /api/v1/users-info and sets a warning if the limit would be exceeded.
   * This is a warning only — it does not block form submission on retry.
   * @returns true if within limit or not applicable, false if limit exceeded
   */
  private async validateReplicationLimit(): Promise<boolean> {
    if (!this.isOfflineUser()) {
      return true;
    }

    try {
      const params: any = {
        role: this.model.roles,
        facility_id: this.model.place,
        contact_id: this.model.contact,
      };
      const resp: any = await firstValueFrom(
        this.http.get('/api/v1/users-info', { params })
      );
      if (resp?.warn) {
        this.errors.replicationLimit = 'configuration.user.replication.limit.exceeded';
        return false;
      }
    } catch (err) {
      console.error('Error checking replication limit', err);
    }

    return true;
  }

  /**
   * Resets the form model, errors, and Select2 dropdowns to their initial state.
   */
  private reset() {
    this.model = getInitialModel();
    this.errors = {};
    this.loading = false;
    this.isOfflineRole = false;

    if (this.facilitySelectRef?.nativeElement) {
      const $facility = $(this.facilitySelectRef.nativeElement);
      $facility.val([]);
      $facility.trigger('change');
    }
    if (this.contactSelectRef?.nativeElement) {
      const $contact = $(this.contactSelectRef.nativeElement);
      $contact.val('');
      $contact.trigger('change');
    }
  }

  /**
   * Validates and submits the form to create a new user.
   * Runs sync validations first, then async contact-in-place and replication limit checks.
   * On success notifies the users service and closes the modal.
   * On error displays the error message inside the modal.
   */
  async submit() {
    this.computeFields();

    if (!this.validate()) {
      return;
    }

    const contactValid = await this.validateContactInPlace();
    if (!contactValid) {
      return;
    }

    const withinLimit = await this.validateReplicationLimit();
    if (!withinLimit) {
      return;
    }

    this.loading = true;
    this.errors = {};
    try {
      const { password, token_login, oidc_username, ...userBaseProperties } = this.model;
      await this.createUserService.createUser({
        ...userBaseProperties,
        token_login: token_login || undefined,
        oidc_username: oidc_username || undefined,
        password: this.passwordHidden ? undefined : password,
      });
      this.usersService.notifyUsersUpdated();
      this.reset();
      this.userCreated.emit();
      this.closed.emit();
    } catch (err: any) {
      this.errors.submit = err?.error?.message || 'users.create.error';
    } finally {
      this.loading = false;
    }
  }
}
