const utils = require('../../../utils');

const xml = `<?xml version="1.0"?>
<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">
	<h:head>
		<h:title>photo-upload</h:title>

		<model>
			<instance>
				<photo-upload id="photo-upload">
					<my_photo/>
					<meta>
						<instanceID/>
					</meta>
				</photo-upload>
			</instance>

			<bind nodeset="/photo-upload/my_photo" type="binary"/>
		</model>
	</h:head>

	<h:body>
		<upload ref="/photo-upload/my_photo" mediatype="image/*">
			<hint>Select a picture or take a photo</hint>
			<label>Image widget</label>
		</upload>
	</h:body>
</h:html>
`;

const docs = [
  {
    _id: 'form:photo-upload',
    internalId: 'photo-upload',
    title: 'Photo upload',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(xml).toString('base64')
      }
    }
  }
];

const configureForm = (userContactDoc) => {
  return utils.seedTestData(userContactDoc, docs);
};

const imagePreview = () => $('form[data-form-id="photo-upload"] .file-picker .file-preview img');
const selectImage = async (filePath) => {
  const input = await $('form[data-form-id="photo-upload"] input[type=file]');
  await input.setValue(filePath);
};

const reportImagePreview = () => $('.report-image');


module.exports = {
  docs,
  configureForm,

  imagePreview,
  selectImage,
  reportImagePreview,
};
