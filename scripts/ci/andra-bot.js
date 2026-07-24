/**
 * AndraBot: PR checks for external contributions, run by .github/workflows/andra-bot.yml via actions/github-script.
 *
 * For PRs opened by external contributors it checks that:
 * - the PR description follows the pull request template
 * - the PR is linked to an issue (closing keyword or the "Development" sidebar)
 * - the PR author is assigned to the linked issue
 * and posts a single comment listing anything that needs fixing, replaced whenever its
 * content changes so the author is notified (comment edits are silent). The PR is
 * labelled with FAILURE_LABEL while checks fail and SUCCESS_LABEL once they all pass.
 *
 * The message texts live in ./andra-bot-messages/ so they can be edited without touching this script.
 */

const fs = require('node:fs');
const path = require('node:path');

const COMMENT_MARKER = '<!-- andra-bot -->';
const FAILURE_LABEL = 'Waiting for contributor';
const SUCCESS_LABEL = 'Ready for review';
const TRUSTED_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
const MESSAGES_DIR = path.join(__dirname, 'andra-bot-messages');
const PR_TEMPLATE_PATH = path.join(__dirname, '..', '..', '.github', 'PULL_REQUEST_TEMPLATE.md');

const getMessage = (name, replacements = {}) => {
  const template = fs.readFileSync(path.join(MESSAGES_DIR, `${name}.md`), 'utf8').trim();
  return Object
    .entries(replacements)
    .reduce((text, [key, value]) => text.replaceAll(`{{${key}}}`, value), template);
};

const readPrTemplate = () => fs.readFileSync(PR_TEMPLATE_PATH, 'utf8');

// Strips repeatedly so removals can't splice new comment markers together
// (e.g. `<!-<!-- x -->- y -->`); also keeps CodeQL's sanitization check happy.
const stripComments = (text) => {
  let previous;
  do {
    previous = text;
    text = text.replace(/<!--[\s\S]*?-->/g, '');
  } while (text !== previous);
  return text;
};

