const getElementLineage = (element: Element): Element[] => element.parentElement
  ? [...getElementLineage(element.parentElement), element]
  : [element];

const getElementPosition = (element: Element): number => Array
  .from(element.parentElement?.children ?? [element])
  .filter(sibling => sibling.nodeName === element.nodeName)
  .indexOf(element) + 1;

export const Xpath = {
  /**
   * Gets the XPath for an element with no positional predicates.
   */
  getElementXPath: (element: Element): string => getElementLineage(element)
    .map(({ nodeName }) => `/${nodeName}`)
    .join(''),

  /**
   * Gets the XPath for an element with a positional predicate on every node in the path that is a repeat instance.
   * @param element the element to get the XPath for
   * @param repeatPaths the raw XPaths (containing no positional predicates) of the form's repeat groups
   */
  getElementPositionalXPath: (element: Element, repeatPaths: string[] = []): string => getElementLineage(element)
    .map(node => {
      const position = repeatPaths.includes(Xpath.getElementXPath(node)) ? `[${getElementPosition(node)}]` : '';
      return `/${node.nodeName}${position}`;
    })
    .join('')
};
