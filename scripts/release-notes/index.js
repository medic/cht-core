const minimist = require('minimist');
const { Octokit } = require('@octokit/rest');
const { graphql } = require('@octokit/graphql');
const octokit = new Octokit({
  auth: require('../token.json').githubApiToken,
  userAgent: 'cht-release-note-generator',
});
const authenticatedGraphql = graphql.defaults({
  headers: {
    authorization: `token ${require('../token.json').githubApiToken}`,
    userAgent: 'cht-release-note-generator',
  },
});

const OWNER = 'medic';
const ISSUE_STATE = 'all';

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

const gitHubRepoQuery = query => authenticatedGraphql(
  `{ repository(owner: "${OWNER}", name: "${REPO_NAME}") { ${query} } }`
);

const getLatestReleaseName = async () => gitHubRepoQuery(
  `releases(first: 1) {
        edges { node { tagName } }
      }`
).then(({ repository }) => repository.releases.edges[0].node.tagName);

const getMilestoneBranch = async () => {
  const milestoneBranch = [...MILESTONE_NAME.split('.').slice(0, -1), 'x'].join('.');
  const branchExists = await gitHubRepoQuery(
    `ref(qualifiedName: "refs/heads/${milestoneBranch}") {
        target { oid }
      }`
  ).then(({ repository }) => repository.ref);
  if (branchExists) {
    return milestoneBranch;
  }

  // Fall back to default branch if milestone branch doesn't exist. This might be useful when preparing for a release
  // before actually creating the release branch.
  return gitHubRepoQuery(
    `defaultBranchRef { name }`
  ).then(({ repository }) => repository.defaultBranchRef.name);
};

// This query calculates the "commits for the release" by comparing the commit history of the latest release with the
// commit history of the milestone branch and keeping only the commits that are unique to the milestone branch.
const getPageOfCommitsForRelease = async (release, milestoneBranch, after) => gitHubRepoQuery(
  `ref(qualifiedName: "${release}") {
      compare(headRef: "${milestoneBranch}") {
        commits(first: 100, after: ${after}) {
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            oid
            messageHeadline
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
).then(({ repository }) => repository.ref.compare.commits);

const getCommitsForRelease = async (release, milestoneBranch) => {
  const commits = [];
  let after = null;
  do {
    const { nodes, pageInfo } = await getPageOfCommitsForRelease(release, milestoneBranch, after);
    commits.push(...nodes);
    after = pageInfo.hasNextPage ? `"${pageInfo.endCursor}"` : null;
  } while (after);

  return commits;
};

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

const issueHasMilestone = async issueNumber => gitHubRepoQuery(
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

const validateCommits = async () => {
  if (argv['skip-commit-validation']) {
    return;
  }
  const latestReleaseName = await getLatestReleaseName();
  const milestoneBranch = await getMilestoneBranch();
  const commitsForRelease = await getCommitsForRelease(latestReleaseName, milestoneBranch);
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

const getMilestone = async () => {
  const response = await octokit.rest.issues.listMilestones({ owner: OWNER, repo: REPO_NAME });
  return response.data.find(milestone => milestone.title === MILESTONE_NAME);
};

const getMilestoneNumber = async () => {
  const milestone = await getMilestone();
  if (!milestone) {
    throw new Error(`Could not find milestone with the repo ${REPO_NAME} and name ${MILESTONE_NAME}`);
  }
  return milestone.number;
};

const validateIssue = issue => {
  const matchingTypes = TYPES.filter(type => issue.labels.find(label => type.labels.includes(label.name)));
  if (!matchingTypes.length) {
    return `Issue doesn't have any Type label: ${issue.html_url}`;
  }
  if (matchingTypes.length > 1) {
    return `Issue has too many Type labels: ${issue.html_url}`;
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
  return issues;
};

const getIssues = async (milestoneId) => {
  const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
    owner: OWNER,
    repo: REPO_NAME,
    milestone: milestoneId,
    state: ISSUE_STATE,
    per_page: 100
  });
  return validateIssues(issues);
};

const filterIssues = issues => {
  return issues.filter(issue => {
    return issue.labels.every(label => {
      return !PREFIXES_TO_IGNORE.some(prefix => label.name.startsWith(prefix));
    });
  });
};

const group = (group, issues) => {
  const filtered = issues
    .filter(issue => issue.labels.find(label => group.labels.includes(label.name)))
    .sort((lhs, rhs) => lhs.html_url.localeCompare(rhs.html_url));
  return { title: group.title, issues: filtered };
};

const groupIssues = issues => {
  return {
    warnings: WARNINGS.map(warning => group(warning, issues)),
    types: TYPES.map(type => group(type, issues))
  };
};

const format = issue => `- [#${issue.number}](${issue.html_url}): ${issue.title}\n`;

const formatAll = issues => issues.length ? issues.map(format).join('') : 'None.\n';

const outputGroups = (groups) => {
  return groups.map(group => `### ${group.title}\n\n${formatAll(group.issues)}\n`).join('');
};

const output = ({ warnings, types }) => {
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

${outputGroups(warnings)}
## Highlights

<<< TODO >>>

## And more...

${outputGroups(types)}`);
};

Promise.resolve()
  .then(validateCommits)
  .then(getMilestoneNumber)
  .then(getIssues)
  .then(filterIssues)
  .then(groupIssues)
  .then(output)
  .catch(console.error);
