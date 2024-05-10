namespace V1 {
  interface AbstractPerson {
    date_of_birth?: Date;
    phone?: string;
    patient_id?: string;
    sex?: string;
  }

  interface Person extends Contact, AbstractPerson { }

  interface PersonSource {
    /**
     * Returns the identified person.
     * @param identifier the unique identifier of the person
     * @returns The identified person or <code>null</code> if not found
     */
    get: (identifier: V1.UuidIdentifier) => Promise<Nullable<Person>>;
  }
}
