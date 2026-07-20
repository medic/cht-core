export type FormType = 'contact' | 'report' | 'task' | 'training-card';

// Putting this in the xml-forms.service file causes that service (and dependencies) to leak into cht-form.
// This breaks the cht-form build.
export class FormConfig {
  public readonly repeatPaths: string[];

  constructor(
    public readonly doc: Record<string, any>,
    public readonly type: FormType,
    xml: string,
    public readonly html: string,
    public readonly model: string
  ) {
    const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    this.repeatPaths = Array
      .from(xmlDoc.querySelectorAll('repeat[nodeset]'))
      .map(el => el.getAttribute('nodeset')!)
      .filter(Boolean);
  }
}
