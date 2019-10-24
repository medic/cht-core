# Reference configuration changes cookbook

These instructions are aimed at developers and technical people who are exploring the reference configuration and are looking to make small changes to see what is possible. Detailed tutorials on how to build apps from scratch with the Core Framework will be available soon. In the meantime the best source for detailed documentation is available in the [Developing Community Health Aapplications](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md) page. 

## Modifying the reference config

You should have the [Core Framework running](TODO easy setup instructions), have installed [medic-conf](TODO medic-conf install instructions) and have checked out or otherwise downloaded the [Reference Configuration](TODO link to dir on github).

Once you've made a change you can upload the configuration on disk (including pre-steps like compiling forms from spreadsheets into XML etc), by using `medic-conf`'s default action:

```sh
# TODO get this right for easy setup instruction URLs
medic-conf --local
```

To perform individual actions, see [medic-conf's documentation](TODO readme link).

## Modifying Forms

Generally, the forms are created and edited in XLSX format (a spreadsheet, openable with Excel, Libreoffice or your favourite office tool) and later converted into XML format to upload to the instance. The forms are categorized into app forms (action/task forms such as pregnancy registration, delivery report) and contact forms (place/person forms).

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

To add a new page, you need to add a group. The group starts with a row that has type “begin group” and ends with type “end group”.  The "name" field is also required for "begin group" type. The "name" field is not required in the “end group” row, but you may want to keep it just for reference. Otherwise, it can get very confusing when there are many groups inside group (nested groups).

More information: https://xlsform.org/en/#grouping-questions

### Removing questions

You can remove a question by simply removing the row specific to that question in XLS form. However, any other row should not depend on it.

For example, there is a question that asks date of birth (DOB) from the user. If you remove it, you need to make sure that DOB is not used anywhere else. It might have been used to calculate the age of the user, which will fail without DOB info. The question being removed could have been used elsewhere in the configuration, outside the forms, such as in tasks, targets or contact-summary. One easy way to find the usage of the question is by searching throughout the configuration with its name.

### Adding choice questions

Instructions are same [as adding a new question](#adding-a-new-question), except note that you need to add your new choice options in the "choices" sheet.

## Tasks

Tasks are calculated and shown at run-time, i.e. when the app is loaded or reloaded. Once calculated, they are not stored anywhere and are re-calculated when any user visits the app next time.

Tasks are defined inside the file `tasks.js`.

A Task can apply to certain contacts or contacts with specific reports with specific properties that are defined in `appliesIf` function of the task. The criteria for resolving/clearing the task is defined in the `resolvedIf` function.

To show up a task following conditions need to be satisfied:
- `appliesIf` results to true
- `resolvedIf` results to false
- Current day/time falls in the time window

For more information: [Tasks documentation](https://github.com/medic/medic-docs/blob/master/configuration/developing-community-health-applications.md#tasks).

### Changing the time window

The time period for which a task can appear is called "time window". There are three settings that affect the time window:

1. `dueDate`: The date at which the task is marked as due
2. `start`: Number of days before the due date from which the task will start appearing
3. `end`: Number of days after the due date from which the task will stop appearing

For example, if start = 6, end = 7, the tasks will show for a total of 6 + 1 + 7 = 14 days i.e. 2 weeks.
It is easy to change the start and end days of the time window. Changing a dueDate, however, requires some calculation based on other factors such as reported date or LMP date.

## Targets

The targets are configured inside the file `targets.js`.

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
