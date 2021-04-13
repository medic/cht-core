const joi = require('@hapi/joi');

const FormsSchema = joi.object().pattern(
  /\w{1,30}/,
  joi.object({
    meta: joi.object({
      code: joi.string().required(),
      icon: joi.string(),
      translation_key: joi.string(),
      subject_key: joi.string()
    }).required(),
    fields: joi.object().pattern(
      /\w{1,30}/,
      joi.object({
        type: joi.string().required(),
        labels: joi.object({
          short: joi.alternatives(
            joi.string(),
            joi.object()
          ),
          tiny: joi.alternatives(
            joi.string(),
            joi.object()
          )
        }),
        position: joi.number(),
        flags: joi.object(),
        length: joi.array().items(joi.number()),
        required: joi.boolean(),
        range: joi.array().items(joi.number()),
        validations: joi.object()
      })
    ).required(),
    public_form: joi.boolean(),
    facility_reference: joi.string(),
    use_sentinel: joi.boolean()
  })
);

const ScheduleSchema = joi.array().items(
  joi.object({
    name: joi.string().required(),
    summary: joi.string().allow(''),
    description: joi.string().allow(''),
    start_from: joi.string(),
    start_mid_group: joi.boolean(),
    translation_key: joi.string(),
    messages: joi.array().items(
      joi.object({
        translation_key: joi.string().required(),
        messages: joi.array().items(
          joi.object({
            content: joi.string(),
            locale: joi.string()
          })
        ),
        group: joi.number().required(),
        offset: joi.string().required(),
        send_day: joi.string().allow(''),
        send_time: joi.string().allow(''),
        recipient: joi.string()
      })
    ).required()
  })
);

module.exports = {
  validateFormsSchema: (formsObject) => {
    const { error } = FormsSchema.validate(formsObject);
    return error ? { valid: false, error } : { valid: true };
  },
  validateScheduleSchema: (scheduleObject) => {
    const { error } = ScheduleSchema.validate(scheduleObject);
    return error ? { valid: false, error } : { valid: true };
  }
};
