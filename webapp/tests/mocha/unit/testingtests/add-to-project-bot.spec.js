const sinon = require('sinon');
const chai = require('chai');
const { expect } = chai;

const runAddToProjectBot = require('../../../../../.github/actions/add-to-project/add-to-project-bot');

const ACTIVITIES_PROJECT = { id: 'proj-activities', title: 'Product Activities', number: 7, closed: false };
const OTHER_ACTIVITIES_PROJECT = { id: 'proj-other-activities', title: 'CHT Activities', number: 9, closed: false };
const ROADMAP_PROJECT = { id: 'proj-roadmap', title: 'Roadmap', number: 3, closed: false };
const CLOSED_PROJECT = { id: 'proj-closed', title: 'Closed Activities', number: 1, closed: true };

const lastPage = { hasNextPage: false, endCursor: null };

const projectsPage = (nodes, pageInfo = lastPage) => ({
  organization: { projectsV2: { nodes, pageInfo } },
});

const itemsPage = (nodes, pageInfo = lastPage) => ({
  repository: { issue: { projectItems: { nodes, pageInfo } } },
});

describe('add-to-project bot', () => {
  let github;
  let core;

  const buildContext = (action, issue) => ({
    payload: { action, issue },
    repo: { owner: 'medic', repo: 'cht-core' },
  });

  beforeEach(() => {
    github = { graphql: sinon.stub() };
    core = { info: sinon.stub(), warning: sinon.stub(), setFailed: sinon.stub() };
  });

  afterEach(() => {
    sinon.restore();
    delete process.env.PROJECT_TITLE_REGEX;
  });

  describe('on assigned', () => {
    const issue = { number: 42, node_id: 'issue-node-42', assignees: [{ login: 'alice' }] };

    it('adds the issue to the open project matching the default regex', async () => {
      github.graphql.onCall(0).resolves(projectsPage([ROADMAP_PROJECT, ACTIVITIES_PROJECT, CLOSED_PROJECT]));
      github.graphql.onCall(1).resolves({ addProjectV2ItemById: { item: { id: 'item-1' } } });

      await runAddToProjectBot({ github, context: buildContext('assigned', issue), core });

      expect(github.graphql.callCount).to.equal(2);
      const [mutation, variables] = github.graphql.args[1];
      expect(mutation).to.include('addProjectV2ItemById');
      expect(variables).to.deep.equal({ projectId: ACTIVITIES_PROJECT.id, contentId: issue.node_id });
      expect(core.setFailed.called).to.equal(false);
      expect(core.warning.called).to.equal(false);
    });

    it('fails without adding when no open project matches', async () => {
      github.graphql.onCall(0).resolves(projectsPage([ROADMAP_PROJECT, CLOSED_PROJECT]));

      await runAddToProjectBot({ github, context: buildContext('assigned', issue), core });

      expect(github.graphql.callCount).to.equal(1);
      expect(core.setFailed.callCount).to.equal(1);
      expect(core.setFailed.args[0][0]).to.include('No open project in the "medic" organization');
    });

    it('warns and adds the issue to every matching project', async () => {
      github.graphql.onCall(0).resolves(projectsPage([ACTIVITIES_PROJECT, OTHER_ACTIVITIES_PROJECT]));
      github.graphql.onCall(1).resolves({ addProjectV2ItemById: { item: { id: 'item-1' } } });
      github.graphql.onCall(2).resolves({ addProjectV2ItemById: { item: { id: 'item-2' } } });

      await runAddToProjectBot({ github, context: buildContext('assigned', issue), core });

      expect(github.graphql.callCount).to.equal(3);
      expect(github.graphql.args[1][1]).to.deep.equal({ projectId: ACTIVITIES_PROJECT.id, contentId: issue.node_id });
      expect(github.graphql.args[2][1])
        .to.deep.equal({ projectId: OTHER_ACTIVITIES_PROJECT.id, contentId: issue.node_id });
      expect(core.warning.callCount).to.equal(1);
      expect(core.warning.args[0][0]).to.include('Multiple projects match');
      expect(core.setFailed.called).to.equal(false);
    });

    it('honors the PROJECT_TITLE_REGEX environment variable', async () => {
      process.env.PROJECT_TITLE_REGEX = '^roadmap$';
      github.graphql.onCall(0).resolves(projectsPage([ROADMAP_PROJECT, ACTIVITIES_PROJECT]));
      github.graphql.onCall(1).resolves({ addProjectV2ItemById: { item: { id: 'item-1' } } });

      await runAddToProjectBot({ github, context: buildContext('assigned', issue), core });

      expect(github.graphql.callCount).to.equal(2);
      expect(github.graphql.args[1][1]).to.deep.equal({ projectId: ROADMAP_PROJECT.id, contentId: issue.node_id });
    });

    it('rejects on an invalid PROJECT_TITLE_REGEX', async () => {
      process.env.PROJECT_TITLE_REGEX = '(';

      await expect(runAddToProjectBot({ github, context: buildContext('assigned', issue), core }))
        .to.be.rejectedWith('Invalid PROJECT_TITLE_REGEX');
      expect(github.graphql.called).to.equal(false);
    });

    it('paginates through the organization projects', async () => {
      github.graphql.onCall(0).resolves(projectsPage([ROADMAP_PROJECT], { hasNextPage: true, endCursor: 'cursor-1' }));
      github.graphql.onCall(1).resolves(projectsPage([ACTIVITIES_PROJECT]));
      github.graphql.onCall(2).resolves({ addProjectV2ItemById: { item: { id: 'item-1' } } });

      await runAddToProjectBot({ github, context: buildContext('assigned', issue), core });

      expect(github.graphql.callCount).to.equal(3);
      expect(github.graphql.args[0][1]).to.include({ cursor: null });
      expect(github.graphql.args[1][1]).to.include({ cursor: 'cursor-1' });
      expect(github.graphql.args[2][1]).to.deep.equal({ projectId: ACTIVITIES_PROJECT.id, contentId: issue.node_id });
    });
  });

  describe('on unassigned', () => {
    const issue = { number: 42, node_id: 'issue-node-42', assignees: [] };

    it('leaves the issue on the project while assignees remain', async () => {
      const stillAssigned = { ...issue, assignees: [{ login: 'alice' }, { login: 'bob' }] };

      await runAddToProjectBot({ github, context: buildContext('unassigned', stillAssigned), core });

      expect(github.graphql.called).to.equal(false);
      expect(core.info.args[0][0]).to.include('still assigned to alice, bob');
    });

    it('removes the issue from matching open projects once no assignees remain', async () => {
      github.graphql.onCall(0).resolves(itemsPage([
        { id: 'item-activities', project: ACTIVITIES_PROJECT },
        { id: 'item-roadmap', project: ROADMAP_PROJECT },
        { id: 'item-closed', project: CLOSED_PROJECT },
      ]));
      github.graphql.onCall(1).resolves({ deleteProjectV2Item: { deletedItemId: 'item-activities' } });

      await runAddToProjectBot({ github, context: buildContext('unassigned', issue), core });

      expect(github.graphql.callCount).to.equal(2);
      const [mutation, variables] = github.graphql.args[1];
      expect(mutation).to.include('deleteProjectV2Item');
      expect(variables).to.deep.equal({ projectId: ACTIVITIES_PROJECT.id, itemId: 'item-activities' });
    });

    it('does nothing when the issue is on no matching project', async () => {
      github.graphql.onCall(0).resolves(itemsPage([{ id: 'item-roadmap', project: ROADMAP_PROJECT }]));

      await runAddToProjectBot({ github, context: buildContext('unassigned', issue), core });

      expect(github.graphql.callCount).to.equal(1);
      expect(core.info.args[0][0]).to.include('not on any project matching');
    });

    it('paginates through the issue project items', async () => {
      github.graphql.onCall(0).resolves(itemsPage(
        [{ id: 'item-roadmap', project: ROADMAP_PROJECT }],
        { hasNextPage: true, endCursor: 'cursor-1' }
      ));
      github.graphql.onCall(1).resolves(itemsPage([{ id: 'item-activities', project: ACTIVITIES_PROJECT }]));
      github.graphql.onCall(2).resolves({ deleteProjectV2Item: { deletedItemId: 'item-activities' } });

      await runAddToProjectBot({ github, context: buildContext('unassigned', issue), core });

      expect(github.graphql.callCount).to.equal(3);
      expect(github.graphql.args[1][1]).to.include({ cursor: 'cursor-1' });
      expect(github.graphql.args[2][1]).to.deep.equal({ projectId: ACTIVITIES_PROJECT.id, itemId: 'item-activities' });
    });
  });

  it('ignores other issue events', async () => {
    const issue = { number: 42, node_id: 'issue-node-42', assignees: [] };

    await runAddToProjectBot({ github, context: buildContext('labeled', issue), core });

    expect(github.graphql.called).to.equal(false);
    expect(core.info.args[0][0]).to.include('Nothing to do for "labeled" events');
  });
});
