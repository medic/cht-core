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
  .map(heading => `\`${heading.trim().slice(2)}\``)
  .join(', ');

const templateMismatchMessage = () => getMessage('template-mismatch', { sections: TEMPLATE_SECTIONS });

describe('AndraBot', () => {
  let github;
  let core;

  const getPr = (overrides = {}) => ({
    number: 42,
    labels: [],
    user: { login: 'external-dev', type: 'User' },
    author_association: 'NONE',
    body: TEMPLATE,
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

  const linkedIssue = (number, assigneeLogins) => ({
    number,
    assignees: { nodes: assigneeLogins.map(login => ({ login })) },
  });

  const setLinkedIssues = (issues) => {
    github.graphql.resolves({
      repository: { pullRequest: { closingIssuesReferences: { nodes: issues } } },
    });
  };

  const run = (pr) => andraBot({ github, context: getContext(pr), core });

  beforeEach(() => {
    github = {
      graphql: sinon.stub(),
      paginate: sinon.stub().resolves([]),
      rest: {
        issues: {
          createComment: sinon.stub().resolves(),
          updateComment: sinon.stub().resolves(),
          listComments: sinon.stub(),
          addLabels: sinon.stub().resolves(),
          removeLabel: sinon.stub().resolves(),
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
      expect(commentBody).to.contain(getMessage('template-mismatch', { sections: '`Summary`, `Testing`' }));
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
      await run(getPr({ body: filledTemplate }));

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
      });
    });
  });

  describe('labelling', () => {
    const FAILURE_LABEL = 'Waiting for contributor';
    const SUCCESS_LABEL = 'Ready for review';

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
      await run(getPr({ labels: [{ name: SUCCESS_LABEL }] }));

      expect(core.setFailed.calledOnce).to.be.true;
      expect(github.rest.issues.addLabels.args[0][0].labels).to.deep.equal([FAILURE_LABEL]);
      expect(github.rest.issues.removeLabel.calledOnce).to.be.true;
      expect(github.rest.issues.removeLabel.args[0][0].name).to.equal(SUCCESS_LABEL);
    });

    it('should not add the failure label again when already present', async () => {
      await run(getPr({ labels: [{ name: FAILURE_LABEL }] }));

      expect(core.setFailed.calledOnce).to.be.true;
      expect(github.rest.issues.addLabels.called).to.be.false;
    });

    it('should swap the failure label for the success label once all checks pass', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: filledTemplate, labels: [{ name: FAILURE_LABEL }] }));

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
      await run(getPr({ body: filledTemplate, labels: [{ name: SUCCESS_LABEL }] }));

      expect(github.rest.issues.addLabels.called).to.be.false;
      expect(github.rest.issues.removeLabel.called).to.be.false;
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

    it('should update the existing bot comment instead of creating a new one', async () => {
      github.paginate.resolves([
        { id: 7, body: 'a human comment' },
        { id: 8, body: `${COMMENT_MARKER}\nold bot comment` },
      ]);
      await run(getPr());

      expect(github.rest.issues.createComment.called).to.be.false;
      expect(github.rest.issues.updateComment.calledOnce).to.be.true;
      expect(github.rest.issues.updateComment.args[0][0].comment_id).to.equal(8);
    });

    it('should update the bot comment with a success message once all checks pass', async () => {
      github.paginate.resolves([{ id: 8, body: `${COMMENT_MARKER}\nold bot comment` }]);
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: filledTemplate }));

      expect(core.setFailed.called).to.be.false;
      expect(github.rest.issues.createComment.called).to.be.false;
      expect(github.rest.issues.updateComment.calledOnce).to.be.true;
      expect(github.rest.issues.updateComment.args[0][0].body)
        .to.contain(getMessage('success', { author: 'external-dev' }));
    });

    it('should not comment at all when checks pass and there is no bot comment', async () => {
      setLinkedIssues([linkedIssue(1234, ['external-dev'])]);
      await run(getPr({ body: filledTemplate }));

      expect(github.rest.issues.createComment.called).to.be.false;
      expect(github.rest.issues.updateComment.called).to.be.false;
      expect(core.setFailed.called).to.be.false;
    });
  });
});
