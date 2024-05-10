type Nullable<T> = T | null;

type NonEmptyArray<T> = [T, ...T[]];

// TODO Not sure we need this...
interface DataSource {
  v1: {
    personSource: PersonSource
  }
}
