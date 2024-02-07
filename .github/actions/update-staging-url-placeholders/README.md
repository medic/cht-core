# PR Search for tokens, replace with URLs

Search and replace in the body of a PR, currently hard coded for `<!-- COMPOSE URLS GO HERE - DO NOT CHANGE -->`.

## Example workflow:

```yaml
name: Update compose URLs

on:
  pull_request:
    types: [opened, reopened, synchronize]

jobs:

  replace-pr-tokens-with-staging-URLs:
    runs-on: ubuntu-latest
    name: Updates pull requests body with URLs we want to replace
    steps:
      - name: checkout
        uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          # ref: 7848-add-gh-action-for-staging-urls
      - name: Search-Replace PR Body
        uses: ./.github/actions/update-staging-url-placeholders
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```


## Example change:

### Before

`<!-- COMPOSE URLS GO HERE - DO NOT CHANGE -->`

### After

```markdown
* [Core](https://staging.dev.medicmobile.org/_couch/builds/medic:medic:<branch>/docker-compose/cht-core.yml)
* [CouchDB Single](https://staging.dev.medicmobile.org/_couch/builds/medic:medic:<branch>/docker-compose/cht-couchdb.yml)
* [CouchDB Cluster](https://staging.dev.medicmobile.org/_couch/builds/medic:medic:<branch>/docker-compose/cht-couchdb-clustered.yml)
```

## Development

Make sure you install the packages with `npm install` in this directory, including NCC. You may need to install NCC
globally with `npm -i -g install @vercel/ncc`

To build, run `ncc build index.js -o compiled`.  If you're testing in a branch, be sure to *temporarily* change your
path in `uses` to be your branch from `master` to `BRANCH`.  Before:

```yaml
  replace-pr-tokens-with-staging-URLs:
    runs-on: ubuntu-latest
    name: Updates pull request body with URLs we want to replace
    steps:
      - name: Search-Replace PR Body
        uses: medic/cht-core/update-staging-url-placeholders@master
```

After, changing it to `mrjones-plip-patch-3`:

```yaml
  replace-pr-tokens-with-staging-URLs:
    runs-on: ubuntu-latest
    name: Updates pull request body with URLs we want to replace
    steps:
      - name: Search-Replace PR Body
        uses: medic/cht-core/update-staging-url-placeholders@mrjones-plip-patch-3
```
