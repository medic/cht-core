/**
 * Keeps issues on the organization's GitHub project(s) (Projects v2) in sync with assignment,
 * a composite GitHub Action (see ./action.yml) usable from any repository in the org.
 *
 * On `assigned` events the issue is added to every open organization project whose title
 * matches the PROJECT_TITLE_REGEX environment variable (case-insensitive, defaults to
 * "activities"); adding an issue that is already on a board is a no-op on GitHub's side,
 * so repeated assignments are safe. On `unassigned` events the issue is removed from the
 * matching projects, but only once no assignees remain.
 *
 * Requires a token with the `project` scope — the default GITHUB_TOKEN cannot write to
 * organization projects.
 */

const DEFAULT_TITLE_PATTERN = 'activities';
const PAGE_SIZE = 100;

const getTitleRegex = () => {
  const pattern = process.env.PROJECT_TITLE_REGEX || DEFAULT_TITLE_PATTERN;
  try {
    return new RegExp(pattern, 'i');
  } catch (err) {
    throw new Error(`Invalid PROJECT_TITLE_REGEX "${pattern}": ${err.message}`);
  }
};

const matchesProject = (regex) => (project) => !project.closed && regex.test(project.title);

const projectName = (project) => `"${project.title}" (#${project.number.toString()})`;

const getOrgProjects = async (github, org) => {
  const query = `
    query ($org: String!, $pageSize: Int!, $cursor: String) {
      organization(login: $org) {
        projectsV2(first: $pageSize, after: $cursor) {
          nodes {
            id
            title
            number
            closed
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }`;
  const projects = [];
  let cursor = null;
  do {
    const result = await github.graphql(query, { org, pageSize: PAGE_SIZE, cursor });
    const connection = result.organization.projectsV2;
    projects.push(...connection.nodes);
    cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (cursor);
  return projects;
};

const getIssueProjectItems = async (github, context) => {
  const query = `
    query ($owner: String!, $repo: String!, $number: Int!, $pageSize: Int!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          projectItems(first: $pageSize, after: $cursor) {
            nodes {
              id
              project {
                id
                title
                number
                closed
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }`;
  const items = [];
  let cursor = null;
  do {
    const result = await github.graphql(query, {
      owner: context.repo.owner,
      repo: context.repo.repo,
      number: context.payload.issue.number,
      pageSize: PAGE_SIZE,
      cursor,
    });
    const connection = result.repository.issue.projectItems;
    items.push(...connection.nodes);
    cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
  } while (cursor);
  return items;
};

const addItemToProject = async (github, projectId, contentId) => {
  const mutation = `
    mutation ($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item {
          id
        }
      }
    }`;
  await github.graphql(mutation, { projectId, contentId });
};

const deleteItemFromProject = async (github, projectId, itemId) => {
  const mutation = `
    mutation ($projectId: ID!, $itemId: ID!) {
      deleteProjectV2Item(input: { projectId: $projectId, itemId: $itemId }) {
        deletedItemId
      }
    }`;
  await github.graphql(mutation, { projectId, itemId });
};

const handleAssigned = async ({ github, context, core }, regex) => {
  const issue = context.payload.issue;
  const org = context.repo.owner;

  const projects = await getOrgProjects(github, org);
  const matches = projects.filter(matchesProject(regex));

  if (!matches.length) {
    core.setFailed(`No open project in the "${org}" organization matches /${regex.source}/i.`);
    return;
  }
  if (matches.length > 1) {
    const titles = matches.map(projectName).join(', ');
    core.warning(`Multiple projects match /${regex.source}/i — adding the issue to all of them: ${titles}.`);
  }

  for (const project of matches) {
    await addItemToProject(github, project.id, issue.node_id);
    core.info(`Added issue #${issue.number.toString()} to project ${projectName(project)}.`);
  }
};

const handleUnassigned = async ({ github, context, core }, regex) => {
  const issue = context.payload.issue;

  if (issue.assignees.length) {
    const assignees = issue.assignees.map(assignee => assignee.login).join(', ');
    core.info(`Issue #${issue.number.toString()} is still assigned to ${assignees} — leaving it on the project.`);
    return;
  }

  const items = await getIssueProjectItems(github, context);
  const matches = items.filter(item => matchesProject(regex)(item.project));

  if (!matches.length) {
    core.info(`Issue #${issue.number.toString()} is not on any project matching /${regex.source}/i.`);
    return;
  }

  for (const item of matches) {
    await deleteItemFromProject(github, item.project.id, item.id);
    core.info(`Removed issue #${issue.number.toString()} from project ${projectName(item.project)}.`);
  }
};

const runAddToProjectBot = async ({ github, context, core }) => {
  const regex = getTitleRegex();

  if (context.payload.action === 'assigned') {
    await handleAssigned({ github, context, core }, regex);
    return;
  }
  if (context.payload.action === 'unassigned') {
    await handleUnassigned({ github, context, core }, regex);
    return;
  }
  core.info(`Nothing to do for "${context.payload.action}" events.`);
};

module.exports = runAddToProjectBot;
