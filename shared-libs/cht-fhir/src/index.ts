/* eslint-disable @typescript-eslint/no-implied-eval */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// TODO: Remove the above eslint disables once the code is refactored to use proper types.
import logger from '@medic/logger';

type FieldMappingConfig = Record<string, string>;

interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier?: { system: string; value: string }[];
  name?: { given: string[]; family: string }[];
  birthDate?: string;
  gender?: string;
  telecom?: { system: string; value: string }[];
}

/**
 * Checks if a document is a FHIR Patient resource based on a filter expression.
 * @param _doc - The document to check.
 * @param filterExpression - The filter expression to evaluate.
 * @returns True if the document matches the filter expression, otherwise false.
 */
export const isPatient = (doc: any, filterExpression: string): boolean => {
  try {
    const filterFunction = new Function('doc', `return ${filterExpression}`);
    const result = filterFunction(doc) as boolean;

    // Ensure the result is a boolean
    if (typeof result !== 'boolean') {
      throw new Error('Filter expression did not return a boolean value');
    }

    return result;
  } catch (e) {
    logger.error(`Error evaluating filter expression: ${filterExpression}`, e);
    return false;
  }
};

const applyMapping = (fhirPatient: FHIRPatient, fhirField: string, value: any) => {
  const pathSegments = fhirField.split(/[.[\]]/).filter(segment => segment);
  let current: any = fhirPatient;

  pathSegments.forEach((segment, index) => {
    const isLastSegment = index === pathSegments.length - 1;

    if (/\d+/.test(segment)) {
      // Handle array index
      const arrayIndex = parseInt(segment, 10);
      const parentKey = pathSegments[index - 1];
      if (!Array.isArray(current[parentKey])) {
        current[parentKey] = [];
      }
      if (!current[parentKey][arrayIndex]) {
        current[parentKey][arrayIndex] = {};
      }
      current = current[parentKey][arrayIndex];
    } else {
      // Handle regular key
      if (isLastSegment) {
        current[segment] = value;
      } else {
        if (!current[segment]) {
          current[segment] = {};
        }
        current = current[segment];
      }
    }
  });
};

/**
 * Maps a person document to a FHIR Patient resource.
 * @param personDoc - The person document to map.
 * @param mappingConfig - The configuration for field mapping.
 * @returns The mapped FHIR Patient resource.
 */
export const mapToFhirPatient = (
  personDoc: any,
  mappingConfig: FieldMappingConfig
): FHIRPatient => {
  const patient: FHIRPatient = {
    resourceType: 'Patient',
    id: personDoc._id,
    identifier: [{
      system: 'cht',
      value: personDoc._id
    }],
  };

  for (const [key, value] of Object.entries(mappingConfig)) {
    if (personDoc[key]) {
      applyMapping(patient, value, personDoc[key]);
    }
  }

  return patient;
};
