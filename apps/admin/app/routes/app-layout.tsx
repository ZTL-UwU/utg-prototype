import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, Outlet, redirect, useLocation, useNavigate, useParams } from 'react-router';

import { AppSidebar } from '~/components/app-sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import { Separator } from '~/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar';
import { LAYER_TITLES, isLayer, sidebarUnitsQueryOptions } from '~/lib/game';
import { loginPath } from '~/lib/redirect';
import { useAuthStore } from '~/stores/auth';

import type { Route } from './+types/app-layout';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  if (!useAuthStore.getState().accessToken) {
    const url = new URL(request.url);
    throw redirect(loginPath(url.pathname + url.search));
  }
  return null;
}

// Run the clientLoader on initial page load too, instead of rendering
// server-rendered protected content before the auth check happens.
clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return null;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const accessToken = useAuthStore((state) => state.accessToken);

  // Covers mid-session expiry: when a token refresh fails (or the user logs
  // out), the store is cleared and we bounce back to the login page.
  useEffect(() => {
    if (!accessToken) {
      void navigate(loginPath(location.pathname + location.search), { replace: true });
    }
  }, [accessToken, navigate, location.pathname, location.search]);

  const { data: units, isPending } = useQuery({
    ...sidebarUnitsQueryOptions,
    enabled: !!accessToken,
  });

  const layer = isLayer(params.layer) ? params.layer : undefined;
  const unitId = params.unitId ? Number(params.unitId) : undefined;
  const unit =
    layer && unitId ? units?.find((u) => u.id === unitId && u.layer === layer) : undefined;

  return (
    <SidebarProvider>
      <AppSidebar units={units} isLoading={isPending} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-16">
          <div className="flex items-center gap-2 px-4 md:px-6 lg:px-8">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                {layer ? (
                  <>
                    <BreadcrumbItem>
                      {unit ? (
                        <BreadcrumbLink render={<Link to={`/${layer}`} />}>
                          {LAYER_TITLES[layer]}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{LAYER_TITLES[layer]}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {unit ? (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>{unit.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                      </>
                    ) : null}
                  </>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbPage>Home</BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:pt-2 md:p-6 lg:pt-2 lg:p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
