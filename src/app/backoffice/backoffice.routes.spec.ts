import { backofficeRoutes } from './backoffice.routes';

describe('backoffice routes', () => {
  it('should declare the layout with child routes', () => {
    expect(backofficeRoutes.length).toBe(1);
    const children = backofficeRoutes[0].children ?? [];
    expect(children.length).toBeGreaterThan(0);
    expect(children.find((c) => c.path === 'users')?.component).toBeDefined();
  });

  it('should redirect the empty child path to the dashboard', () => {
    const children = backofficeRoutes[0].children ?? [];
    expect(children.find((c) => c.path === '')?.redirectTo).toBe('dashboard');
  });
});
