import { Outlet } from '@tanstack/react-router';
import { AppProviders } from './providers';

export function RootLayout() {
  return (
    <AppProviders>
      <Outlet />
    </AppProviders>
  );
}