const getHeadings = (template) => {
  const headings = stripComments(template).match(/^# .+$/gm) || [];
  return headings.map(heading => heading.trim());
};

const getSection = (body, heading) => {
  const start = body.indexOf(heading);
  if (start === -1) {
    return null;
  }
  const rest = body.slice(start + heading.length);
  const nextHeading = rest.search(/^# /m);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
};

const normalize = (text) => stripComments(text).replace(/\s+/g, ' ').trim();

// A section that is empty in the template (placeholder comments only, like Description)
// must be filled in by the author; pre-filled sections only need to be present.
const matchesTemplate = (body, template) => {
  if (!body) {
    return false;
  }
  return getHeadings(template).every(heading => {
    const section = getSection(body, heading);
    if (section === null) {
      return false;
    }
    return normalize(getSection(template, heading)) ? true : normalize(section).length > 0;
  });
};

const licenseUnchanged = (body, template) => {
  const licenseHeading = getHeadings(template).find(heading => /license/i.test(heading));
  if (!licenseHeading || !body) {
    return true;
  }
  const section = getSection(body, licenseHeading);
  if (section === null) {
    return true; // the missing heading is already reported by the template check
  }
  return normalize(section) === normalize(getSection(template, licenseHeading));
};

const getLinkedIssues = async (github, context) => {
  const query = `
    query ($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          closingIssuesReferences(first: 20) {
            nodes {
              number
              assignees(first: 20) {
                nodes { login }
              }
            }
          }
        }
      }
    }`;
  const result = await github.graphql(query, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    number: context.payload.pull_request.number,
  });
  return result.repository.pullRequest.closingIssuesReferences.nodes;
};

const getLinkedIssueFailure = (pr, linkedIssues) => {
  if (!linkedIssues.length) {
    return getMessage('missing-linked-issue');
  }
  const isAssigned = linkedIssues.some(
    issue => issue.assignees.nodes.some(assignee => assignee.login === pr.user.login)
  );
  if (isAssigned) {
    return null;
  }
  const issueList = linkedIssues.map(issue => `#${issue.number}`).join(', ');
  return getMessage('not-assigned', { issueList });
};

const getFailures = async (github, context) => {
  const pr = context.payload.pull_request;
  const failures = [];

  const template = readPrTemplate();
  if (!matchesTemplate(pr.body, template)) {
    const sections = getHeadings(template).map(heading => `\`${heading.slice(2)}\``).join(', ');
    failures.push(getMessage('template-mismatch', { sections }));
  }
  if (!licenseUnchanged(pr.body, template)) {
    failures.push(getMessage('license-changed'));
  }

  const linkedIssues = await getLinkedIssues(github, context);
  const linkedIssueFailure = getLinkedIssueFailure(pr, linkedIssues);
  if (linkedIssueFailure) {
    failures.push(linkedIssueFailure);
  }

  return failures;
};

const buildCommentBody = (pr, failures) => {
  const intro = getMessage('intro', { author: pr.user.login });
  const items = failures.map(failure => `- ${failure}`).join('\n');
  const outro = getMessage('outro');
  return `${COMMENT_MARKER}\n${intro}\n\n${items}\n\n${outro}`;
};

// GitHub may store comment bodies with \r\n line endings, so normalize before comparing.
const sameContent = (a, b) => a.replaceAll('\r\n', '\n').trim() === b.replaceAll('\r\n', '\n').trim();

// Editing a comment does not notify the PR author, so when the content changes the old
// comment is deleted and a new one is posted instead. Identical content is left alone.
const syncComment = async (github, context, existingComment, body) => {
  if (existingComment && sameContent(existingComment.body, body)) {
    return;
  }
  if (existingComment) {
    await github.rest.issues.deleteComment({
      ...context.repo,
      comment_id: existingComment.id,
    });
  }
  await github.rest.issues.createComment({
    ...context.repo,
    issue_number: context.payload.pull_request.number,
    body,
  });
};

const hasLabel = (pr, name) => pr.labels.some(label => label.name === name);

const addLabel = async (github, context, core, name) => {
  const pr = context.payload.pull_request;
  if (hasLabel(pr, name)) {
    return;
  }
  try {
    await github.rest.issues.addLabels({
      ...context.repo,
      issue_number: pr.number,
      labels: [name],
    });
  } catch (err) {
    // The check outcome stands either way — warn instead of masking the check results.
    core.warning(`Could not add the "${name}" label: ${err.message}`);
  }
};

const removeLabel = async (github, context, core, name) => {
  const pr = context.payload.pull_request;
  if (!hasLabel(pr, name)) {
    return;
  }
  try {
    await github.rest.issues.removeLabel({
      ...context.repo,
      issue_number: pr.number,
      name,
    });
  } catch (err) {
    core.warning(`Could not remove the "${name}" label: ${err.message}`);
  }
};

const swapLabels = async (github, context, core, { add, remove }) => {
  await addLabel(github, context, core, add);
  await removeLabel(github, context, core, remove);
};

const findExistingComment = async (github, context) => {
  const comments = await github.paginate(github.rest.issues.listComments, {
    ...context.repo,
    issue_number: context.payload.pull_request.number,
    per_page: 100,
  });
  return comments.find(comment => comment.body?.includes(COMMENT_MARKER));
};

const runAndraBot = async ({ github, context, core }) => {
  const pr = context.payload.pull_request;

  if (pr.user.type === 'Bot' || TRUSTED_ASSOCIATIONS.has(pr.author_association)) {
    core.info(`Skipping AndraBot checks for ${pr.user.login} (${pr.author_association}).`);
    return;
  }

  const failures = await getFailures(github, context);
  const existingComment = await findExistingComment(github, context);

  if (!failures.length) {
    if (existingComment) {
      const body = `${COMMENT_MARKER}\n${getMessage('success', { author: pr.user.login })}`;
      await syncComment(github, context, existingComment, body);
    }
    await swapLabels(github, context, core, { add: SUCCESS_LABEL, remove: FAILURE_LABEL });
    core.info('All AndraBot checks passed.');
    return;
  }

  await syncComment(github, context, existingComment, buildCommentBody(pr, failures));
  await swapLabels(github, context, core, { add: FAILURE_LABEL, remove: SUCCESS_LABEL });
  core.setFailed(`AndraBot checks failed:\n- ${failures.join('\n- ')}`);
};

module.exports = runAndraBot;
