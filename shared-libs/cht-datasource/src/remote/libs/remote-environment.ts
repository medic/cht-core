export const fetchIdentifiedResource = async <T>(resourcePath: string, identifier: string): Promise<Nullable<T>> => {
  const response = await fetch(`${resourcePath}/${identifier}`);
  if (response.ok) {
    return (await response.json()) as T;
  }

  return null;
};

