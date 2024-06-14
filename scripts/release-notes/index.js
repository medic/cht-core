const minimist = require('minimist');
const { Octokit } = require('@octokit/core');
const { paginateGraphql } = require('@octokit/plugin-paginate-graphql');
const ExtendedOctokit = Octokit.plugin(paginateGraphql);
const octokit = new ExtendedOctokit({
  auth: require('../token.json').githubApiToken,
  userAgent: 'cht-release-note-generator',
});

const OWNER = 'medic';
const BOTS = ['dependabot[bot]'];

const argv = minimist(process.argv.slice(2));
if (argv.help) {
  console.log(`
Usage: node index.js [OPTIONS] REPO MILESTONE

Generates a changelog given a GH report and milestone. Requires a GitHub API token to be configured. 
See the README for more information.

Options:
   --help  Show this help message
   --skip-commit-validation  Skip validation of commits
   
Repository: The name of the repository (e.g. cht-core).

Milestone: The name of the milestone (e.g. 2.15.0).
`);
  process.exit(0);
}

const [REPO_NAME, MILESTONE_NAME] = argv._;
if (!REPO_NAME) {
  throw new Error('You must specify a repo name (eg: "cht-core") as the first argument');
}
if (!MILESTONE_NAME) {
  throw new Error('You must specify a milestone name (eg: "2.15.0") as the second argument');
}

const WARNINGS = [
  { labels: ['Breaking change'], title: 'Breaking changes' },
  { labels: ['UI/UX'], title: 'UI/UX changes' },
];

const TYPES = [
  { labels: ['Type: Feature'], title: 'Features' },
  { labels: ['enhancement', 'Type: Improvement'], title: 'Improvements' },
  { labels: ['Type: Security'], title: 'Security fixes' },
  { labels: ['Type: Performance'], title: 'Performance improvements' },
  { labels: ['bug', 'Type: Bug'], title: 'Bug fixes' },
  { labels: ['Type: Technical issue', 'Type: Internal process'], title: 'Technical improvements' },
];

const PREFIXES_TO_IGNORE = [
  'Type: Internal process',
  'Won\'t fix:',
  'Type: Investigation',
];

const getRepoQueryString = query => `{ repository(owner: "${OWNER}", name: "${REPO_NAME}") { ${query} } }`;

const queryRepo = query => octokit.graphql(getRepoQueryString(query));

const queryRepoPaginated = query => octokit.graphql
  .paginate(`query paginate($cursor: String) ${getRepoQueryString(query)}`);

const getLatestReleaseName = async () => queryRepo(
  `releases(first: 1) {
        edges { node { tagName } }
      }`
).then(({ repository }) => repository.releases.edges[0].node.tagName);

const getMilestoneBranch = async () => {
  const milestoneBranch = [...MILESTONE_NAME.split('.').slice(0, -1), 'x'].join('.');
  const branchExists = await queryRepo(
    `ref(qualifiedName: "refs/heads/${milestoneBranch}") {
        target { oid }
      }`
  ).then(({ repository }) => repository.ref);
  if (branchExists) {
    return milestoneBranch;
  }

  // Fall back to default branch if milestone branch doesn't exist. This might be useful when preparing for a release
  // before actually creating the release branch.
  return queryRepo(
    `defaultBranchRef { name }`
  ).then(({ repository }) => repository.defaultBranchRef.name);
};

// This query calculates the "commits for the release" by comparing the commit history of the latest release with the
// commit history of the milestone branch and keeping only the commits that are unique to the milestone branch.
const getCommitsForRelease = async (release, milestoneBranch) => queryRepoPaginated(
  `ref(qualifiedName: "${release}") {
      compare(headRef: "${milestoneBranch}") {
        commits(first: 100, after: $cursor) {
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            oid
            messageHeadline
            author { user { login, name, url } }
            associatedPullRequests(first: 50) {
              nodes {
                milestone { id }
                closingIssuesReferences(first: 50) { edges { node { milestone { id } } } }
              }
            }
          }
        }
      }
    }`
).then(({ repository }) => repository.ref.compare.commits.nodes);

const commitHasPRWithMilestone = commit => commit.associatedPullRequests.nodes.find(pr => pr.milestone);
const prHasIssueWithMilestone = pr => pr.closingIssuesReferences.edges.find(edge => edge.node.milestone);
const commitPRHasIssueWithMilestone = commit => commit.associatedPullRequests.nodes.find(prHasIssueWithMilestone);

const getIssueNumbers = commitMessage => {
  const issuePattern = /#(\d+)/g;
  const results = commitMessage.match(issuePattern);
  if (!results) {
    return [];
  }

  return results.map(result => result.substring(1));
};

const issueHasMilestone = async issueNumber => queryRepo(
  `issueOrPullRequest(number: ${issueNumber}){
        ... on Issue { milestone { id } }
        ... on PullRequest { milestone { id } }
      }`
).then(({ repository }) => repository.issueOrPullRequest.milestone);

const commitMsgHasIssueWithMilestone = async ({ messageHeadline }) => {
  for (const issueNumber of getIssueNumbers(messageHeadline)) {
    if (await issueHasMilestone(issueNumber)) {
      return true;
    }
  }

  return false;
};

