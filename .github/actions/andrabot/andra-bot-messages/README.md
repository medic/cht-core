# AndraBot messages

These files contain the messages AndraBot posts on pull requests from external
contributors (see `../README.md`). Edit them freely — the bot reads them at run
time, so no script changes are needed.

| File | When it is used |
| ---- | --------------- |
| `intro.md` | Greeting at the top of the comment when one or more checks fail |
| `template-mismatch.md` | The PR description does not follow the PR template |
| `license-changed.md` | The License section of the PR description was modified |
| `missing-linked-issue.md` | The PR is not linked to any issue |
| `not-assigned.md` | The author is not assigned to the linked issue |
| `outro.md` | Footer at the bottom of the comment when one or more checks fail |
| `success.md` | Replaces the comment once all checks pass |

Guidelines:

- Keep each message a single paragraph — failure messages are rendered as bullet
  list items.
- Markdown works: links, `code`, **bold**, etc.
- Placeholders in `{{double braces}}` are filled in by the bot; keep them intact.
  Available in every message:
  - `{{author}}` — the GitHub username of the PR author (without the `@`)
  - `{{templateUrl}}` — link to the PR template of the repository the PR targets
  - `{{failureLabel}}` / `{{successLabel}}` — the label names the action is
    configured with

  Message-specific:
  - `{{issueList}}` (`not-assigned.md`) — the linked issue number(s), e.g. `#1234, #5678`
  - `{{sections}}` (`template-mismatch.md`) — the section names required by the PR
    template, e.g. `Description, Code review checklist, License` (read from the
    template itself, so it stays current when the template changes)
