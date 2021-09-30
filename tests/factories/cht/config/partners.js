const Factory = require('rosie').Factory;

module.exports.build = (resourcesArray) => new Factory()
  .attr('_id', 'partners')
  .option('resourcesArray', resourcesArray)
  .attr('resources', ['resourcesArray'], (resourcesArray) => {
    const resources = {};
    resourcesArray.forEach(resource => resources[resource.name] = resource.name);
    return resources;
  })
  .attr('_attachments', ['resourcesArray'], (resourcesArray) => {
    const attachments = {};
    resourcesArray.forEach(resource => attachments[resource.name] = {
      data: resource.data,
      content_type: resource.contentType || 'image/png',
    });
    return attachments;
  })
  .build(resourcesArray);
