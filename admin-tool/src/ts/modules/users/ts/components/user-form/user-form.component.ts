import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Select2SearchService } from '@admin-tool-services/select2search.service';
import { SettingsService } from '@admin-tool-services/settings.service';
import { UsersService } from '@admin-tool-services/users.service';
import {
  User,
  CreateUserErrors,
} from '@admin-tool-modules/users/users-interfaces';

const passwordTester = require('simple-password-tester');
const phoneNumber = require('@medic/phone-number');
const PASSWORD_MINIMUM_LENGTH = 8;
const PASSWORD_MINIMUM_SCORE = 50;

const FIELDS_TO_IGNORE = [
  'passwordConfirm',
  'showPassword',
  'tokenLoginEnabled',
];

const getInitialModel = () => ({
  id: '',
  username: '',
  fullname: '',
  email: '',
  phone: '',
  roles: [] as string[],
  place: null as string | string[] | null,
  contact: null as string | null,
  token_login: null as boolean | null,
  tokenLoginEnabled: null as User['token_login'] | null,
  oidc_username: '',
  password: '',
  passwordConfirm: '',
  showPassword: false,
});

type UserFormModel = ReturnType<typeof getInitialModel>;

/**
 * Shared modal component for creating and editing users.
 * Controlled by `mode` input — 'create' shows an empty form, 'edit' pre-populates from `user`.
 * Emits `closed` when dismissed and `userSaved` on successful create or update.
 */
