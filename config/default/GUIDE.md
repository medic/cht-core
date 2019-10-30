# Configuring Reference Applications

These instructions are aimed at developers and technical people who are exploring our Reference Application and want to make small changes to see what is possible.

Detailed tutorials on how to build apps from scratch with the Core Framework will be available soon. In the meantime the best source for detailed documentation is available in the [Developing Community Health Applications](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md) page.

## Modifying the Reference Application

You should have the [Core Framework running](../../INSTALL.md), have installed [medic-conf](https://github.com/medic/medic-conf) and have checked out or otherwise downloaded the [Reference Application](./).

Once you've made a change you must compile and upload that configuration to the Core Framework to see the change. You can do this by using `medic-conf`'s default action:

```sh
medic-conf --local --url=https://medic:pass@localhost
```

To perform individual actions, see [medic-conf's documentation](https://github.com/medic/medic-conf).

## Modifying Forms

Generally, the forms are created and edited in XLSX format (a spreadsheet, which is openable with Excel, Libreoffice or your favourite office tool) and later converted into XML format to upload to the instance. The forms are categorized into app forms (Action / Task forms such as pregnancy registration, delivery report) and contact forms (Place/Person forms).

To edit app forms, see `./forms/app/*.xlsx`. To edit contact forms, see `./forms/contact/*.xlsx`.

**NB:** if you are using couch2pg to create a read-only replicate of your data in PostgreSQL, it’s important to remember that changes to forms may require changes to your queries or views in PostgreSQL.

### Adding a new question

Each question is defined in a row in XLSForm with a type such as: text, integer, select_one, select_multiple. (See the [XLSForm documentation](https://xlsform.org/en/#question-types) for a full list of types).

Example:

| type | name       | label:en                                |
| ---- | ---------- | --------------------------------------- |
| date | u_lmp_date | Please enter the start date of the LMP. |

To add a new question, simply add a new row.

### Adding a new page of questions

To add a new page, you need to add a group. The group starts with a row that has type “begin group” and ends with type “end group”.  The "name" field is also required for "begin group" type. The "name" field is not required in the “end group” row, but can help provide clarity in nested groups.

More information: https://xlsform.org/en/#grouping-questions

### Removing questions

You can remove a question by removing the row specific to that question in XLS form. However, you should first ensure that no other row depends on it.

For example, before removing a question that asks for the date of birth (DOB) for a user, you need to make sure that DOB is not used anywhere else (to calculate the age of the user, etc). Without the original row, all rows depending on it will fail. 

The question being removed may also be used outsie of forms in the configuration, such as in Tasks, Targets or Contact-summary. One easy way to find the usage of the question is by searching the configuration for its name.

### Adding choice questions

Instructions are same [as adding a new question](#adding-a-new-question), except note that you need to add your new choice options in the "choices" sheet.

## Tasks

Tasks are calculated and shown at run-time, i.e. when the app is loaded or reloaded. Once calculated, they are not stored anywhere and are re-calculated when any user visits the app next time.

Tasks are defined inside the file `tasks.js`.

A Task can apply to certain contacts or contacts with specific reports with specific properties that are defined in `appliesIf` function of the task. The criteria for resolving/clearing the Task is defined in the `resolvedIf` function.

To show up a Task following conditions need to be satisfied:
- `appliesIf` results to true
- `resolvedIf` results to false
- Current day/time falls in the time window

For more information: [Tasks documentation](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#tasks).

### Changing the time window

The time period for which a Task can appear is called "time window". There are three settings that affect the time window:

1. `dueDate`: The date at which the Task is marked as due
2. `start`: Number of days before the due date from which the Task will start appearing
3. `end`: Number of days after the due date from which the Task will stop appearing

For example, if start = 6, end = 7, the Tasks will show for a total of 6 + 1 + 7 = 14 days i.e. 2 weeks.
It is easy to change the start and end days of the time window. Changing a dueDate, however, requires some calculation based on other factors such as reported date or LMP date.

## Targets

The Targets are configured inside the file `targets.js`.

For more information: [Targets documentation](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#targets).

### Editing a goal

To edit a goal, change the `goal` value. This value is an integer that can range from 0-100, where `-1` means no goal.

In the above example setting it to `75` would change the goal to be 75% of deliveries being in a health facility.

## Contact Summary Profiles

Condition cards are defined inside the `cards` section of the `contact-summary-templated.js` file.

To add a condition card, add it to the "cards" section.
To add a field inside an existing condition card, add it to the "fields" section of that card.
You can remove the fields or condition cards that you don't want to show by deleting the whole code block belonging to that field/card.

For more information: [Condition Cards documentation](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#cards)
