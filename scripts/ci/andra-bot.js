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

// Only a fence that is actually closed delimits a block. An opener with no matching close
// matches nothing and so strips nothing, which is what keeps this bounded: the alternative —
// running an unclosed fence to the end of the document, as a renderer does — means one
// misread line silently discards every reference below it, and the contributor cannot tell
// why the link they wrote is not being seen. The failure directions are not equal. Reading
// code as prose lets a PR that only *documents* a link past a check that still requires the
// author be assigned to that issue; reading prose as code blocks a real contributor with no
// way to clear it. Everything ambiguous here is therefore resolved toward stripping less.
//
// That asymmetry is also why no CommonMark subtleties are encoded: an info string with a
// backtick (``` ```sh make test``` ```, an inline span, not a block), a four-space indent
// making a fence literal, a close carrying its own info string. Each would only ever cause
// this to strip *more*, and unpaired markers already strip nothing.
const FENCED_BLOCK_REGEX = /^ {0,3}(```+|~~~+)[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$/gm;
const CODE_SPAN_REGEX = /(`+)[^`\n]*?\1/g;
const COMMENT_REGEX = /<!--[\s\S]*?-->/g;
// Carries no comment marker and starts no heading, but is not empty.
const CODE_BLOCK_PLACEHOLDER = '\ncode\n';

// GitHub does not linkify inside comments or code, so neither should the fallback: a body
// that merely documents the syntax must not read as a link.
//
// The order is load-bearing. A `<!--` inside a fenced block is literal and closes nothing, so
// blocks go first; stripping comments first let such a marker pair with the next `-->` below
// it — in practice the PR template's own — and delete the issue link in between. An XML or
// HTML sample in a cht-core PR body makes that an ordinary body, not a contrived one.
//
// Every removal leaves a newline behind. Deleting outright splices the prose either side
// together, so `does not fix ` + `#1234` reads as a reference; a space doesn't help since
// the closing-reference regex spans those. A newline is the one separator it won't cross.
//
// One pass over comments is enough here, unlike stripComments above: that one loops because
// deleting can splice a new marker out of the remains (`<!-<!-- x -->- y -->`), and the
// newline left behind is what stops that.
const stripNonProse = (text) => text
  .replace(FENCED_BLOCK_REGEX, '\n')
  .replace(CODE_SPAN_REGEX, '\n')
  .replace(COMMENT_REGEX, '\n');

const HEADING_PREFIX = '# ';
const HEADING_REGEX = new RegExp(`^${HEADING_PREFIX}.+$`, 'gm');

const parseSections = (text) => {
  // A fenced block's content is literal, so neither the `<!--` of an XML sample nor the `#` of
  // a shell one means anything here — but left in place the first pairs with the template's
  // next `-->` and swallows a heading, and the second reads as one. Reducing each block to a
  // placeholder keeps both out of the scan while still counting as content, so a section
  // filled only with a code sample is not then judged empty.
  text = stripComments(text.replace(FENCED_BLOCK_REGEX, CODE_BLOCK_PLACEHOLDER));
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
const PATH_SEGMENT_REGEX = /^\.+$/;
// Kept unambiguous. Splitting this to require a non-dot character (`[\w.-]*[\w-][\w.-]*`)
// makes the two quantifiers able to divide a word run between them; with two names either
// side of a `/` the failure path is cubic, and a 65KB body — the API's own limit — takes
// hours rather than the 29ms this does. `..` is rejected after parsing instead.
const REPO_NAME = String.raw`[\w.-]+`;
// `:?[^\S\n]+` rather than `\s*:?\s+`: the latter is ambiguous between its two
// whitespace quantifiers and backtracks quadratically on a long run of spaces
// (~4s at GitHub's 65536 body limit, re-run on every `edited` event). Excluding
// newlines also stops a keyword ending one line binding to a `#N` on the next,
// which GitHub does not link.
const CLOSING_REFERENCE_REGEX = new RegExp(
  String.raw`\b(?:${CLOSING_KEYWORDS})\b:?[^\S\n]+` +
  String.raw`(?:https?://github\.com/(${REPO_NAME})/(${REPO_NAME})/issues/(\d+)` +
  String.raw`|(?:(${REPO_NAME})/(${REPO_NAME}))?#(\d+))`,
  'gi'
);

// GitHub only populates closingIssuesReferences from keywords when the PR targets the
// repository's default branch; on any other base the field is empty even though the
// contributor linked the issue correctly. Parsing the body covers that case.
const parseClosingReferences = (body, context) => {
  const matches = stripNonProse(body || '').matchAll(CLOSING_REFERENCE_REGEX);
  const references = [...matches]
    .map(([, urlOwner, urlRepo, urlNumber, owner, repo, number]) => ({
      owner: urlOwner || owner || context.repo.owner,
      repo: urlRepo || repo || context.repo.repo,
      // Leading zeros are not autolinked by GitHub, and a digit run long enough to
      // lose precision would reach the API as exponential notation.
      number: /^[1-9]\d*$/.test(urlNumber || number)
        ? Number(urlNumber || number)
        : Number.NaN,
    }))
    .filter(reference => Number.isSafeInteger(reference.number))
    // `.` and `..` are legal in the character class but are path segments, not names, so
    // they would traverse in the request URL rather than 404. Nothing else needs excluding:
    // any other name is merely one that does not exist.
    .filter(reference => !PATH_SEGMENT_REGEX.test(reference.owner) &&
      !PATH_SEGMENT_REGEX.test(reference.repo));

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

// A referenced issue that does not exist is not a link, so 404 (and 410, for issues that were
// transferred or deleted) means the reference simply does not count. Anything else is left to
// throw: the job goes red without a comment or a label change, exactly as it already does for
// every other API call here, and the next `synchronize` re-runs it. Swallowing those would be
// the one path that can hand a genuinely unlinked PR its `Ready for review` label.
const MISSING_ISSUE_STATUSES = new Set([404, 410]);

const resolveReferencedIssues = async (github, context, core, references) => {
  const issues = await Promise.all(references.map(async (reference) => {
    try {
      const { data } = await github.rest.issues.get({
        owner: reference.owner,
        repo: reference.repo,
        issue_number: reference.number,
      });
      // A pull request is also an issue on this endpoint, but referencing one is not a link.
      return data.pull_request ? null : toIssueNode(data, reference);
    } catch (err) {
      if (!MISSING_ISSUE_STATUSES.has(err.status)) {
        throw err;
      }
      // 404 also covers "the token cannot see this repository", so a reference to a
      // private in-org repo lands here. Warn rather than info so a dropped reference is
      // visible in the job summary instead of only deep in the log.
      const name = `${reference.owner}/${reference.repo}#${reference.number.toString()}`;
      core.warning(`Ignoring referenced issue ${name}: not found or not visible.`);
      return null;
    }
  }));
  return issues.filter(Boolean);
};

const isAssignedTo = (issue, login) => {
  return issue.assignees.nodes.some(assignee => assignee.login === login);
};

const getLinkedIssues = async (github, context, core) => {
  const query = `
    query ($owner: String!, $repo: String!, $number: Int!, $limit: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          closingIssuesReferences(first: $limit) {
            nodes {
              number
              repository {
                nameWithOwner
                owner { login }
              }
              assignees(first: $limit) {
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
    limit: MAX_LINKED_ISSUES,
  });
  // Issues linked from repositories outside the org don't count as linked.
  const isInOrg = owner => owner.toLowerCase() === context.repo.owner.toLowerCase();
  const author = context.payload.pull_request.user.login;
  const linkedIssues = result.repository.pullRequest.closingIssuesReferences.nodes
    .filter(issue => isInOrg(issue.repository.owner.login));

  // Only short-circuit on a link that would actually pass. closingIssuesReferences is
  // fed by both closing keywords and the Development sidebar, and the sidebar works on
  // any base branch — so a sidebar-linked epic can fill this while the contributor's own
  // keyword link goes unread, leaving them a failure they cannot clear from the PR.
  if (linkedIssues.some(issue => isAssignedTo(issue, author))) {
    return linkedIssues;
  }

  const parsed = parseClosingReferences(context.payload.pull_request.body, context)
    .filter(reference => isInOrg(reference.owner));
  if (parsed.length > MAX_LINKED_ISSUES) {
    core.warning(
      `Only the first ${MAX_LINKED_ISSUES.toString()} referenced issues are checked; ` +
      `${(parsed.length - MAX_LINKED_ISSUES).toString()} later reference(s) were ignored.`
    );
  }
  const references = parsed.slice(0, MAX_LINKED_ISSUES);
  if (!references.length) {
    return linkedIssues;
  }

  const resolved = await resolveReferencedIssues(github, context, core, references);
  // Re-filter: an issue transferred out of the org comes back under its new owner.
  return [...linkedIssues, ...resolved.filter(issue => isInOrg(issue.repository.owner.login))];
};

const getLinkedIssueFailure = (pr, linkedIssues) => {
  if (!linkedIssues.length) {
    return getMessage('missing-linked-issue');
  }
  if (linkedIssues.some(issue => isAssignedTo(issue, pr.user.login))) {
    return null;
  }

  // The GraphQL and parsed sets can name the same issue; list it once.
  const seen = new Set();
  const issueList = linkedIssues
    .map(issue => issue.repository.nameWithOwner === pr.base.repo.full_name
      ? `#${issue.number}`
      : `${issue.repository.nameWithOwner}#${issue.number}`)
    .filter(name => {
      const key = name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
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

  const linkedIssues = await getLinkedIssues(github, context, core);
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
