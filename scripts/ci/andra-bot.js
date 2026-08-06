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
    // the section isn't found, is out of template order, or has no content
    if (index < bodySectionIndex || !bodySections[index].content.length) {
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

  // missing section is already covered by the section check. License is the template's
  // last section, so in the body it absorbs anything the contributor writes below it
  // (screenshots, notes) — trailing content is fine as long as the license text itself
  // is intact, so only the start of the section has to match.
  const bodyLicenseSections = parseSections(prBody)
    .filter(section => section.heading === templateLicenseSection.heading);
  return bodyLicenseSections.every(section => section.content.startsWith(templateLicenseSection.content));
};

const MAX_LINKED_ISSUES = 20;

// GitHub's documented closing keywords, and the three reference forms they accept:
// `#123`, `owner/repo#123`, and a full issue URL.
// https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue
const CLOSING_KEYWORDS = 'close[sd]?|fix(?:e[sd])?|resolve[sd]?';
const REPO_NAME = '[\\w.-]+';
const CLOSING_REFERENCE_REGEX = new RegExp(
  `\\b(?:${CLOSING_KEYWORDS})\\b\\s*:?\\s+` +
  `(?:https?://github\\.com/(${REPO_NAME})/(${REPO_NAME})/issues/(\\d+)` +
  `|(?:(${REPO_NAME})/(${REPO_NAME}))?#(\\d+))`,
  'gi'
);

// GitHub only populates closingIssuesReferences from keywords when the PR targets the
// repository's default branch; on any other base the field is empty even though the
// contributor linked the issue correctly. Parsing the body covers that case.
const parseClosingReferences = (body, context) => {
  const matches = stripComments(body || '').matchAll(CLOSING_REFERENCE_REGEX);
  const references = [...matches].map(([, urlOwner, urlRepo, urlNumber, owner, repo, number]) => ({
    owner: urlOwner || owner || context.repo.owner,
    repo: urlRepo || repo || context.repo.repo,
    number: Number(urlNumber || number),
  }));

  // Owner and repo names are case-insensitive on GitHub, so the key is too.
  const seen = new Set();
  return references.filter(reference => {
    const key = `${reference.owner}/${reference.repo}#${reference.number.toString()}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

// Shapes a REST issue like a closingIssuesReferences node so the callers can't tell them apart.
// The names come from repository_url where possible, so they carry GitHub's canonical casing
// rather than whatever the contributor typed.
const toIssueNode = (issue, reference) => {
  const [, owner, repo] = /\/repos\/([^/]+)\/([^/]+)$/.exec(issue.repository_url || '') || [];
  const nameWithOwner = `${owner || reference.owner}/${repo || reference.repo}`;
  return {
    number: issue.number,
    repository: { nameWithOwner, owner: { login: owner || reference.owner } },
    assignees: { nodes: (issue.assignees || []).map(assignee => ({ login: assignee.login })) },
  };
};

// A referenced issue that genuinely does not exist is not a link. Any other failure means we
// could not tell, and blaming the contributor for that is the very false-fail this check is
// meant to avoid — so those are reported separately rather than folded into "not linked".
const resolveReferencedIssues = async (github, context, core, references) => {
  let inconclusive = false;
  const issues = await Promise.all(references.map(async (reference) => {
    const name = `${reference.owner}/${reference.repo}#${reference.number.toString()}`;
    try {
      const { data } = await github.rest.issues.get({
        owner: reference.owner,
        repo: reference.repo,
        issue_number: reference.number,
      });
      // A pull request is also an issue on this endpoint, but referencing one is not a link.
      return data.pull_request ? null : toIssueNode(data, reference);
    } catch (err) {
      if (err.status === 404) {
        core.info(`Ignoring referenced issue ${name}: not found.`);
      } else {
        inconclusive = true;
        core.warning(`Could not read referenced issue ${name}: ${err.message}`);
      }
      return null;
    }
  }));
  return { issues: issues.filter(Boolean), inconclusive };
};

