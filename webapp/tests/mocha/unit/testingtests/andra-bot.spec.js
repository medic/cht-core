const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');

const andraBot = require('../../../../../scripts/ci/andra-bot');

const TEMPLATE = fs.readFileSync(
  path.resolve(__dirname, '../../../../../.github/PULL_REQUEST_TEMPLATE.md'),
  'utf8'
);
const COMMENT_MARKER = '<!-- andra-bot -->';
const FAILURE_LABEL = 'Waiting for contributor';
const SUCCESS_LABEL = 'Ready for review';
const MESSAGES_DIR = path.resolve(__dirname, '../../../../../scripts/ci/andra-bot-messages');

// Mirrors the message rendering in andra-bot.js so assertions track the message
// files instead of hardcoding prose that editors are free to change.
const getMessage = (name, replacements = {}) => {
  const template = fs.readFileSync(path.join(MESSAGES_DIR, `${name}.md`), 'utf8').trim();
  return Object
    .entries(replacements)
    .reduce((text, [key, value]) => text.replaceAll(`{{${key}}}`, value), template);
};

const stripComments = (text) => {
  let previous;
  do {
    previous = text;
    text = text.replace(/<!--[\s\S]*?-->/g, '');
  } while (text !== previous);
  return text;
};

const TEMPLATE_SECTIONS = (stripComments(TEMPLATE).match(/^# .+$/gm) || [])
  .map(heading => heading.trim().slice(2))
  .join(', ');

const templateMismatchMessage = () => getMessage('template-mismatch', { sections: TEMPLATE_SECTIONS });

describe('AndraBot', () => {
  let github;
  let core;

  const getPr = (overrides = {}) => ({
    number: 42,
    labels: [],
    draft: false,
    user: { login: 'external-dev', type: 'User' },
    author_association: 'NONE',
    body: TEMPLATE,
    base: { repo: { full_name: 'medic/cht-core' } },
    ...overrides,
  });

  const graphqlCalls = (fragment) => github.graphql.args.filter(([query]) => query.includes(fragment));

  const getContext = (pr) => ({
    repo: { owner: 'medic', repo: 'cht-core' },
    payload: { pull_request: pr },
  });

  const filledTemplate = TEMPLATE
    .replace('<!-- DESCRIPTION -->', 'Fixes the date conversion by using the local format.')
    .replace('<!-- ISSUE NUMBER -->', 'Closes #1234');

  // Same as filledTemplate but with no issue reference at all, for the cases that need a body
  // the closing-keyword fallback cannot resolve.
  const bodyWithoutIssue = TEMPLATE
    .replace('<!-- DESCRIPTION -->', 'Fixes the date conversion by using the local format.')
    .replace('<!-- ISSUE NUMBER -->', 'No issue for this one.');

  const withIssueReference = (reference) => filledTemplate.replace('Closes #1234', reference);

  const linkedIssue = (number, assigneeLogins, repo = 'medic/cht-core') => ({
    number,
    repository: { nameWithOwner: repo, owner: { login: repo.split('/')[0] } },
    assignees: { nodes: assigneeLogins.map(login => ({ login })) },
  });

  const setLinkedIssues = (issues) => {
    github.graphql.resolves({
      repository: { pullRequest: { closingIssuesReferences: { nodes: issues } } },
    });
  };

  // The REST shape returned by issues.get, which the fallback normalizes.
  // GitHub resolves owner/repo case-insensitively, so the stub matches the same way — the
  // action passes through whatever the contributor typed.
  const matchesIssue = (owner, repo, number) => sinon.match(args => {
    return args.owner.toLowerCase() === owner.toLowerCase() &&
      args.repo.toLowerCase() === repo.toLowerCase() &&
      args.issue_number === number;
  });

  const setReferencedIssue = ({ owner = 'medic', repo = 'cht-core', number, assignees = [], isPr = false }) => {
    return github.rest.issues.get
      .withArgs(matchesIssue(owner, repo, number))
      .resolves({ data: {
        number,
        repository_url: `https://api.github.com/repos/${owner}/${repo}`,
        assignees: assignees.map(login => ({ login })),
        ...(isPr ? { pull_request: { url: 'https://api.github.com/pulls/1' } } : {}),
      } });
  };

  const setComments = (comments) => github.paginate
    .withArgs(github.rest.issues.listComments)
    .resolves(comments);

  const setLabels = (names) => github.paginate
    .withArgs(github.rest.issues.listLabelsOnIssue)
    .resolves(names.map(name => ({ name })));

  const run = (pr) => andraBot({ github, context: getContext(pr), core });

  beforeEach(() => {
    github = {
      graphql: sinon.stub(),
      paginate: sinon.stub().resolves([]),
      rest: {
        issues: {
          createComment: sinon.stub().resolves(),
          deleteComment: sinon.stub().resolves(),
          listComments: sinon.stub(),
          listLabelsOnIssue: sinon.stub(),
          addLabels: sinon.stub().resolves(),
          removeLabel: sinon.stub().resolves(),
          // Not found by default; tests that exercise the fallback opt in via setReferencedIssue.
          get: sinon.stub().rejects(Object.assign(new Error('Not Found'), { status: 404 })),
        },
      },
    };
    core = {
      info: sinon.stub(),
      warning: sinon.stub(),
      setFailed: sinon.stub(),
    };
    setLinkedIssues([]);
  });

  afterEach(() => sinon.restore());

  describe('skipping trusted authors', () => {
    ['OWNER', 'MEMBER', 'COLLABORATOR'].forEach(association => {
      it(`should skip checks for ${association} authors`, async () => {
        await run(getPr({ author_association: association }));

        expect(github.graphql.called).to.be.false;
        expect(github.rest.issues.createComment.called).to.be.false;
        expect(core.setFailed.called).to.be.false;
        expect(core.info.calledOnce).to.be.true;
      });
    });

    it('should skip checks for bot authors', async () => {
      await run(getPr({ user: { login: 'dependabot[bot]', type: 'Bot' } }));

      expect(github.graphql.called).to.be.false;
      expect(github.rest.issues.createComment.called).to.be.false;
      expect(core.setFailed.called).to.be.false;
    });

    it('should skip checks for draft PRs', async () => {
      await run(getPr({ draft: true }));

      expect(github.graphql.called).to.be.false;
      expect(github.rest.issues.createComment.called).to.be.false;
      expect(github.rest.issues.addLabels.called).to.be.false;
      expect(core.setFailed.called).to.be.false;
      expect(core.info.calledOnce).to.be.true;
    });
  });

  describe('template check', () => {
    it('should fail for an untouched template', async () => {
      await run(getPr());

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(templateMismatchMessage());
    });

    it('should fail for an empty body', async () => {
      await run(getPr({ body: null }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(templateMismatchMessage());
    });

    it('should fail when a required section is missing', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: filledTemplate.replace('# License', '# Licence') }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(templateMismatchMessage());
    });

    it('should not match headings that are not at the start of a line', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: filledTemplate.replace(/^# /gm, 'some text # ') }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(templateMismatchMessage());
    });

    it('should not match headings inside html comments', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: filledTemplate.replace(/^(# .+)$/gm, '<!-- $1 -->') }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(templateMismatchMessage());
    });

    it('should fail when the sections are out of order', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      const licenseStart = filledTemplate.indexOf('# License');
      const reordered = `${filledTemplate.slice(licenseStart)}\n${filledTemplate.slice(0, licenseStart)}`;
      await run(getPr({ body: reordered }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(templateMismatchMessage());
    });

    it('should fail when a duplicated heading appears before its template position', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: `# Code review checklist\nchecked\n\n${filledTemplate}` }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(templateMismatchMessage());
      expect(commentBody).to.not.contain(getMessage('license-changed'));
    });

    it('should pass when the description is filled in', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: filledTemplate }));

      expect(core.setFailed.called).to.be.false;
    });

    it('should pick up changes to the PR template without script changes', async () => {
      const customTemplate = '# Summary\n<!-- fill me in -->\n\n# Testing\nDescribe the steps taken.\n';
      const realRead = fs.readFileSync;
      sinon.stub(fs, 'readFileSync').callsFake((filePath, ...args) => {
        if (String(filePath).endsWith('PULL_REQUEST_TEMPLATE.md')) {
          return customTemplate;
        }
        return realRead(filePath, ...args);
      });
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);

      await run(getPr({ body: '# Summary\nI did things.\n\n# Testing\nRan the tests.\n' }));
      expect(core.setFailed.called).to.be.false;

      await run(getPr({ body: '# Summary\nI did things.\n' }));
      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('template-mismatch', { sections: 'Summary, Testing' }));
    });
  });

  describe('license check', () => {
    it('should fail when the license text is modified', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: filledTemplate.replace('AGPL-3.0', 'MIT') }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('license-changed'));
      expect(commentBody).to.not.contain(templateMismatchMessage());
    });

    it('should fail when the license section is emptied out', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      const licenseEmptied = filledTemplate.replace(/^The software is provided under AGPL-3.0.*$/m, '');
      await run(getPr({ body: licenseEmptied }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('license-changed'));
    });

    it('should catch a modified license hidden behind a decoy copy in another section', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      const licenseText = stripComments(filledTemplate.slice(filledTemplate.indexOf('# License')));
      const decoyed = filledTemplate
        .replace('AGPL-3.0', 'MIT')
        .replace(
          'Fixes the date conversion by using the local format.',
          `Fixes the date conversion. ${licenseText.replaceAll('\n', ' ')}`
        );
      await run(getPr({ body: decoyed }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('license-changed'));
      expect(commentBody).to.not.contain(templateMismatchMessage());
    });

    it('should fail when a duplicated license section is modified', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: `${filledTemplate}\n# License\nAll rights reserved.\n` }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('license-changed'));
      expect(commentBody).to.not.contain(templateMismatchMessage());
    });

    it('should not report a license change for content appended below the license section', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      const appended = `${filledTemplate}\n\nAdded a screenshot:\n\n![screenshot](http://example.com/s.png)`;
      await run(getPr({ body: appended }));

      expect(core.setFailed.called).to.be.false;
    });

    it('should not report a license change when the whole section is missing', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      const withoutLicense = filledTemplate.slice(0, filledTemplate.indexOf('# License'));
      await run(getPr({ body: withoutLicense }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(templateMismatchMessage());
      expect(commentBody).to.not.contain(getMessage('license-changed'));
    });
  });

  describe('linked issue check', () => {
    it('should fail when no issue is linked', async () => {
      await run(getPr({ body: bodyWithoutIssue }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('missing-linked-issue'));
      expect(commentBody).to.not.contain(templateMismatchMessage());
    });

    it('should query the PR from the event payload', async () => {
      await run(getPr({ body: filledTemplate }));

      const queries = graphqlCalls('closingIssuesReferences');
      expect(queries).to.have.lengthOf(1);
      expect(queries[0][1]).to.deep.equal({
        owner: 'medic',
        repo: 'cht-core',
        number: 42,
        limit: 20,
      });
    });

    it('should count an issue linked from another repo in the same org', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'], 'medic/cht-android')]);
      await run(getPr({ body: filledTemplate }));

      expect(core.setFailed.called).to.be.false;
    });

    it('should not count an issue linked from a repo outside the org', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'], 'external-dev/cht-core')]);
      await run(getPr({ body: bodyWithoutIssue }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('missing-linked-issue'));
    });
  });

  // GitHub only populates closingIssuesReferences for PRs targeting the default branch, so a
  // correctly keyword-linked PR on any other base arrives here with an empty list.
  describe('closing-keyword fallback for non-default-branch PRs', () => {
    it('should accept a keyword-linked issue when GitHub reports no linkage', async () => {
      setReferencedIssue({ number: 1234, assignees: ['external-dev'] });

      await run(getPr({ body: filledTemplate }));

      expect(core.setFailed.called).to.be.false;
      expect(github.rest.issues.get.calledOnceWithExactly({
        owner: 'medic',
        repo: 'cht-core',
        issue_number: 1234,
      })).to.be.true;
    });

    it('should still report the assignee failure for a keyword-linked issue', async () => {
      setReferencedIssue({ number: 1234, assignees: ['someone-else'] });

      await run(getPr({ body: filledTemplate }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('not-assigned', { issueList: '#1234' }));
    });

    ['Closes #1234', 'closes: #1234', 'Fixes #1234', 'resolved #1234'].forEach(reference => {
      it(`should recognise "${reference}"`, async () => {
        setReferencedIssue({ number: 1234, assignees: ['external-dev'] });

        await run(getPr({ body: withIssueReference(reference) }));

        expect(core.setFailed.called).to.be.false;
      });
    });

    it('should recognise an owner/repo#number reference in the same org', async () => {
      setReferencedIssue({ repo: 'cht-android', number: 99, assignees: ['external-dev'] });

      await run(getPr({ body: withIssueReference('Closes medic/cht-android#99') }));

      expect(core.setFailed.called).to.be.false;
    });

    it('should recognise a full issue URL', async () => {
      setReferencedIssue({ repo: 'cht-android', number: 99, assignees: ['external-dev'] });

      await run(getPr({ body: withIssueReference('Closes https://github.com/medic/cht-android/issues/99') }));

      expect(core.setFailed.called).to.be.false;
    });

    it('should ignore a reference to a repo outside the org', async () => {
      await run(getPr({ body: withIssueReference('Closes external-dev/cht-core#1234') }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('missing-linked-issue'));
      // Reaching out to a repo outside the org is itself the thing to avoid, not just an
      // implementation detail — the token has no business reading it.
      expect(github.rest.issues.get.called).to.be.false;
    });

    it('should ignore references inside HTML comments', async () => {
      await run(getPr({ body: withIssueReference('<!-- Closes #1234 -->') }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('missing-linked-issue'));
    });

    it('should ignore the example reference in the unfilled template', async () => {
      // The template's own comment block contains "feat(#1234): add hat wobble"; an empty
      // template must not read as a linked PR.
      setReferencedIssue({ number: 1234, assignees: ['external-dev'] });

      await run(getPr({ body: TEMPLATE }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('missing-linked-issue'));
    });

    it('should ignore a reference that points at a pull request', async () => {
      setReferencedIssue({ number: 1234, assignees: ['external-dev'], isPr: true });

      await run(getPr({ body: filledTemplate }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('missing-linked-issue'));
    });

    it('should ignore a reference to an issue that does not exist', async () => {
      await run(getPr({ body: filledTemplate }));

      expect(github.rest.issues.get.called).to.be.true;
      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('missing-linked-issue'));
    });

    // GitHub owner and repo names are case-insensitive, so a reference that differs only in
    // case is still a valid link and must not be dropped.
    ['Closes Medic/cht-core#1234', 'Closes MEDIC/CHT-Core#1234'].forEach(reference => {
      it(`should accept "${reference}" regardless of case`, async () => {
        setReferencedIssue({ number: 1234, assignees: ['external-dev'] });

        await run(getPr({ body: withIssueReference(reference) }));

        expect(core.setFailed.called).to.be.false;
      });
    });

    it('should report a same-repo issue as #number even when referenced with different case', async () => {
      setReferencedIssue({ number: 1234, assignees: ['someone-else'] });

      await run(getPr({ body: withIssueReference('Closes MEDIC/CHT-Core#1234') }));

      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('not-assigned', { issueList: '#1234' }));
    });

    it('should ignore a reference to an issue that was deleted or transferred', async () => {
      github.rest.issues.get.rejects(Object.assign(new Error('Gone'), { status: 410 }));

      await run(getPr({ body: filledTemplate }));

      expect(github.rest.issues.get.called).to.be.true;
      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('missing-linked-issue'));
    });

    /*
     * Anything other than "the issue is not there" is left to throw, so the job goes red with
     * no comment and no label change and the next synchronize re-runs it. Swallowing these is
     * the one path that could hand a genuinely unlinked PR its Ready for review label.
     */
    describe('when the issue lookup fails for another reason', () => {
      [500, 403].forEach(status => {
        it(`should propagate a ${status.toString()} rather than treat it as unlinked`, async () => {
          const err = Object.assign(new Error('Server Error'), { status });
          github.rest.issues.get.rejects(err);

          await expect(run(getPr({ body: filledTemplate }))).to.be.rejectedWith('Server Error');

          expect(github.rest.issues.createComment.called).to.be.false;
          expect(github.rest.issues.addLabels.called).to.be.false;
          expect(github.rest.issues.removeLabel.called).to.be.false;
        });
      });
    });

    it('should look each referenced issue up only once', async () => {
      setReferencedIssue({ number: 1234, assignees: ['external-dev'] });

      await run(getPr({ body: withIssueReference('Closes #1234, closes #1234') }));

      expect(github.rest.issues.get.calledOnce).to.be.true;
    });

    it('should not fall back when GitHub already reports a linked issue', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);

      await run(getPr({ body: filledTemplate }));

      expect(github.rest.issues.get.called).to.be.false;
      expect(core.setFailed.called).to.be.false;
    });
  });

  describe('labelling', () => {
    it('should add the failure label when checks fail', async () => {
      await run(getPr());

      expect(core.setFailed.calledOnce).to.be.true;
      expect(github.rest.issues.addLabels.calledOnce).to.be.true;
      expect(github.rest.issues.addLabels.args[0][0]).to.deep.equal({
        owner: 'medic',
        repo: 'cht-core',
        issue_number: 42,
        labels: [FAILURE_LABEL],
      });
    });

    it('should swap the success label for the failure label when checks fail', async () => {
      setLabels([SUCCESS_LABEL]);
      await run(getPr());

      expect(core.setFailed.calledOnce).to.be.true;
      expect(github.rest.issues.addLabels.args[0][0].labels).to.deep.equal([FAILURE_LABEL]);
      expect(github.rest.issues.removeLabel.calledOnce).to.be.true;
      expect(github.rest.issues.removeLabel.args[0][0].name).to.equal(SUCCESS_LABEL);
    });

    it('should not add the failure label again when already present', async () => {
      setLabels([FAILURE_LABEL]);
      await run(getPr());

      expect(core.setFailed.calledOnce).to.be.true;
      expect(github.rest.issues.addLabels.called).to.be.false;
    });

    it('should swap the failure label for the success label once all checks pass', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      setLabels([FAILURE_LABEL]);
      await run(getPr({ body: filledTemplate }));

      expect(core.setFailed.called).to.be.false;
      expect(github.rest.issues.addLabels.calledOnce).to.be.true;
      expect(github.rest.issues.addLabels.args[0][0].labels).to.deep.equal([SUCCESS_LABEL]);
      expect(github.rest.issues.removeLabel.calledOnce).to.be.true;
      expect(github.rest.issues.removeLabel.args[0][0]).to.deep.equal({
        owner: 'medic',
        repo: 'cht-core',
        issue_number: 42,
        name: FAILURE_LABEL,
      });
    });

    it('should only add the success label when checks pass on an unlabelled PR', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: filledTemplate }));

      expect(github.rest.issues.addLabels.calledOnce).to.be.true;
      expect(github.rest.issues.addLabels.args[0][0].labels).to.deep.equal([SUCCESS_LABEL]);
      expect(github.rest.issues.removeLabel.called).to.be.false;
    });

    it('should not touch labels when checks pass and the success label is already set', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      setLabels([SUCCESS_LABEL]);
      await run(getPr({ body: filledTemplate }));

      expect(github.rest.issues.addLabels.called).to.be.false;
      expect(github.rest.issues.removeLabel.called).to.be.false;
    });

    it('should read labels from the API rather than the stale event payload', async () => {
      // A re-run replays the payload from before the first run wrote the failure label.
      setLabels([FAILURE_LABEL]);
      await run(getPr({ labels: [] }));

      expect(core.setFailed.calledOnce).to.be.true;
      expect(github.rest.issues.addLabels.called).to.be.false;
    });

    it('should warn and leave labels alone when reading the labels fails', async () => {
      github.paginate.withArgs(github.rest.issues.listLabelsOnIssue).rejects(new Error('boom'));
      await run(getPr());

      expect(core.warning.calledOnce).to.be.true;
      expect(core.warning.args[0][0]).to.contain('boom');
      expect(github.rest.issues.addLabels.called).to.be.false;
      expect(github.rest.issues.removeLabel.called).to.be.false;
      expect(core.setFailed.calledOnce).to.be.true;
    });

    it('should warn but still report the check failures when labelling fails', async () => {
      github.rest.issues.addLabels.rejects(new Error('Label does not exist'));
      await run(getPr());

      expect(core.warning.calledOnce).to.be.true;
      expect(core.warning.args[0][0]).to.contain('Label does not exist');
      expect(core.setFailed.calledOnce).to.be.true;
      expect(core.setFailed.args[0][0]).to.contain('AndraBot checks failed');
      expect(github.rest.issues.createComment.calledOnce).to.be.true;
    });
  });

  describe('assignment check', () => {
    it('should fail when the author is not assigned to the linked issue', async () => {
      setLinkedIssues([linkedIssue(1234, ['someone-else'])]);
      await run(getPr({ body: filledTemplate }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('not-assigned', { issueList: '#1234' }));
    });

    it('should pass when the author is assigned to any of the linked issues', async () => {
      setLinkedIssues([
        linkedIssue(1234, ['someone-else']),
        linkedIssue(5678, ['other', 'external-dev']),
      ]);
      await run(getPr({ body: filledTemplate }));

      expect(core.setFailed.called).to.be.false;
    });

    it('should reference cross-repo issues by their full name', async () => {
      setLinkedIssues([
        linkedIssue(1234, ['someone-else']),
        linkedIssue(5678, ['someone-else'], 'medic/cht-android'),
      ]);
      await run(getPr({ body: filledTemplate }));

      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('not-assigned', { issueList: '#1234, medic/cht-android#5678' }));
    });
  });

  describe('comment management', () => {
    it('should create a single comment listing all failures, addressed to the author', async () => {
      await run(getPr());

      expect(github.rest.issues.createComment.calledOnce).to.be.true;
      const args = github.rest.issues.createComment.args[0][0];
      expect(args).to.deep.include({ owner: 'medic', repo: 'cht-core', issue_number: 42 });
      expect(args.body).to.contain(COMMENT_MARKER);
      expect(args.body).to.contain(getMessage('intro', { author: 'external-dev' }));
      expect(args.body).to.contain(templateMismatchMessage());
      expect(args.body).to.contain(getMessage('missing-linked-issue'));
      expect(args.body).to.contain(getMessage('outro'));
    });

    it('should replace the existing bot comment when the content differs', async () => {
      setComments([
        { id: 7, body: 'a human comment', user: { login: 'external-dev', type: 'User' } },
        { id: 8, body: `${COMMENT_MARKER}\nold bot comment`, user: { login: 'github-actions[bot]', type: 'Bot' } },
      ]);
      await run(getPr());

      expect(github.rest.issues.deleteComment.calledOnce).to.be.true;
      expect(github.rest.issues.deleteComment.args[0][0].comment_id).to.equal(8);
      expect(github.rest.issues.createComment.calledOnce).to.be.true;
      expect(github.rest.issues.createComment.args[0][0].body).to.contain(templateMismatchMessage());
    });

    it('should not delete a user comment containing the comment marker', async () => {
      setComments([
        { id: 7, body: `${COMMENT_MARKER}\nlooks like a bot comment`, user: { login: 'external-dev', type: 'User' } },
      ]);
      await run(getPr());

      expect(github.rest.issues.deleteComment.called).to.be.false;
      expect(github.rest.issues.createComment.calledOnce).to.be.true;
    });

    it('should leave the bot comment alone when the content is unchanged', async () => {
      await run(getPr());
      const body = github.rest.issues.createComment.args[0][0].body;

      github.rest.issues.createComment.resetHistory();
      setComments([{ id: 8, body, user: { login: 'github-actions[bot]', type: 'Bot' } }]);
      await run(getPr());

      expect(github.rest.issues.deleteComment.called).to.be.false;
      expect(github.rest.issues.createComment.called).to.be.false;
      expect(core.setFailed.calledTwice).to.be.true;
    });

    it('should treat stored \\r\\n line endings as unchanged content', async () => {
      await run(getPr());
      const body = github.rest.issues.createComment.args[0][0].body;

      github.rest.issues.createComment.resetHistory();
      setComments([
        { id: 8, body: body.replaceAll('\n', '\r\n'), user: { login: 'github-actions[bot]', type: 'Bot' } },
      ]);
      await run(getPr());

      expect(github.rest.issues.deleteComment.called).to.be.false;
      expect(github.rest.issues.createComment.called).to.be.false;
    });

    it('should replace the bot comment with a success message once all checks pass', async () => {
      setComments([
        { id: 8, body: `${COMMENT_MARKER}\nold bot comment`, user: { login: 'github-actions[bot]', type: 'Bot' } },
      ]);
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: filledTemplate }));

      expect(core.setFailed.called).to.be.false;
      expect(github.rest.issues.deleteComment.calledOnce).to.be.true;
      expect(github.rest.issues.deleteComment.args[0][0].comment_id).to.equal(8);
      expect(github.rest.issues.createComment.calledOnce).to.be.true;
      expect(github.rest.issues.createComment.args[0][0].body)
        .to.contain(getMessage('success', { author: 'external-dev' }));
    });

    it('should not comment at all when checks pass and there is no bot comment', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: filledTemplate }));

      expect(github.rest.issues.createComment.called).to.be.false;
      expect(github.rest.issues.deleteComment.called).to.be.false;
      expect(core.setFailed.called).to.be.false;
    });

    it('should warn but still label and fail the check when posting the comment fails', async () => {
      github.rest.issues.createComment.rejects(new Error('boom'));
      await run(getPr());

      expect(core.warning.calledOnce).to.be.true;
      expect(core.warning.args[0][0]).to.contain('boom');
      expect(github.rest.issues.addLabels.calledOnce).to.be.true;
      expect(core.setFailed.calledOnce).to.be.true;
    });

    it('should not post a comment when deleting the old one fails', async () => {
      setComments([
        { id: 8, body: `${COMMENT_MARKER}\nold bot comment`, user: { login: 'github-actions[bot]', type: 'Bot' } },
      ]);
      github.rest.issues.deleteComment.rejects(new Error('boom'));
      await run(getPr());

      expect(core.warning.calledOnce).to.be.true;
      expect(github.rest.issues.createComment.called).to.be.false;
      expect(core.setFailed.calledOnce).to.be.true;
    });

    it('should keep a passing PR green when replacing the comment with the success message fails', async () => {
      setComments([
        { id: 8, body: `${COMMENT_MARKER}\nold bot comment`, user: { login: 'github-actions[bot]', type: 'Bot' } },
      ]);
      github.rest.issues.createComment.rejects(new Error('boom'));
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      setLabels([FAILURE_LABEL]);
      await run(getPr({ body: filledTemplate }));

      expect(core.warning.calledOnce).to.be.true;
      expect(core.setFailed.called).to.be.false;
      expect(github.rest.issues.addLabels.args[0][0].labels).to.deep.equal([SUCCESS_LABEL]);
      expect(github.rest.issues.removeLabel.args[0][0].name).to.equal(FAILURE_LABEL);
    });
  });

  describe('review follow-ups on #11332', () => {
    it('does not treat a reference inside a code span as a link', async () => {
      setReferencedIssue({ number: 1234, assignees: ['external-dev'] });

      await run(getPr({ body: withIssueReference('Write `Closes #1234` in the description.') }));

      expect(github.rest.issues.get.called).to.be.false;
      expect(core.setFailed.calledOnce).to.be.true;
      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('missing-linked-issue'));
    });

    it('does not treat a reference inside a fenced block as a link', async () => {
      setReferencedIssue({ number: 1234, assignees: ['external-dev'] });
      const body = withIssueReference('Example:\n\n```\nCloses #1234\n```');

      await run(getPr({ body }));

      expect(github.rest.issues.get.called).to.be.false;
      expect(core.setFailed.calledOnce).to.be.true;
    });

    it('reads the body when the linked issue is assigned to someone else', async () => {
      // A sidebar-linked epic fills closingIssuesReferences on any base branch. Short-
      // circuiting on it would hide the contributor's own keyword link behind a failure
      // they cannot clear.
      setLinkedIssues([linkedIssue(999, ['someone-else'])]);
      setReferencedIssue({ number: 1234, assignees: ['external-dev'] });

      await run(getPr({ body: filledTemplate }));

      expect(github.rest.issues.get.called).to.be.true;
      expect(core.setFailed.called).to.be.false;
    });

    it('lists an issue once when both sources name it', async () => {
      setLinkedIssues([linkedIssue(1234, ['someone-else'])]);
      setReferencedIssue({ number: 1234, assignees: ['someone-else'] });

      await run(getPr({ body: filledTemplate }));

      const commentBody = github.rest.issues.createComment.args[0][0].body;
      expect(commentBody).to.contain(getMessage('not-assigned', { issueList: '#1234' }));
    });

    it('does not bind a keyword across a newline', async () => {
      await run(getPr({ body: withIssueReference('Closes\n#1234') }));

      expect(github.rest.issues.get.called).to.be.false;
      expect(core.setFailed.calledOnce).to.be.true;
    });

    ['Closes #01234', 'Closes #99999999999999999999999'].forEach(reference => {
      it(`ignores the malformed number in "${reference}"`, async () => {
        await run(getPr({ body: withIssueReference(reference) }));

        expect(github.rest.issues.get.called).to.be.false;
        expect(core.setFailed.calledOnce).to.be.true;
      });
    });

    it('ignores a repo name made only of dots', async () => {
      await run(getPr({ body: withIssueReference('Closes medic/..#1234') }));

      expect(github.rest.issues.get.called).to.be.false;
      expect(core.setFailed.calledOnce).to.be.true;
    });

    // Each of these is a body whose issue link is genuine but which an over-eager code
    // stripper discarded, failing a contributor with no way to clear it — the link they are
    // told to add is the link already there. Only a fence that is actually closed delimits a
    // block, so an unpaired marker cannot reach past itself to swallow any of them.
    [
      ['an unbalanced <!-- inside a fenced block', '```xml\n<instance> <!-- see docs\n</instance>\n```'],
      ['a fence marker whose info string holds backticks', '```bash npm test```'],
      ['an unpaired fence marker', 'How to link:\n\n```'],
      ['a ~~~ marker that only backticks follow', '~~~\nsample\n```'],
    ].forEach(([name, sample]) => {
      it(`still passes a PR whose link follows ${name}`, async () => {
        setReferencedIssue({ number: 1234, assignees: ['external-dev'] });

        await run(getPr({ body: withIssueReference(`${sample}\n\nCloses #1234`) }));

        expect(core.setFailed.called).to.be.false;
        expect(github.rest.issues.addLabels.args[0][0].labels).to.deep.equal([SUCCESS_LABEL]);
      });
    });

    it('still passes a PR whose link sits between markers of unequal length', async () => {
      setReferencedIssue({ number: 1234, assignees: ['external-dev'] });
      // A closing fence is at least as long as its opener, so these two do not pair and the
      // line between them is ordinary prose. Letting the opening run be retried shorter finds
      // a pair anyway and deletes the link — and costs a rescan of the line per candidate
      // length, which is what makes a body of backticks quadratic.

      await run(getPr({ body: withIssueReference('`````\nCloses #1234\n```') }));

      expect(core.setFailed.called).to.be.false;
      expect(github.rest.issues.addLabels.args[0][0].labels).to.deep.equal([SUCCESS_LABEL]);
    });

    it('still passes a PR whose body reaches GitHub\'s size limit', async () => {
      setReferencedIssue({ number: 1234, assignees: ['external-dev'] });
      // Two 32k path segments either side of a `/`, and deliberately *no* trailing `#number`:
      // the cost is in the failed match, so a reference that resolves never reaches it. A
      // repo-name pattern requiring a non-dot character (`[\w.-]*[\w-][\w.-]*`) lets its two
      // quantifiers divide that run between them, which is cubic — ~29s at 8k, and hours at
      // the 65536-character body limit this sits just inside, on a pull_request_target body
      // re-parsed on every edit. The keyword cannot bind across the newline, so this stays a
      // failed match. Mocha's own timeout cannot fire on a blocked event loop, so the process
      // watchdog is the real assertion; the linear form returns in about a millisecond.
      const segment = 'a'.repeat(32000);

      await run(getPr({ body: withIssueReference(`Closes ${segment}/${segment}\n\nCloses #1234`) }));

      expect(core.setFailed.called).to.be.false;
      expect(github.rest.issues.addLabels.args[0][0].labels).to.deep.equal([SUCCESS_LABEL]);
    });

    it('does not splice prose either side of a removed span into a reference', async () => {
      setReferencedIssue({ number: 1234, assignees: ['external-dev'] });

      await run(getPr({ body: 'This does not fix `anything` #1234 related.' }));

      expect(github.rest.issues.get.called).to.be.false;
      expect(core.setFailed.calledOnce).to.be.true;
    });

    it('still finds a real link when an unbalanced backtick appears above it', async () => {
      // One stray backtick used to pair with the next one anywhere below and delete the
      // reference in between — a false failure the contributor could not clear.
      setReferencedIssue({ number: 1234, assignees: ['external-dev'] });
      const body = filledTemplate.replace(
        'Fixes the date conversion by using the local format.',
        'Switch to `Intl.DateTimeFormat for parsing.'
      );

      await run(getPr({ body }));

      expect(github.rest.issues.get.called).to.be.true;
      expect(core.setFailed.called).to.be.false;
    });

    it('warns rather than silently dropping references past the limit', async () => {
      const refs = Array.from({ length: 22 }, (_, i) => `Closes #${(i + 1).toString()}`).join(' ');
      github.rest.issues.get.rejects(Object.assign(new Error('Not Found'), { status: 404 }));

      await run(getPr({ body: withIssueReference(refs) }));

      expect(github.rest.issues.get.callCount).to.equal(20);
      expect(core.warning.args.some(([msg]) => msg.includes('2 later reference(s) were ignored')))
        .to.be.true;
    });
  });
});