const findCommitsWithoutMilestone = async (commitsForRelease) => {
  const commitsWithoutMilestone = [];
  for (const commit of commitsForRelease) {
    if (
      commitHasPRWithMilestone(commit)
      || commitPRHasIssueWithMilestone(commit)
      || (await commitMsgHasIssueWithMilestone(commit))
    ) {
      continue;
    }

    commitsWithoutMilestone.push(commit);
  }
  return commitsWithoutMilestone;
};

const validateCommits = async (commitsForRelease) => {
  if (argv['skip-commit-validation']) {
    return;
  }
  const commitsWithoutMilestone = await findCommitsWithoutMilestone(commitsForRelease);

  if (commitsWithoutMilestone.length) {
    console.error(`
Some commits included in the release are not associated with a milestone. Commits can be associated with a milestone by:

  1. Setting the milestone on an issue closed by the commit's PR (issue must be listed in the PR's "Development" links)
  2. Setting the milestone directly on the commit's PR
  3. Setting the milestone on an issue referenced in the commit message (e.g. "fix(#1345): ..."

Commits:
`);
    commitsWithoutMilestone.forEach(commit => console.error(`- ${commit.oid}: ${commit.messageHeadline}`));
    throw new Error('Some commits are in an invalid state. Use --skip-commit-validation to ignore this check.');
  }
};

const getMilestone = async () => queryRepo(
  `milestones(query: "${MILESTONE_NAME}", first: 1) { nodes { number } }`
).then(({ repository }) => repository.milestones.nodes[0]);

const getMilestoneNumber = async () => {
  const milestone = await getMilestone();
  if (!milestone) {
    throw new Error(`Could not find milestone with the repo ${REPO_NAME} and name ${MILESTONE_NAME}`);
  }
  return milestone.number;
};

const getMilestoneIssues = async (milestoneNumber) => queryRepoPaginated(
  `milestone(number: ${milestoneNumber}) {
    issues(first: 100, after: $cursor, states: [OPEN, CLOSED]) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        number
        url
        title
        labels(first: 100) { nodes { name } }
      }
    }
  }`
).then(({ repository }) => repository.milestone.issues.nodes);

const validateIssue = issue => {
  const matchingTypes = TYPES.filter(type => issue.labels.nodes.find(label => type.labels.includes(label.name)));
  if (!matchingTypes.length) {
    return `Issue doesn't have any Type label: ${issue.url}`;
  }
  if (matchingTypes.length > 1) {
    return `Issue has too many Type labels: ${issue.url}`;
  }
};

const validateIssues = issues => {
  const errors = issues
    .map(validateIssue)
    .filter(error => !!error);
  if (errors.length) {
    console.error(JSON.stringify(errors, null, 2));
    throw new Error('Some issues are in an invalid state');
  }
};

const filterIssues = issues => {
  return issues.filter(issue => {
    return issue.labels.nodes.every(label => {
      return !PREFIXES_TO_IGNORE.some(prefix => label.name.startsWith(prefix));
    });
  });
};

const group = (group, issues) => {
  const filtered = issues
    .filter(issue => issue.labels.nodes.find(label => group.labels.includes(label.name)))
    .sort((lhs, rhs) => lhs.url.localeCompare(rhs.url));
  return { title: group.title, issues: filtered };
};

const groupIssues = issues => {
  return {
    warnings: WARNINGS.map(warning => group(warning, issues)),
    types: TYPES.map(type => group(type, issues))
  };
};

const format = issue => `- [#${issue.number}](${issue.url}): ${issue.title}\n`;

const formatAll = issues => issues.length ? issues.map(format).join('') : 'None.\n';

const formatGroups = (groups) => {
  return groups
    .map(group => `### ${group.title}\n\n${formatAll(group.issues)}\n`)
    .join('');
};

const formatCommits = (commits) => {
  const ignoreLogins = BOTS;
  const lines = [];
  for (const commit of commits) {
    const login = commit.author?.user?.login;
    if (login && !ignoreLogins.includes(login)) {
      ignoreLogins.push(login);
      const user = commit.author.user;
      const name = user.name || user.login;
      const profileUrl = user.url;
      lines.push(`- [${name}](${profileUrl})`);
    }
  }
  return lines.join('\n');
};

const output = ({ warnings, types }, commits) => {
  console.log(`
---
title: "${MILESTONE_NAME} release notes"
linkTitle: "${MILESTONE_NAME}"
weight:
description: >
relevantLinks: >
toc_hide: true
---

## Known issues

Check the repository for the [latest known issues](https://github.com/medic/cht-core/issues?q=is%3Aissue+label%3A%22Affects%3A+${MILESTONE_NAME}%22).

## Upgrade notes

${formatGroups(warnings)}
## Highlights

<<< TODO >>>

## And more...

${formatGroups(types)}

## Contributors

Thanks to all who committed changes for this release!

${formatCommits(commits)}
`);
};

const getCommits = async () => {
  const latestReleaseName = await getLatestReleaseName();
  const milestoneBranch = await getMilestoneBranch();
  const commitsForRelease = await getCommitsForRelease(latestReleaseName, milestoneBranch);
  validateCommits(commitsForRelease);
  return commitsForRelease;
};

const getIssues = async () => {
  const milestoneNumber = await getMilestoneNumber();
  const issues = await getMilestoneIssues(milestoneNumber);
  await validateIssues(issues);
  const filtered = await filterIssues(issues);
  const grouped = await groupIssues(filtered);
  return grouped;
};

Promise.all([ getIssues(), getCommits() ])
  .then(([ issues, commits ]) => output(issues, commits))
  .catch(console.error);
