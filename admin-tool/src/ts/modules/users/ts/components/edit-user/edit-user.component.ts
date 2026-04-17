import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges,
  ViewChild, ElementRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { EditUserService } from '@admin-tool-services/edit-user.service';
import { Select2SearchService } from '@admin-tool-services/select2search.service';
import { SettingsService } from '@admin-tool-services/settings.service';
import { UsersService } from '@admin-tool-services/users.service';
import { User } from '@admin-tool-modules/users/users-interfaces';

const passwordTester = require('simple-password-tester');
const phoneNumber = require('@medic/phone-number');
const PASSWORD_MINIMUM_LENGTH = 8;
const PASSWORD_MINIMUM_SCORE = 50;

const FIELDS_TO_IGNORE = [
  'passwordConfirm',
  'showPassword',
  'tokenLoginEnabled',
];

export interface EditUserErrors {
  username?: string;
  fullname?: string;
  email?: string;
  phone?: string;
  roles?: string;
  place?: string;
  contact?: string;
  password?: string;
  passwordConfirm?: string;
  submit?: string;
  replicationLimit?: string;
}

export interface EditUserModel {
  id: string;
  username: string;
  fullname: string;
  email: string;
  phone: string;
  roles: string[];
  place: string | string[] | null;
  contact: string | null;
  token_login: boolean | '' | null;
  tokenLoginEnabled: {
    active: boolean;
    expired: boolean;
    expirationDate: string;
    loginDate?: string;
  } | null;
  oidc_username: string;
  password: string;
  passwordConfirm: string;
  showPassword: boolean;
}

const getInitialModel = (): EditUserModel => ({
  id: '',
  username: '',
  fullname: '',
  email: '',
  phone: '',
  roles: [],
  place: null,
  contact: null,
  token_login: null,
  tokenLoginEnabled: null,
  oidc_username: '',
  password: '',
  passwordConfirm: '',
  showPassword: false,
});

/**
 * Modal component for editing an existing user.
 * Controlled by the parent via the `visible` and `user` inputs.
 * Emits `closed` when dismissed and `userUpdated` on successful update.
 */
@Component({
  selector: 'edit-user',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './edit-user.component.html',
  styleUrl: './edit-user.component.less',
})
export class EditUserComponent implements OnChanges {
  @Input() visible = false;
  @Input() user: User | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() userUpdated = new EventEmitter<void>();

  @ViewChild('facilitySelect') facilitySelectRef!: ElementRef<HTMLSelectElement>;
  @ViewChild('contactSelect') contactSelectRef!: ElementRef<HTMLSelectElement>;

  loading = false;
  errors: EditUserErrors = {};
  availableRoles: { key: string; label: string }[] = [];
  isOfflineRole = false;
  allowTokenLogin = false;
  allowSSOLogin = false;

  model: EditUserModel = getInitialModel();

  private settingsRoles: Record<string, { name: string; offline?: boolean }> = {};
  private cachedSettings: any = null;
  private originalModel: EditUserModel = getInitialModel();

  constructor(
    private editUserService: EditUserService,
    private http: HttpClient,
    private select2SearchService: Select2SearchService,
    private settingsService: SettingsService,
    private usersService: UsersService,
  ) {}

