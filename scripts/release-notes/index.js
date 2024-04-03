/*
 * Generates a changelog given a GH report and milestone.
 *
 * USAGE:
 *  1) Make sure all the issues in the release are assigned to the milestone
 *  2) Each issue should have one and only one Type label - the script will tell you which ones don't
 *  3) Make sure you have generated a GH token and created a token.json file, eg: { "githubApiToken": "..." }
 *     This token needs at least `read:org` permissions
 *  4) Execute the command: node index.js <repo_name> <milestone_name> > <output_file>
 *      eg: node index.js cht-core 3.0.0 > tmp.md
 *  5) Insert the contents of the output file into the appropriate location in Changes.md
 */

const { Octokit } = require('@octokit/rest');
const { graphql } = require('@octokit/graphql');
const octokit = new Octokit({
  auth: require('../token.json').githubApiToken,
  userAgent: 'cht-release-note-generator',
});
const gitHub = graphql.defaults({
  headers: {
    authorization: `token ${require('../token.json').githubApiToken}`,
    userAgent: 'cht-release-note-generator',
  },
});

const OWNER = 'medic';
const ISSUE_STATE = 'all';

const REPO_NAME = process.argv[2];
if (!REPO_NAME) {
  throw new Error('You must specify a repo name (eg: "cht-core") as the first argument');
}
const MILESTONE_NAME = process.argv[3];
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

const gitHubRepoQuery = query => gitHub(`{ repository(owner: "${OWNER}", name: "${REPO_NAME}") { ${query} } }`);

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

const getLatestReleaseName = async () => (await gitHubRepoQuery(
  `releases(first: 1) {
        edges { node { tagName } }
      }`
)).repository.releases.edges[0].node.tagName;

const getMilestoneBranch = async () => {
  const milestoneBranch = [...MILESTONE_NAME.split('.').slice(0, -1), 'x'].join('.');
  const branchExists = (await gitHubRepoQuery(
    `ref(qualifiedName: "refs/heads/${milestoneBranch}") {
        target { oid }
      }`
  )).repository.ref;
  if (branchExists) {
    return milestoneBranch;
  }

  return (await gitHubRepoQuery(
    `defaultBranchRef { name }`
  )).repository.defaultBranchRef.name;
};

const getPageOfCommitsForRelease = async (release, milestoneBranch, after) => (await gitHubRepoQuery(
  `ref(qualifiedName: "${release}") {
      compare(headRef: "${milestoneBranch}") {
        commits(first: 10, after: ${after}) {
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            oid
            messageHeadline
            associatedPullRequests(first: 10) {
              nodes {
                milestone { id }
                closingIssuesReferences(first: 100) { edges { node { milestone { id } } } }
              }
            }
          }
        }
      }
    }`
)).repository.ref.compare.commits;

const getCommitsForRelease = async (release, milestoneBranch) => {
  const commits = [];
  let after = null;
  do {
    const page = await getPageOfCommitsForRelease(release, milestoneBranch, after);
    commits.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? `"${page.pageInfo.endCursor}"` : null;
  } while (after);

  return commits;
};

const commitHasPRWithMilestone = commit => commit.associatedPullRequests.nodes.find(pr => pr.milestone);
const prHasIssueWithMilestone = pr => pr.closingIssuesReferences.edges.find(edge => edge.node.milestone);
const commitHasIssueWithMilestone = commit => commit.associatedPullRequests.nodes.find(prHasIssueWithMilestone);
const commitMsgHasIssueWithMilestone = async commit => {
  const issuePattern = /#(\d+)/g;
  const results = commit.messageHeadline.match(issuePattern);
  if (!results) {
    return false;
  }

  const issueNumbers = results.map(result => result.substring(1));
  for (const issueNumber of issueNumbers) {
    const { milestone } = (await gitHubRepoQuery(
      `issueOrPullRequest(number: ${issueNumber}){
        ... on Issue { milestone { id } }
        ... on PullRequest { milestone { id } }
      }`
    )).repository.issueOrPullRequest;
    if (milestone) {
      return true;
    }
  }

  return false;
};

const validateCommits = async () => {
  const latestReleaseName = await getLatestReleaseName();
  const milestoneBranch = await getMilestoneBranch();
  const commitsForRelease = await getCommitsForRelease(latestReleaseName, milestoneBranch);

  const commitsWithoutMilestone = [];
  for (const commit of commitsForRelease) {
    if (
      commitHasPRWithMilestone(commit)
      || commitHasIssueWithMilestone(commit)
      || (await commitMsgHasIssueWithMilestone(commit))
    ) {
      continue;
    }

    commitsWithoutMilestone.push(commit);
  }

  if (commitsWithoutMilestone.length) {
    console.error('Some commits included in the release are missing a milestone (either on their issue or their PR):');
    commitsWithoutMilestone.forEach(commit => console.error(`- ${commit.oid}: ${commit.messageHeadline}`));

    throw new Error('Some commits are in an invalid state');
  }
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

(async () => {
  await validateCommits();
  // await getMilestoneNumber()
  //   .then(getIssues)
  //   .then(filterIssues)
  //   .then(groupIssues)
  //   .then(output)
  //   .catch(console.error);
})();



// Promise.resolve()
//   .then(getMilestoneNumber)
//   .then(getIssues)
//   .then(filterIssues)
//   .then(groupIssues)
//   .then(output)
//   .catch(console.error);
