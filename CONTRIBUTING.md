# Contributing

At Medic Mobile we welcome and appreciate community contributions.

## Ways to contribute

### Communication

If you have an idea or a question we'd love to hear from you! The easiest ways to get in touch are by raising issues in the [medic-webapp Github repo](https://github.com/medic/medic-webapp/issues) or by messaging our [Google Group](https://groups.google.com/forum/#!forum/medic-developers).

### Submitting code

1. Before starting on code we recommend you raise an issue or message our Google Group to start a discussion about the change you want to make. Existing issues that have been identified as good for first time contributors are labeled with ["Help Wanted"](https://github.com/medic/medic-webapp/issues?q=is%3Aopen+is%3Aissue+label%3A%22Help+Wanted%22).
2. When working on your submission follow our [style guide](https://github.com/medic/medic-docs/blob/master/development/style-guide.md) so the codebase is kept consistent and easy to read.
3. When you're happy with the code be sure to run tests and precommit checks.
4. Now submit a PR with a full description of the issue you're solving and if possible including a link to the GitHub issue.
5. [Our CI](https://travis-ci.org/medic/) will automatically schedule a build. Keep an eye on the build to make sure it passes.
6. Your PR will be reviewed by a Medic team member. Most PRs have at least one change requested before they're merged so don't be offended if your change doesn't get accepted on the first try!

### Disclosing vulnerabilities

We take the security of our systems seriously, and we value the security community. The disclosure of security vulnerabilities helps us ensure the security and privacy of our users.

#### Guidelines

We require that all researchers:

- Make every effort to avoid privacy violations, degradation of user experience, disruption to production systems, and destruction of data during security testing;
- Refrain from using any in-scope compromise as a platform to probe or conduct additional research, on any other system, regardless of scope;
- Perform research only within the scope set out below;
- Use the identified communication channels to report vulnerability information to us; and
- Keep information about any vulnerabilities you've discovered confidential between yourself and Medic Mobile until all production systems have been patched.

If you follow these guidelines when reporting an issue to us, we commit to:

- Not pursue or support any legal action related to your research;
- Work with you to understand and resolve the issue quickly (including an initial confirmation of your report within 72 hours of submission); 
- Recognize your contribution on our Security Researcher Hall of Fame, if you are the first to report the issue and we make a code or configuration change based on the issue.

#### Scope

- https://alpha.dev.medicmobile.org

#### Out of scope

Any services hosted by 3rd party providers and any and all other services hosted on or beneath the medicmobile.org and hopephones.org domains are excluded from scope.

In the interest of the safety of our users, staff, the Internet at large and you as a security researcher, the following test types are excluded from scope:

- Findings from physical testing such as office access (e.g. open doors, tailgating)
- Findings derived primarily from social engineering (e.g. phishing, vishing)
- Findings from applications or systems not listed in the ‘Scope' section
- UI and UX bugs and spelling mistakes
- Network level Denial of Service (DoS/DDoS) vulnerabilities

Things we do not want to receive:

- Personally identifiable information (PII)
- Any exploits or proofs-of-concept in binary format (e.g. ELF)

#### How to report a security vulnerability?

If you believe you've found a security vulnerability in one of our products or platforms please send it to us by emailing dev@medicmobile.org. Please include the following details with your report:

- Description of the location and potential impact of the vulnerability;
- A detailed description of the steps required to reproduce the vulnerability (proof of concept source code, screenshots, and compressed screen captures are all helpful to us); and
- Your name/handle and a link for recognition in our Hall of Fame.
