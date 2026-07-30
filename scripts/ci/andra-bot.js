/**
 * AndraBot: PR checks for external contributions, run by .github/workflows/andra-bot.yml via actions/github-script.
 *
 * For PRs opened by external contributors it checks that:
 * - the PR description follows the pull request template
 * - the PR is linked to an issue (closing keyword or the "Development" sidebar)
 * - the PR author is assigned to the linked issue
 * and posts a single comment listing anything that needs fixing, replaced whenever its
 * content changes so the author is notified (comment edits are silent). The PR is
 * labeled with FAILURE_LABEL while checks fail and SUCCESS_LABEL once they all pass.
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

const HEADING_PREFIX = '# ';
const HEADING_REGEX = new RegExp(`^${HEADING_PREFIX}.+$`, 'gm');

const parseSections = (text) => {
  text = stripComments(text);
  const headings = [...text.matchAll(HEADING_REGEX)];
  return headings.map((match, index) => ({
    heading: match[0].trim().replace(HEADING_PREFIX, ''),
    content: normalize(text.slice(match.index + match[0].length, headings[index + 1]?.index)),
  }));
};

const getHeadings = (template) => parseSections(template).map(section => section.heading);

const normalize = (text) => text.replace(/\s+/g, ' ').trim();

// The body must contain every template heading, in the template's order, each with
// non-empty content (placeholder comments don't count as content).
const matchesTemplate = (prBody, template) => {
  if (!prBody) {
    return false;
  }
  const bodySections = parseSections(prBody);
  const templateSections = parseSections(template);

  let bodySectionIndex = 0;
  for (const templateSection of templateSections) {
    const index = bodySections.findIndex(section => section.heading === templateSection.heading);
    if (index < bodySectionIndex) {
      // section isn't found, or is out of template order
      return false;
    }

    if (!bodySections[index].content.length) {
      return false;
    }

    bodySectionIndex = index + 1;
  }
  return true;
};

const matchesLicense = (prBody, template) => {
  const templateLicenseSection = parseSections(template).find(section => /license/i.test(section.heading));
  if (!templateLicenseSection || !prBody) {
    return true;
  }

  // missing section is already covered by the section check
  const bodyLicenseSections = parseSections(prBody)
    .filter(section => section.heading === templateLicenseSection.heading);
  return bodyLicenseSections.every(section => normalize(section.content) === templateLicenseSection.content);
};

const getLinkedIssues = async (github, context) => {
  const query = `
    query ($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          closingIssuesReferences(first: 20) {
            nodes {
              number
              repository {
                nameWithOwner
                owner { login }
              }
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
  // Issues linked from repositories outside the org don't count as linked.
  return result.repository.pullRequest.closingIssuesReferences.nodes.filter(
    issue => issue.repository.owner.login === context.repo.owner
  );
};

const getLinkedIssueFailure = (pr, linkedIssues) => {
  if (!linkedIssues.length) {
    return getMessage('missing-linked-issue');
  }
  const isAssigned = linkedIssues
    .find(issue => issue.assignees.nodes.find(assignee => assignee.login === pr.user.login));
  if (isAssigned) {
    return null;
  }

  const issueList = linkedIssues
    .map(issue => issue.repository.nameWithOwner === pr.base.repo.full_name
      ? `#${issue.number}`
      : `${issue.repository.nameWithOwner}#${issue.number}`)
    .join(', ');
  return getMessage('not-assigned', { issueList });
};

const getFailures = async (github, context) => {
  const pr = context.payload.pull_request;
  const failures = [];

  const template = readPrTemplate();
  if (!matchesTemplate(pr.body, template)) {
    const sections = getHeadings(template).join(', ');
    failures.push(getMessage('template-mismatch', { sections }));
  }
  if (!matchesLicense(pr.body, template)) {
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
  return comments.find(
    comment => comment.user?.type === 'Bot' && comment.body?.includes(COMMENT_MARKER)
  );
};

const runAndraBot = async ({ github, context, core }) => {
  const pr = context.payload.pull_request;

  if (pr.user.type === 'Bot' || TRUSTED_ASSOCIATIONS.has(pr.author_association)) {
    core.info(`Skipping AndraBot checks for ${pr.user.login} (${pr.author_association}).`);
    return;
  }

  if (pr.draft) {
    core.info(`Skipping AndraBot checks for draft PR #${pr.number}.`);
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
