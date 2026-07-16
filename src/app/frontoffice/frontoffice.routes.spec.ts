import { frontofficeRoutes } from './frontoffice.routes';

describe('frontoffice routes', () => {
  const children = frontofficeRoutes[0].children ?? [];

  it('should declare the layout with guarded lazy children', () => {
    expect(frontofficeRoutes.length).toBe(1);
    expect(children.length).toBeGreaterThan(0);
    expect(children.find((c) => c.path === 'catalogue')?.canActivate?.length).toBe(1);
  });

  it('should redirect the empty child path to accueil', () => {
    expect(children.find((c) => c.path === '')?.redirectTo).toBe('accueil');
  });

  it('should declare the clean subject route structure', () => {
    const sujetsChildren = children.find((c) => c.path === 'sujets')?.children ?? [];
    expect(sujetsChildren.find((c) => c.path === 'mes-sujets')).toBeDefined();
    expect(sujetsChildren.find((c) => c.path === 'disponibles')).toBeDefined();
    expect(children.find((c) => c.path === 'sujets-disponibles')?.redirectTo).toBe('sujets/disponibles');
  });

  it('should lazily resolve every page component', async () => {
    const lazy = children.filter((c) => typeof c.loadComponent === 'function');
    expect(lazy.length).toBeGreaterThan(0);
    for (const route of lazy) {
      const component = await route.loadComponent!();
      expect(component).toBeDefined();
    }
  });
});
