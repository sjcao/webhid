import { RouterProvider } from '@tanstack/react-router';
import { router } from '@/routes/router';

export function App() {
  return <RouterProvider router={router} />;
}
