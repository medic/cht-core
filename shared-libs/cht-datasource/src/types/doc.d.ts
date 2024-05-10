type DataPrimitive = string | number | boolean | Date | null | undefined;

interface Doc extends Readonly<Record<string, DataPrimitive | DocArray | Doc>> {
  _id: string;
  _rev: string;
}

interface DocArray extends Readonly<(DataPrimitive | DocArray | Doc)[]> { }

declare namespace V1 {
  type UuidIdentifier = Readonly<{ uuid: string }>;
}

type SourceDatabases = Readonly<{ medic: PouchDB.Database<Doc> }>;
