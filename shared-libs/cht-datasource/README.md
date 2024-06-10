# CHT Datasource

The CHT Datasource library is intended to be agnostic and simple. It provides a versioned API from feature modules.

See the TSDoc in [the code](./src/index.ts) for more information about using the API.

## Development

Functionality in cht-datasource is provided via two implementations. The [`local` adapter](./src/local) leverages the provided PouchDB instances for data interaction. This is intended for usage in cases where offline functionality is required (like webapp for offline users) or direct access to the Couch database is guaranteed (like api and sentinel).  The [`remote` adapter](./src/remote) functions by proxying requests directly to the api server via HTTP. This is intended for usage in cases where connectivity to the api server is guaranteed (like in admin or webapp for online users).

### Building cht-datasource

The transpiled JavaScript code is generated in the [`dist` directory](./dist). The library is automatically built when running `npm ci` (either within the `cht-datasource` directory or from the root level).  To manually build the library, run `npm run build`. To automatically re-build the library when any of the source files change, run `npm run build-watch`.

The root level `build-dev-watch`, `dev-api`, and `dev-sentinel` scripts will automatically watch for changes in the cht-datasource code and rebuild the library.

### Adding a new API

When adding a new API to cht-datasource (whether it is a new concept or just a new interaction with an existing concept), the implementation must be completed at four levels:

1) Implement the interaction in the [`local`](./src/local) and [`remote`](./src/remote) adapters.
2) Expose a unified interface for the interaction from the relevant top-level [concept module](./src).
3) Expose the new concept interaction by adding it to the datasource returned from the [index.ts](./src/index.ts).
4) Implement the necessary endpoint(s) in [api](../../api) to support the new interaction (these are the endpoints called by the remote adapter code).

### Updating functionality

Only passive changes should be made to the versioned public API's exposed by cht-datasource. Besides their usage in cht-core, these API's are available to custom configuration code for things like purging, tasks, targets, etc. If a non-passive change is needed, it should be made on a new version of the API.

The previous version of the functionality should be marked as `@deprecated` and, where possible, all usages in the cht-core code should be updated to use the new API.