@Component({
  selector: 'user-form',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.less',
})
export class UserFormComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() user: User | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() userSaved = new EventEmitter<void>();

  @ViewChild('facilitySelect')
  facilitySelectRef!: ElementRef<HTMLSelectElement>;

  @ViewChild('contactSelect') contactSelectRef!: ElementRef<HTMLSelectElement>;

  loading = false;
  errors: CreateUserErrors = {};
  availableRoles: { key: string; label: string }[] = [];
  isOfflineRole = false;
  allowTokenLogin = false;
  allowSSOLogin = false;

  model: UserFormModel = getInitialModel();

  private settingsRoles: Record<string, { name: string; offline?: boolean }> =
    {};

  private cachedSettings: any = null;
  private originalModel: UserFormModel = getInitialModel();

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get title(): string {
    return this.isEditMode ? 'Edit User' : 'Add User';
  }

  get submitLabel(): string {
    return this.isEditMode ? 'Submit' : 'Add User';
  }

  constructor(
    private http: HttpClient,
    private select2SearchService: Select2SearchService,
    private settingsService: SettingsService,
    private usersService: UsersService,
    private translateService: TranslateService,
  ) {}

  ngOnInit() {
    if (!this.isEditMode) {
      this.loadSettings();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      if (this.isEditMode && this.user) {
        this.loadSettingsAndPopulate();
      } else {
        setTimeout(() => this.initSelect2(), 0);
      }
    }
    if (changes['visible']?.currentValue === false) {
      this.reset();
    }
  }

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

  async loadSettingsAndPopulate() {
    await this.loadSettings();
    this.populateModel();
    setTimeout(() => this.initSelect2(), 0);
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

    this.model = {
      ...getInitialModel(),
      id: this.user.id || '',
      username: this.user.username || '',
      fullname: this.user.fullname || '',
      email: this.user.email || '',
      phone: this.user.phone || '',
      roles: this.filterRoles(this.user.roles || []),
      place: facilityId,
      contact: this.user.contact_id || null,
      tokenLoginEnabled: this.user.token_login ?? null,
      oidc_username: this.user.oidc_username || '',
    };

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
    return roles.filter((role) => !!this.settingsRoles[role]);
  }

  private async initSelect2() {
    if (this.facilitySelectRef?.nativeElement) {
      const placeIds = Array.isArray(this.model.place)
        ? this.model.place
        : this.model.place
          ? [this.model.place]
          : [];
      await this.select2SearchService.initPlaceSelect(
        this.facilitySelectRef.nativeElement,
        { initialValue: placeIds[0] || undefined },
      );
    }
    if (this.contactSelectRef?.nativeElement) {
      await this.select2SearchService.initPersonSelect(
        this.contactSelectRef.nativeElement,
        { initialValue: this.model.contact || undefined },
      );
    }
  }

  private computeFields() {
    if (this.facilitySelectRef?.nativeElement) {
      const val = $(this.facilitySelectRef.nativeElement).val();
      if (typeof val === 'string' || Array.isArray(val)) {
        this.model.place =
          Array.isArray(val) && val.length === 0 ? null : (val as string);
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
    return this.model.roles.some(
      (role) => this.settingsRoles[role]?.offline === true,
    );
  }

  get passwordHidden(): boolean {
    if (this.isEditMode) {
      return (
        (this.allowTokenLogin &&
          (!!this.model.token_login ||
            (this.model.token_login !== false &&
              !!this.model.tokenLoginEnabled))) ||
        (this.allowSSOLogin && !!this.model.oidc_username)
      );
    }
    return (
      (this.allowTokenLogin && !!this.model.token_login) ||
      (this.allowSSOLogin && !!this.model.oidc_username)
    );
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

  // --- Validation ---

  private validateUsername() {
    if (!this.model.username) {
      this.errors.username = 'field.required';
    } else if (!/^[a-z0-9_-]+$/.test(this.model.username)) {
      this.errors.username = 'username.invalid';
    }
  }

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

  private validatePassword() {
    if (this.passwordHidden) {
      this.model.password = '';
      this.model.passwordConfirm = '';
      return;
    }

    if (this.isEditMode) {
      const disablingTokenLogin = this.model.token_login === false;
      const eitherFieldFilled =
        this.model.password || this.model.passwordConfirm;
      if (!disablingTokenLogin && !eitherFieldFilled) {
        return;
      }
    }

    if (!this.model.password) {
      this.errors.password = 'field.required';
      return;
    }
    if (this.model.password.length < PASSWORD_MINIMUM_LENGTH) {
      this.errors.password = this.translateService.instant(
        'password.length.minimum',
        { minimum: PASSWORD_MINIMUM_LENGTH },
      );
      return;
    }
    if (passwordTester(this.model.password) < PASSWORD_MINIMUM_SCORE) {
      this.errors.password = 'password.weak';
      return;
    }
    if (!this.model.passwordConfirm) {
      this.errors.passwordConfirm = 'field.required';
    } else if (this.model.password !== this.model.passwordConfirm) {
      this.errors.passwordConfirm = 'Passwords must match';
    }
  }

  private validate(): boolean {
    this.errors = {};
    if (!this.isEditMode) {
      this.validateUsername();
    }
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

    const placeIds = Array.isArray(this.model.place)
      ? this.model.place
      : [this.model.place];
    const valid = await this.select2SearchService.isContactInPlace(
      this.model.contact,
      placeIds,
    );

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
        this.http.get('/api/v1/users-info', { params }),
      );
      if (resp?.warn) {
        this.errors.replicationLimit =
          'configuration.user.replication.limit.exceeded';
        return false;
      }
    } catch (err) {
      console.error('Error checking replication limit', err);
    }

    return true;
  }

  private getChangedUpdates(): Record<string, any> {
    const updates: Record<string, any> = {};

    for (const key of Object.keys(this.model) as (keyof UserFormModel)[]) {
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

    if (this.isEditMode) {
      const updates = this.getChangedUpdates();
      if (!Object.keys(updates).length) {
        this.reset();
        this.closed.emit();
        return;
      }
      this.loading = true;
      this.errors = {};
      try {
        await this.usersService.updateUser(this.model.username, updates);
        this.usersService.notifyUsersUpdated();
        this.reset();
        this.userSaved.emit();
        this.closed.emit();
      } catch (err: any) {
        this.errors.submit = err?.error?.message || 'Error updating user';
      } finally {
        this.loading = false;
      }
    } else {
      this.loading = true;
      this.errors = {};
      try {
        const { password, token_login, oidc_username, ...userBaseProperties } =
          this.model;
        await this.usersService.createUser({
          ...userBaseProperties,
          token_login: token_login || undefined,
          oidc_username: oidc_username || undefined,
          password: this.passwordHidden ? undefined : password,
        });
        this.usersService.notifyUsersUpdated();
        this.reset();
        this.userSaved.emit();
        this.closed.emit();
      } catch (err: any) {
        this.errors.submit = err?.error?.message || 'users.create.error';
      } finally {
        this.loading = false;
      }
    }
  }
}
