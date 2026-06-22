import { appConfig } from './app.config';

describe('appConfig', () => {
  it('should expose application providers', () => {
    expect(appConfig.providers.length).toBeGreaterThan(0);
  });
});
