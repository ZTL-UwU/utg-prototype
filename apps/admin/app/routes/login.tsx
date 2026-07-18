import { redirect } from 'react-router';

import { LoginForm } from '~/components/login-form';
import { safeRedirect } from '~/lib/redirect';
import { useAuthStore } from '~/stores/auth';

import type { Route } from './+types/login';

// Already signed in? Skip the login page.
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  if (useAuthStore.getState().accessToken) {
    const url = new URL(request.url);
    throw redirect(safeRedirect(url.searchParams.get('redirect')));
  }
  return null;
}

clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return null;
}

export default function Login() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
