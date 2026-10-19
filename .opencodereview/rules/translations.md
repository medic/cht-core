#### Translation files

- **Keys are a contract.** Check the diff replaces every in-repo usage when a key changes.
- **Placeholders are named by the caller.** A renamed or newly introduced placeholder must match what the calling code actually passes, or it renders literally.
- **Pluralisation and gender** belong in messageformat, not in concatenated strings or separate `_singular` / `_plural` keys.
- **RTL.** Copy that embeds layout assumptions ("click the button on the left", a hardcoded direction, a string assembled from fragments) breaks in right-to-left languages.
- Keep keys alphabetically grouped with their neighbours
