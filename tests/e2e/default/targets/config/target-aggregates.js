const monthlySubtitleFn = `(reportingPeriod) => reportingPeriod === 'current'
  ? 'targets.this_month.subtitle'
  : 'targets.last_month.subtitle'`;

const TARGETS_DEFAULT_CONFIG = [
  {
    id: 'count_no_goal',
    type: 'count',
    title: 'count no goal',
    aggregate: true,
    subtitle_translation_key: 'targets.all_time.subtitle'
  },
  {
    id: 'count_with_goal',
    type: 'count',
    title: 'count with goal',
    goal: 20,
    aggregate: true,
    subtitle_translation_key: 'targets.all_time.subtitle'
  },
  {
    id: 'percent_no_goal',
    type: 'percent',
    title: 'percent no goal',
    aggregate: true,
    subtitle_translation_key: 'targets.all_time.subtitle'
  },
  {
    id: 'percent_with_goal',
    type: 'percent',
    title: 'percent with goal',
    aggregate: true, goal: 80,
    subtitle_translation_key: monthlySubtitleFn
  },
  {
    id: 'percent_achieved',
    type: 'percent',
    title: 'percent achieved',
    aggregate: true, goal: 10,
    subtitle_translation_key: monthlySubtitleFn
  },
];

const TARGETS_CONFIG_WITH_AND_WITHOUT_AGGREGATES = [
  { id: 'not_aggregate', type: 'count', title: 'my task' },
  { id: 'also_not_aggregate', type: 'count', title: 'my task' },
  { id: 'also_also_not_aggregate', type: 'count', title: 'my task', aggregate: false },
  ...TARGETS_DEFAULT_CONFIG
];

const EXPECTED_DEFAULTS_TARGETS = [
  {
    id: 'count_no_goal',
    title: 'count no goal',
    subtitle: 'All time',
    progressBar: false,
    goal: false,
    counter: '25'
  },
  {
    id: 'count_with_goal',
    title: 'count with goal',
    subtitle: 'All time',
    progressBar: true,
    goal: 20,
    counter: '0 of 5'
  },
  {
    id: 'percent_no_goal',
    title: 'percent no goal',
    subtitle: 'All time',
    progressBar: true,
    goal: false,
    counter: '50%'
  },
  {
    id: 'percent_with_goal',
    title: 'percent with goal',
    subtitle: 'This month',
    progressBar: true,
    goal: '80%',
    counter: '5 of 5'
  },
  {
    id: 'percent_achieved',
    title: 'percent achieved',
    subtitle: 'This month',
    progressBar: true,
    goal: '10%',
    counter: '5 of 5'
  },
];

const EXPECTED_TARGETS_NO_PROGRESS = [
  {
    id: 'count_no_goal',
    title: 'count no goal',
    subtitle: 'All time',
    counter: '0',
    progressBar: false,
    goal: false
  },
  {
    id: 'count_with_goal',
    title: 'count with goal',
    subtitle: 'All time',
    counter: '0 of 5',
    progressBar: true,
    goal: 20
  },
  {
    id: 'percent_no_goal',
    title: 'percent no goal',
    subtitle: 'All time',
    counter: '0%',
    progressBar: true,
    goal: false
  },
  {
    id: 'percent_with_goal',
    title: 'percent with goal',
    subtitle: 'This month',
    counter: '0 of 5',
    progressBar: true,
    goal: '80%'
  },
  {
    id: 'percent_achieved',
    title: 'percent achieved',
    subtitle: 'This month',
    counter: '0 of 5',
    progressBar: true,
    goal: '10%',
  },
];

module.exports = {
  TARGETS_DEFAULT_CONFIG,
  TARGETS_CONFIG_WITH_AND_WITHOUT_AGGREGATES,
  EXPECTED_DEFAULTS_TARGETS,
  EXPECTED_TARGETS_NO_PROGRESS,
};
