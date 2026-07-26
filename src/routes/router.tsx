import { createRootRoute, createRoute, createRouter, lazyRouteComponent, redirect } from '@tanstack/react-router';
import { RootLayout } from '@/app/root-layout';
import { ConnectPage } from '@/features/mouse/connect-page';
import { useDeviceStore } from '@/stores/device-store';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ConnectPage,
});

const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspace',
  beforeLoad: async () => {
    const { currentDevice, previewMode, reconnectAuthorizedDevice } = useDeviceStore.getState();
    if (currentDevice || previewMode) return;
    const reconnected = await reconnectAuthorizedDevice();
    if (!reconnected) {
      throw redirect({ to: '/' });
    }
  },
  component: lazyRouteComponent(() => import('@/features/mouse/workspace-page'), 'MouseWorkspacePage'),
});

const routeTree = rootRoute.addChildren([indexRoute, workspaceRoute]);

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.BASE_URL.replace(/\/$/, ''),
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