  /**
   * When the modal becomes visible and a user is provided, load settings
   * and populate the model from the user object.
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true && this.user) {
      this.loadSettingsAndPopulate();
    }
    if (changes['visible']?.currentValue === false) {
      this.reset();
    }
  }

  async loadSettingsAndPopulate() {
    try {
      this.cachedSettings = await this.settingsService.get();
      this.settingsRoles = this.cachedSettings.roles ?? {};
      this.availableRoles = Object.entries(this.settingsRoles)
        .filter(([key]) => key !== '_admin')
        .map(([key, role]: [string, any]) => ({ key, label: role.name }));
      this.allowTokenLogin = !!this.cachedSettings.token_login?.enabled;
      this.allowSSOLogin = !!this.cachedSettings.oidc_provider;
      this.populateModel();
      // Defer Select2 init to next tick so modal DOM is rendered
      setTimeout(() => this.initSelect2(), 0);
    } catch (err) {
      console.error('Error loading settings', err);
    }
  }

  private populateModel() {
    if (!this.user) {
      return;
    }

    const facilityId = this.user.facility_id
      ? Array.isArray(this.user.facility_id)
        ? this.user.facility_id
        : [this.user.facility_id]
      : null;

    const tokenLoginData = (this.user as any).token_login;
    const tokenLoginEnabled = tokenLoginData
      ? {
        active: tokenLoginData.active,
        expired: tokenLoginData.expiration_date <= new Date().getTime(),
        expirationDate: tokenLoginData.expiration_date
          ? new Date(tokenLoginData.expiration_date).toLocaleDateString()
          : '',
        loginDate: tokenLoginData.login_date
          ? new Date(tokenLoginData.login_date).toLocaleDateString()
          : undefined,
      }
      : null;

    this.model = {
      id: this.user.id || '',
      username: this.user.username || '',
      fullname: this.user.fullname || '',
      email: (this.user as any).email || '',
      phone: this.user.phone || '',
      roles: this.filterRoles(this.user.roles || []),
      place: facilityId,
      contact: this.user.contact_id || null,
      token_login: null,
      tokenLoginEnabled,
      oidc_username: (this.user as any).oidc_username || '',
      password: '',
      passwordConfirm: '',
      showPassword: false,
    };

    // Store original for diffing changed fields on submit
    this.originalModel = { ...this.model, roles: [...this.model.roles] };
    this.isOfflineRole = this.isOfflineUser();
  }

  private filterRoles(roles: string[]): string[] {
    if (!roles.length) {
      return [];
    }
    if (roles.includes('_admin')) {
      return ['_admin'];
    }
    return roles.filter(role => !!this.settingsRoles[role]);
  }

  private async initSelect2() {
    if (this.facilitySelectRef?.nativeElement) {
      // initialValue accepts a single string — preselect the first place if multiple
      const placeIds = Array.isArray(this.model.place)
        ? this.model.place
        : this.model.place ? [this.model.place] : [];
      const initialValue = placeIds[0] || undefined;
      await this.select2SearchService.initPlaceSelect(
        this.facilitySelectRef.nativeElement,
        { initialValue }
      );
    }
    if (this.contactSelectRef?.nativeElement) {
      const initialValue = this.model.contact || undefined;
      await this.select2SearchService.initPersonSelect(
        this.contactSelectRef.nativeElement,
        { initialValue }
      );
    }
  }

  private computeFields() {
    if (this.facilitySelectRef?.nativeElement) {
      const val = $(this.facilitySelectRef.nativeElement).val();
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

  private isOfflineUser(): boolean {
    return this.model.roles.some(role => this.settingsRoles[role]?.offline === true);
  }

  get passwordHidden(): boolean {
    return (this.allowTokenLogin && (
      !!this.model.token_login ||
      (this.model.token_login !== false && !!this.model.tokenLoginEnabled)
    )) || (this.allowSSOLogin && !!this.model.oidc_username);
  }

  cancel() {
    this.reset();
    this.closed.emit();
  }

  togglePassword() {
    this.model.showPassword = !this.model.showPassword;
  }

  toggleRole(key: string) {
    const index = this.model.roles.indexOf(key);
    if (index === -1) {
      this.model.roles.push(key);
    } else {
      this.model.roles.splice(index, 1);
    }
    this.isOfflineRole = this.isOfflineUser();
  }

  // --- Validation sub-methods ---

  private validateEmail() {
    if (this.model.email && !/^[^\s@]+@[^\s@]+$/.test(this.model.email)) {
      this.errors.email = 'email.invalid';
    }
  }

  private validateRoles() {
    if (!this.model.roles.length) {
      this.errors.roles = 'field.required';
    }
  }

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
   * Password validation for edit differs from create:
   * - If token login or SSO is active, clear and skip password fields
   * - If disabling token login (token_login === false), password is required
   * - For existing users, password is optional — only validate if either field is filled
   */
  private validatePassword() {
    if (this.passwordHidden) {
      this.model.password = '';
      this.model.passwordConfirm = '';
      return;
    }

    const disablingTokenLogin = this.model.token_login === false;
    const eitherFieldFilled = this.model.password || this.model.passwordConfirm;

    if (!disablingTokenLogin && !eitherFieldFilled) {
      // Existing user, no password change — skip validation
      return;
    }

    if (!this.model.password) {
      this.errors.password = 'field.required';
      return;
    }

    if (this.model.password.length < PASSWORD_MINIMUM_LENGTH) {
      this.errors.password = 'password.length.minimum';
      return;
    }

    if (passwordTester(this.model.password) < PASSWORD_MINIMUM_SCORE) {
      this.errors.password = 'password.weak';
      return;
    }

    if (this.model.password !== this.model.passwordConfirm) {
      this.errors.passwordConfirm = 'Passwords must match';
    }
  }

  private validate(): boolean {
    this.errors = {};
    this.validateEmail();
    this.validateRoles();
    this.validatePhone();
    this.validateFacilityAndContact();
    this.validatePassword();
    return Object.keys(this.errors).length === 0;
  }

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
   * Returns only the fields that have changed compared to the original model.
   * Password is included only if non-empty.
   * Internal/meta fields are excluded.
   */
  private getChangedUpdates(): Record<string, any> {
    const updates: Record<string, any> = {};

    for (const key of Object.keys(this.model) as (keyof EditUserModel)[]) {
      if (key === 'id' || FIELDS_TO_IGNORE.includes(key)) {
        continue;
      }

      if (key === 'password') {
        if (this.model.password) {
          updates.password = this.model.password;
        }
        continue;
      }

      if (key === 'roles') {
        const updated = [...this.model.roles].sort();
        const original = [...this.originalModel.roles].sort();
        if (
          updated.length !== original.length ||
          !updated.every((r, i) => r === original[i])
        ) {
          updates.roles = this.model.roles;
        }
        continue;
      }

      if (this.model[key] !== this.originalModel[key]) {
        updates[key] = this.model[key];
      }
    }

    return updates;
  }

  private reset() {
    this.model = getInitialModel();
    this.originalModel = getInitialModel();
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

    const updates = this.getChangedUpdates();
    if (!Object.keys(updates).length) {
      // Nothing changed — just close
      this.reset();
      this.closed.emit();
      return;
    }

    this.loading = true;
    this.errors = {};
    try {
      await this.editUserService.updateUser(this.model.username, updates);
      this.usersService.notifyUsersUpdated();
      this.reset();
      this.userUpdated.emit();
      this.closed.emit();
    } catch (err: any) {
      this.errors.submit = err?.error?.message || 'Error updating user';
    } finally {
      this.loading = false;
    }
  }
}
