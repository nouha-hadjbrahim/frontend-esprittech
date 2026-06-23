import { routes } from './app.routes';

describe('app routes', () => {
  it('should redirect the empty path to sign-in', () => {
    const root = routes.find((r) => r.path === '');
    expect(root?.redirectTo).toBe('sign-in');
  });

  it('should declare the sign-in and sign-up routes', () => {
    expect(routes.find((r) => r.path === 'sign-in')?.component).toBeDefined();
    expect(routes.find((r) => r.path === 'sign-up')?.component).toBeDefined();
  });

  it('should guard the frontoffice and backoffice areas', () => {
    expect(routes.find((r) => r.path === 'frontoffice')?.canActivate?.length).toBe(1);
    expect(routes.find((r) => r.path === 'backoffice')?.canActivate?.length).toBe(1);
  });

  it('should send unknown paths to sign-in', () => {
    expect(routes.find((r) => r.path === '**')?.redirectTo).toBe('sign-in');
  });
});
