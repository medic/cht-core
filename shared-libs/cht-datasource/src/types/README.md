# cht-datasource types

This directory contains the global (ambient) types for cht-datasource. These types can be used throughout the cht-datasource code without needing to explicitly import them. Additionally, these types are available to any other package that depends on cht-datasource. This directory should contain only `.d.ts` files for specifying types and interfaces with no actual implementation.

## Adding a new type file

When adding a new type file, make sure you also add a `reference` to the file in the top-level [`global.d.ts` file](../../global.d.ts). This will ensure that the type is available to all other packages that depend on cht-datasource.

## Adding new types/interfaces

When adding new types or interfaces:

- Make sure to add a `JSDoc` comment to describe the type or interface.
- Do not `export` the type or interface. It will be available globally without needing to import it.
- Do not `import` any other types or interfaces with a standard `import` statement. This will cause the types in the file to be treated as _module types_ that must be imported instead of being _ambient types_. Module types will not be available globally.
