# The Core Framework of the Community Health Toolkit (CHT)

This is the repository of the CHT Core Framework, a technical resource of the [Community Health Toolkit (CHT)](https://communityhealthtoolkit.org), stewarded by [Medic](https://medic.org/).

For the latest changes and release announcements see the [release notes](https://github.com/medic/cht-core/tree/master/release-notes). The CHT version support matrix (including older app versions) can be found [in the CHT docs](https://docs.communityhealthtoolkit.org/releases/#supported-versions).

## Overview

The CHT's Core Framework is a software architecture that makes it faster to build full-featured, scalable digital health apps that equip health workers to provide better care in their communities. To learn more about building an application with the Core Framework, visit the guide for [building community health apps](https://docs.communityhealthtoolkit.org/building/).

The Core Framework addresses complexities like health system roles and reporting hierarchies, and its features are flexible enough to support a range of health programs and local care provider workflows.

Mobile and web applications built with the Core Framework support a team-based approach to healthcare delivery and management. Health workers can use SMS messages or mobile applications to submit health data that can then be viewed and exported using a web application. These web applications are fully responsive with a mobile-first design, and support localization using any written language, including Left-to-Right and Right-to-Left writing systems. They can be installed locally or in the cloud with [Docker or Kubernetes](https://docs.communityhealthtoolkit.org/hosting/cht/).

For more information about CHT's architecture and how the pieces fit together, see [Architecture Overview](https://docs.communityhealthtoolkit.org/technical-overview/architecture/).
For more information about the format of docs in the database, see [Database Schema](https://docs.communityhealthtoolkit.org/technical-overview/data/db-schema/).
For more information about the SMS exchange protocol between webapp and gateway, see [Message States](https://docs.communityhealthtoolkit.org/apps/guides/messaging/sms-states/).

## Using the Core Framework

If you are a developer looking to contribute to the Core Framework, you should follow the [contributor's guide](https://docs.communityhealthtoolkit.org/community/contributing/code/).

If you wish to evaluate the Core Framework, _or_ you are a developer looking to create or modify applications built with the Core Framework, you can instead follow the [easy deployment](https://docs.communityhealthtoolkit.org/apps/tutorials/local-setup/) instructions, which will get the latest stable release running locally via Docker.

You will need to also familiarise yourself with [cht-conf](https://github.com/medic/cht-conf), a tool to manage and configure your apps built using the Core Framework. A brief guide for modifying the config is available [alongside the config](./config/default/GUIDE.md). A more detailed guide is available in [cht-docs](https://docs.communityhealthtoolkit.org/building/).

### Supported Browsers

Currently, the latest versions of Chrome, Chrome for Android and Firefox are functionally supported. We do not support Safari (unreliable implementations of necessary web APIs) and the generic Android browser (unreliable implementations in general). The CHT version support matrix (including older app versions) can be found [in the CHT docs](https://docs.communityhealthtoolkit.org/releases/#supported-versions).

## Contributing

The Core Framework of the [Community Health Toolkit](https://communityhealthtoolkit.org) is powered by people like you. We appreciate your contributions, and are dedicated to supporting the developers who improve the CHT tools whenever possible.

To setup a development environment to contribute to the Core Framework follow the [development instructions](https://docs.communityhealthtoolkit.org/community/contributing/code/core/dev-environment/).

First time contributor? Issues labeled [Good First Issue](https://github.com/medic/cht-core/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22Good%20first%20issue%22) are a great place to start. Have a look at the [First Time Contributors Guide](https://docs.communityhealthtoolkit.org/community/contributing/first-time-contributors/) to get your started! 

Looking for other ways to help? Have a lok at the [starting guides for contributors](https://docs.communityhealthtoolkit.org/community/contributing/)!

The easiest ways to get in touch are by raising issues in the [GitHub repo](https://github.com/medic/cht-core/issues) or [joining the CHT Community Forum](https://forum.communityhealthtoolkit.org).

For more information check out the [community guidelines](https://docs.communityhealthtoolkit.org/community/).

## Build Status

Builds brought to you courtesy of GitHub Actions.

![Build Status](https://github.com/medic/cht-core/actions/workflows/build.yml/badge.svg)

## Copyright

Copyright 2013-2025 Medic Mobile, Inc. <hello@medic.org>

## License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.
