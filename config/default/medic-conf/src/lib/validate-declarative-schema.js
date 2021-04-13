const path = require('path');
const joi = require('@hapi/joi');
const { error, warn } = require('./log');

const err = (filename, message) => details => {
  const acceptedValues = details[0].local.valids ? ` but only ${JSON.stringify(details[0].local.valids)} are allowed` : '';
  return new Error(`Invalid schema at ${filename}${details[0].local.label}
${message}
Current value of ${filename}${details[0].local.label} is ${JSON.stringify(details[0].value)}${acceptedValues}
`);
};
const targetError = message => err('targets', message);
const taskError = message => err('tasks', message);

const DhisSchema = joi.object({
  dataSet: joi.string().min(1).max(15).optional(),
  dataElement: joi.string().min(1).max(15).required(),
})
  .unknown(true);

const TargetSchema = joi.array().items(
  joi.object({
    id: joi.string().min(1).required(),
    icon: joi.string().min(1).optional(),
    translation_key: joi.string().min(1).optional(),
    subtitle_translation_key: joi.string().min(1).optional(),
    percentage_count_translation_key: joi.string().min(1).optional(),
    context: joi.string().optional(),

    type: joi.string().valid('count', 'percent').required(),
    goal: joi.alternatives().conditional('type', {
      is: 'percent',
      then: joi.number().min(-1).max(100).required(),
      otherwise: joi.number().min(-1).required(),
    }),
    appliesTo: joi.string().valid('contacts', 'reports').required(),
    appliesToType: joi.array().items(joi.string()).optional().min(1),
    appliesIf: joi.function().optional()
      .error(targetError('"appliesIf" should be of type function(contact, report)')),
    passesIf: joi.alternatives().conditional('groupBy', {
      is: joi.exist(),
      then: joi.function().forbidden(),
      otherwise: joi.alternatives().conditional('type', {
        is: 'percent',
        then: joi.function().required(),
        otherwise: joi.function().forbidden(),
      })
    })
      .error(targetError('"passesIf" is required only "type=percent" and "groupBy" is not defined. Otherwise, it is forbidden.')),
    groupBy: joi.function().optional()
      .error(targetError('"groupBy" should be of type function(contact, report)')),
    passesIfGroupCount: joi.alternatives().conditional('groupBy', {
      is: joi.exist(),
      then: joi.object({
        gte: joi.number().required(),
      }).required(),
      otherwise: joi.forbidden(),
    }),
    date: joi.alternatives().try(
        joi.string().valid('reported', 'now'),
        joi.function(),
      )
      .optional()
      .error(targetError('"date" should be either ["reported", "now"] or "function(contact, report)" returning timestamp')),
    emitCustom: joi.function().optional()
      .error(targetError('"emitCustom" should be a function')),
    dhis: joi.alternatives().try(
        DhisSchema,
        joi.array().items(DhisSchema),
      )
        .optional(),
    visible: joi.boolean().optional(),
    idType: joi.alternatives().try(
        joi.string().valid('report', 'contact'),
        joi.function(),
      )
      .optional()
      .error(targetError('idType should be either "report" or "contact" or "function(contact, report)"')),
    aggregate: joi.boolean().optional(),
  })
)
  .unique('id')
  .required();

const EventSchema = idPresence => joi.object({
    id: joi.string().presence(idPresence),
    days: joi.alternatives().conditional('dueDate', { is: joi.exist(), then: joi.forbidden(), otherwise: joi.number().required() })
      .error(taskError('"event.days" is a required integer field only when "event.dueDate" is absent')),
    dueDate: joi.alternatives().conditional('days', { is: joi.exist(), then: joi.forbidden(), otherwise: joi.function().required() })
      .error(taskError('"event.dueDate" is required to be "function(event, contact, report)" only when "event.days" is absent')),
    start: joi.number().min(0).required(),
    end: joi.number().min(0).required(),
  });

const TaskSchema = joi.array().items(
  joi.object({
    name: joi.string().min(1).required(),
    icon: joi.string().min(1).optional(),
    title: joi.string().min(1).required(),
    appliesTo: joi.string().valid('contacts', 'reports', 'scheduled_tasks').required(),
    appliesIf: joi.function().optional()
      .error(taskError('"appliesIf" should be of type function(contact, report)')),
    appliesToType: joi.array().items(joi.string()).optional().min(1),
    contactLabel:
      joi.alternatives().try( joi.string().min(1), joi.function() ).optional()
      .error(taskError('"contactLabel" should either be a non-empty string or function(contact, report)')),
    resolvedIf: joi.function().required()
      .error(taskError('"resolvedIf" should be of type function(contact, report)')),
    events: joi.alternatives().conditional('events', {
      is: joi.array().length(1),
      then: joi.array().items(EventSchema('optional')).min(1).required(),
      otherwise: joi.array().items(EventSchema('required')).unique('id').required(),
    }),
    priority: joi.alternatives().try(
      joi.object({
        level: joi.string().valid('high', 'medium').optional(),
        label: joi.string().min(1).optional(),
      }),
      joi.function(),
    )
      .optional()
      .error(taskError('"priority" should be an object with optional fields "level" and "label" or a function which returns the same')),
    actions: joi.array().items(
      joi.object({
        type: joi.string().valid('report', 'contact').optional(),
        form: joi.alternatives().conditional('type', { is: 'contact', then: joi.forbidden(), otherwise: joi.string().min(1).required() }),
        label: joi.string().min(1).optional(),
        modifyContent: joi.function().optional()
          .error(taskError('"actions.modifyContent" should be "function (content, contact, report)')),
      })
    )
      .min(1)
      .required(),
  })
)
  .unique('name')
  .required();

const validateFile = (logEvent, projectDir, filename, schema) => {
  const pathToTasks = path.join(projectDir, filename);
  let fileContent;
  try {
    fileContent = require(pathToTasks);
  } catch (err) {
    logEvent(`Failed to parse file ${pathToTasks}. ${err}`);
    return false;
  }

  const errors = validate(filename, fileContent, schema);
  if (errors.length) {
    logEvent(`${filename} invalid schema:`);
    errors.forEach(err => logEvent(err));
  }
  return errors.length === 0;
};

const validate = (filename, fileContent, schema) => {
  const result = schema.validate(fileContent, { abortEarly: false });
  if (!result.error) {
    return [];
  }

  if (!result.error.details) {
    return [result.error.message];
  }

  return result.error.details.map(detail => formatJoiError(filename, detail));
};

const formatJoiError = (desc, detail) => {
  const { context } = detail;
  if (detail.type === 'array.unique') {
    return `${desc}${context.label} contains duplicate value for the "${context.path}" field: "${context.value[context.path]}"`;
  }

  let result = detail.message;
  if (context.value) {
    result += `. Value is: "${context.value}"`;
  }
  return result;
};

module.exports = (projectDir, errorOnValidation) => {
  const logEvent = errorOnValidation ? error : warn;
  const tasksValid = validateFile(logEvent, projectDir, 'tasks.js', TaskSchema);
  const targetsValid = validateFile(logEvent, projectDir, 'targets.js', TargetSchema);

  const success = tasksValid && targetsValid;
  if (errorOnValidation && !success) {
    throw Error('Declarative configuration schema validation errors');
  }
};
