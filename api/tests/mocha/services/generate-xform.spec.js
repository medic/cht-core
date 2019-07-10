const chai = require('chai');
const sinon = require('sinon');
const service = require('../../../src/services/generate-xform');

const formXml = `<h:html xmlns="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:jr="http://openrosa.org/javarosa">
  <h:head>
    <h:title>Multimedia - Demo Form</h:title>
    <model>
      <itext>
        <translation lang="en">
          <!-- Attach sample media files to form doc -->
          <!-- Good media samples available here: https://sample-videos.com -->
          <text id="somevideo">
            <value form="video">jr://video.mp4</value>
          </text>
          <text id="someimage">
            <value form="image">jr://image.jpg</value>
          </text>
        </translation>
      </itext>
      <instance>
        <media id="multimedia">
          <meta>
            <instanceID/>
          </meta>
        </media>
      </instance>
    </model>
  </h:head>
  <h:body class="pages">
    <group appearance="field-list" ref="g">
      <input ref="q2">
        <label ref="jr:itext('somevideo')"/>
      </input>
      <input ref="q3">
        <label ref="jr:itext('someimage')"/>
      </input>
    </group>
  </h:body>
</h:html>`;

describe.only('generate-xform service', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('generate', () => {

    it('returns generated form html and model xml', () => {
      return service.generate(formXml).then(({ form, model }) => {
        chai.expect(form).to.equal('\n  <form autocomplete="off" novalidate="novalidate" class="or clearfix pages" dir="ltr" id="multimedia">\n<!--This form was created by transforming a OpenRosa-flavored (X)Form using an XSL stylesheet created by Enketo LLC.--><section class="form-logo"> </section><h3 dir="auto" id="form-title">Multimedia - Demo Form</h3><select id="form-languages" style="display:none;" data-default-lang="en"><option value="en">en</option> </select>\n  \n  \n    <section class="or-group-data or-appearance-field-list " name="g"><label class="question non-select "><video controls="controls" lang="en" class="active" src="jr://video.mp4" data-itext-id="somevideo">Your browser does not support HTML5 video.</video><input type="text" name="g/q2" data-type-xml="string"/></label><label class="question non-select "><span lang="en" class="option-label active">\n                 </span><img lang="en" class="active" src="jr://image.jpg" data-itext-id="someimage" alt="image"/><input type="text" name="g/q3" data-type-xml="string"/></label>\n            </section><!--end of group -->\n  \n</form>\n\n');
        chai.expect(model).to.equal('\n  <model>\n    <instance>\n        <media xmlns:jr="http://openrosa.org/javarosa" id="multimedia">\n          <meta>\n            <instanceID/>\n          </meta>\n        </media>\n      </instance>\n  </model>\n\n');
      });
    });

  });

});
