# Description

[description]

medic/cht-core#[number]

# Code review checklist
<!-- Remove or comment out any items that do not apply to this PR; in the remaining boxes, replace the [ ] with [x]. -->
- [ ] Readable: Concise, well named, follows the [style guide](https://docs.communityhealthtoolkit.org/contribute/code/style-guide/), documented if necessary.
- [ ] Documented: Configuration and user documentation on [cht-docs](https://github.com/medic/cht-docs/)
- [ ] Tested: Unit and/or e2e where appropriate
- [ ] Internationalised: All user facing text
- [ ] Backwards compatible: Works with existing data and configuration or includes a migration. Any breaking changes documented in the release notes.

# Compose URLs:
<!-- After CI passes, PR submitter should manually replace these placeholders with deep links to staging. Makes for easier testing! -->
<!-- e.g. https://staging.dev.medicmobile.org/_couch/builds/medic:medic:<branch>/docker-compose/cht-core.yml  -->
<!-- e.g. https://staging.dev.medicmobile.org/_couch/builds/medic:medic:<branch>/docker-compose/cht-couchdb.yml   -->
<!-- e.g. https://staging.dev.medicmobile.org/_couch/builds/medic:medic:<branch>/docker-compose/cht-couchdb-clustered.yml  -->

* CHT Core: CHT_CORE_COMPOSE_URL
* CouchDB Single: COUCH_SINGLE_COMPOSE_URL
* CouchDB Cluster: COUCH_CLUSTER_COMPOSE_URL
 
# License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.
