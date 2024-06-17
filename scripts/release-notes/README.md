# Release notes generator script

## Usage

### Setup

Install the required dependencies by running the following from the `scripts` directory:

```shell
npm ci
```

Configure your GitHub API token by generating a token [for your GitHub account](https://github.com/settings/tokens) and saving it in a `scripts/token.json` file with the following format:

```json
{ "githubApiToken": "YOUR_TOKEN" }
```

This token needs at least `read:org` permissions.

### Running the script

Run the script with the following command:

```shell
node index.js [OPTIONS] REPO MILESTONE > tmp.md
```

Options:
- `--help` - Show the help message
- `--skip-commit-validation` - Skip validation of commits

Repository: The name of the repository (e.g. cht-core).

Milestone: The name of the milestone (e.g. 2.15.0).