const getLinkedIssues = async (github, context, core) => {
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
  const isInOrg = owner => owner.toLowerCase() === context.repo.owner.toLowerCase();
  const linkedIssues = result.repository.pullRequest.closingIssuesReferences.nodes
    .filter(issue => isInOrg(issue.repository.owner.login));
  if (linkedIssues.length) {
    return { issues: linkedIssues, inconclusive: false };
  }

  const references = parseClosingReferences(context.payload.pull_request.body, context)
    .filter(reference => isInOrg(reference.owner))
    .slice(0, MAX_LINKED_ISSUES);
  if (!references.length) {
    return { issues: [], inconclusive: false };
  }
  return resolveReferencedIssues(github, context, core, references);
};

const getLinkedIssueFailure = (pr, linkedIssues) => {
  if (!linkedIssues.length) {
    return getMessage('missing-linked-issue');
  }
  const isAssigned = linkedIssues
    .some(issue => issue.assignees.nodes.some(assignee => assignee.login === pr.user.login));
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

const getFailures = async (github, context, core) => {
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

  const { issues: linkedIssues, inconclusive } = await getLinkedIssues(github, context, core);
  if (inconclusive && !linkedIssues.length) {
    // Failing the PR here would blame the contributor for a GitHub outage. The warning keeps
    // the run visible without stranding a correctly-linked PR behind an infrastructure blip.
    core.warning('Could not verify the linked issue, skipping that check.');
    return failures;
  }

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
const syncComment = async (github, context, core, { existingComment, body }) => {
  if (existingComment && sameContent(existingComment.body, body)) {
    return;
  }
  try {
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
  } catch (err) {
    core.warning(`Could not update the AndraBot comment: ${err.message}`);
  }
};

// Labels are read from the API rather than the event payload: a re-run (or a run
// superseded within seconds) replays a stale label snapshot, which would strand one
// label of the pair on the PR.
const getCurrentLabels = async (github, context, core) => {
  try {
    const labels = await github.paginate(github.rest.issues.listLabelsOnIssue, {
      ...context.repo,
      issue_number: context.payload.pull_request.number,
      per_page: 100,
    });
    return new Set(labels.map(label => label.name));
  } catch (err) {
    core.warning(`Could not read the PR labels: ${err.message}`);
    return null;
  }
};

const addLabel = async (github, context, core, name) => {
  try {
    await github.rest.issues.addLabels({
      ...context.repo,
      issue_number: context.payload.pull_request.number,
      labels: [name],
    });
  } catch (err) {
    // The check outcome stands either way — warn instead of masking the check results.
    core.warning(`Could not add the "${name}" label: ${err.message}`);
  }
};

const removeLabel = async (github, context, core, name) => {
  try {
    await github.rest.issues.removeLabel({
      ...context.repo,
      issue_number: context.payload.pull_request.number,
      name,
    });
  } catch (err) {
    core.warning(`Could not remove the "${name}" label: ${err.message}`);
  }
};

const swapLabels = async (github, context, core, { add, remove }) => {
  const currentLabels = await getCurrentLabels(github, context, core);
  if (!currentLabels) {
    return;
  }
  if (!currentLabels.has(add)) {
    await addLabel(github, context, core, add);
  }
  if (currentLabels.has(remove)) {
    await removeLabel(github, context, core, remove);
  }
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

  const failures = await getFailures(github, context, core);
  const existingComment = await findExistingComment(github, context);

  if (!failures.length) {
    if (existingComment) {
      const body = `${COMMENT_MARKER}\n${getMessage('success', { author: pr.user.login })}`;
      await syncComment(github, context, core, { existingComment, body });
    }
    await swapLabels(github, context, core, { add: SUCCESS_LABEL, remove: FAILURE_LABEL });
    core.info('All AndraBot checks passed.');
    return;
  }

  await syncComment(github, context, core, { existingComment, body: buildCommentBody(pr, failures) });
  await swapLabels(github, context, core, { add: FAILURE_LABEL, remove: SUCCESS_LABEL });
  core.setFailed(`AndraBot checks failed:\n- ${failures.join('\n- ')}`);
};

module.exports = runAndraBot;
