# The Core Framework of the Community Health Toolkit (CHT)

This is the repository of the CHT Core Framework, a technical resource of the [Community Health Toolkit (CHT)](https://communityhealthtoolkit.org) contributed by Medic Mobile.

Medic Mobile is a nonprofit organization on a mission to improve health in the hardest-to-reach communities through open-source software. Medic Mobile serves as the technical steward of the Community Health Toolkit.

For the latest changes and release announcements see our [release notes](https://github.com/medic/cht-core/tree/master/release-notes). Our exact support matrix (including older app versions) can be found [in our docs](https://github.com/medic/medic-docs/blob/master/installation/supported-software.md).

## Overview

The CHT's Core Framework is a software architecture that makes it faster to build full-featured, scalable digital health apps that equip health workers to provide better care in their communities. To learn more about building an application with the Core Framework, visit our guide for [developing community health apps](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md).

The Core Framework addresses complexities like health system roles and reporting hierarchies, and its features are flexible enough to support a range of health programs and local care provider workflows.

Mobile and web applications built with the Core Framework support a team-based approach to healthcare delivery and management. Health workers can use SMS messages or mobile applications to submit health data that can then be viewed and exported using a web application. These web applications are fully responsive with a mobile-first design, and support localization using any written language. They can be installed locally or in the cloud by setting up the individual components or as a Docker container.

For more information about Medic Mobile's architecture and how the pieces fit together, see [Architecture Overview](https://docs.communityhealthtoolkit.org/core/overview/architecture/).
For more information about the format of docs in the database, see [Database Schema](https://docs.communityhealthtoolkit.org/core/overview/db-schema/).
For more information about the SMS exchange protocol between webapp and gateway, see [Message States](https://github.com/medic/medic-docs/blob/master/user/message-states.md).

## Using the Core Framework

If you are a developer looking to contribute to the Core Framework itself, you should follow the [development setup instructions](./DEVELOPMENT.md).

If you wish to evaluate the Core Framework, _or_ you are a developer looking to create or modify applications built with the Core Framework, you can instead follow the [easy deployment](./INSTALL.md) instructions, which will get the latest stable release running locally via Docker.

You will need to also familiarise yourself with [medic-conf](https://github.com/medic/medic-conf), a tool to manage and configure your apps built using the Core Framework. A brief guide for modifying the config is available [alongside the config](./config/default/GUIDE.md). A more detailed guide is available in [medic-docs](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md).

### Supported Browsers

Currently, the latest versions of Chrome, Chrome for Android and Firefox are functionally supported. We do not support Safari (unreliable implementations of necessary web APIs) and the generic android browser (unreliable implementations in general). Our webapp code, which includes any code written as configuration, is still ES5. Our exact support matrix (including older app versions) can be found [in our docs](https://github.com/medic/medic-docs/blob/master/installation/supported-software.md).

## Contributing

The Core Framework of the [Community Health Toolkit](https://communityhealthtoolkit.org) is powered by people like you. We appreciate your contributions, and are dedicated to supporting the developers who improve our tools whenever possible.

To setup a development environment to contribute to the Core Framework follow the [development instructions](./DEVELOPMENT.md).

First time contributor? Issues labeled [help wanted](https://github.com/medic/cht-core/labels/Help%20wanted) are a great place to start.

Looking for other ways to help? You can also:
* Improve documentation. Check out our style guide [here](https://docs.communityhealthtoolkit.org/contribute/docs/style-guide/)
* Find and mark duplicate issues
* Try to reproduce issues and help with troubleshooting
* Or share a new idea or question with us!

The easiest ways to get in touch are by raising issues in the [medic Github repo](https://github.com/medic/cht-core/issues) or [joining our Community Forum](https://forum.communityhealthtoolkit.org).

For more information check out our [contributor guidelines](CONTRIBUTING.md).

## Build Status

Builds brought to you courtesy of [Travis CI](https://travis-ci.org/medic/cht-core).

[![Build Status](https://travis-ci.org/medic/cht-core.png?branch=master)](https://travis-ci.org/medic/cht-core/branches)

## Copyright

Copyright 2013-2018 Medic Mobile, Inc. <hello@medicmobile.org>

## License

The software is provided under AGPL-3.0. Contributions to this project are accepted under the same license.
