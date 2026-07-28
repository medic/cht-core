const fs = require('fs');

const edits = [
  {
    file: 'webapp/src/ts/modules/tasks/tasks-content.component.ts',
    imports: [{ after: null, add: "import { DOC_TYPES } from '@medic/constants';\n" }],
    replacements: [["action.type === 'contact'", "action.type === DOC_TYPES.CONTACT"]],
  },
  {
    file: 'webapp/src/ts/modules/messages/messages-content.component.ts',
    imports: [{ after: null, add: "import { DOC_TYPES } from '@medic/constants';\n" }],
    replacements: [["if (type === 'contact')", "if (type === DOC_TYPES.CONTACT)"]],
  },
  {
    file: 'webapp/src/ts/services/contact-types.service.ts',
    imports: [{ after: null, add: "import { DOC_TYPES } from '@medic/constants';\n" }],
    replacements: [["type === 'contact' ||   // configurable hierarchy", "type === DOC_TYPES.CONTACT ||   // configurable hierarchy"]],
  },
  {
    file: 'webapp/src/ts/reducers/contacts.ts',
    imports: [{ after: null, add: "import { DOC_TYPES } from '@medic/constants';\n" }],
    replacements: [["contact.type === 'contact'", "contact.type === DOC_TYPES.CONTACT"]],
  },
  {
    file: 'webapp/src/js/bootstrapper/offline-ddocs/medic-offline-freetext/contacts_by_type_freetext.js',
    imports: [{ after: null, add: "const { DOC_TYPES } = require('@medic/constants');\n" }],
    replacements: [
      ["doc.type !== 'contact'", "doc.type !== DOC_TYPES.CONTACT"],
      ["typeIndex === -1 && doc.type === 'contact'", "typeIndex === -1 && doc.type === DOC_TYPES.CONTACT"],
    ],
  },
  {
    file: 'webapp/src/ts/modules/contacts/contacts-edit.component.ts',
    imports: [{ after: null, add: "import { DOC_TYPES } from '@medic/constants';\n" }],
    replacements: [["type: 'contact',", "type: DOC_TYPES.CONTACT,"]],
  },
  {
    file: 'webapp/src/ts/services/form.service.ts',
    imports: [{ after: null, add: "import { DOC_TYPES } from '@medic/constants';\n" }],
    replacements: [
      [": { type: 'contact', contact_type: type };", ": { type: DOC_TYPES.CONTACT, contact_type: type };"],
      ["this.type !== 'contact' && this.type !== 'training-card';", "this.type !== DOC_TYPES.CONTACT && this.type !== 'training-card';"],
    ],
  },
  {
    file: 'webapp/src/ts/services/get-data-records.service.ts',
    imports: [{ after: null, add: "import { DOC_TYPES } from '@medic/constants';\n" }],
    replacements: [["this.getRecords(ids, 'contact', options);", "this.getRecords(ids, DOC_TYPES.CONTACT, options);"]],
  },
];

for (const edit of edits) {
  let content = fs.readFileSync(edit.file, 'utf8');

  for (const rep of edit.replacements) {
    if (!content.includes(rep[0])) {
      console.error(`WARNING: pattern not found in ${edit.file}:\n  ${rep[0]}`);
      continue;
    }
    content = content.replace(rep[0], rep[1]);
  }

  // add import at the very top if not already present
  const importLine = edit.imports[0].add;
  if (!content.includes("from '@medic/constants'") && !content.includes("require('@medic/constants')")) {
    content = importLine + content;
  }

  fs.writeFileSync(edit.file, content, 'utf8');
  console.log(`Updated: ${edit.file}`);
}

console.log('\nDone. Run `git diff` to review.');