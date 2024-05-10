// this is the new entry-point for your types
// use the triple-slash reference to bring in your ambient types

/// <reference types="./src/types/contact" />
/// <reference types="./src/types/core" />
/// <reference types="./src/types/doc" />
/// <reference types="./src/types/person" />

// re-export your compiled types
export * from './dist';
