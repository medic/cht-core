import { TestBed, TestModuleMetadata } from '@angular/core/testing';
import { MaterialTestModule } from './material-test.module';
import { HttpClientTestingModule } from '@angular/common/http/testing';

/**
 * Helper function to configure testing modules with proper Material icon support
 * to prevent the ":icon-back" error in unit tests
 */
export const configureTestingModule = (config: TestModuleMetadata): void => {
  // Ensure imports array exists
  config.imports = config.imports || [];

  // Add HttpClientTestingModule for tests that need HTTP
  if (!config.imports.some(module => module === HttpClientTestingModule ||
    (typeof module === 'object' && module.constructor?.name === 'HttpClientTestingModule'))) {
    config.imports.push(HttpClientTestingModule);
  }

  // Add MaterialTestModule if it doesn't already exist
  if (!config.imports.some(module => module === MaterialTestModule ||
    (typeof module === 'object' && module.constructor?.name === 'MaterialTestModule'))) {
    config.imports.push(MaterialTestModule);
  }

  // Configure TestBed
  TestBed.configureTestingModule(config);
};
