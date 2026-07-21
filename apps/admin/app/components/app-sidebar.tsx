'use client';

import { Gamepad2, GraduationCap, Keyboard } from 'lucide-react';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router';

import { NavMain } from '~/components/nav-main';
import { NavUser } from '~/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '~/components/ui/sidebar';
import { LAYER_TITLES, type Layer, type SidebarUnit, unitsByLayer } from '~/lib/game';

import { NavWords } from './nav-words';

const layerConfig: { layer: Layer; icon: React.ReactNode }[] = [
  { layer: 'education', icon: <GraduationCap /> },
  { layer: 'typing', icon: <Keyboard /> },
  { layer: 'game', icon: <Gamepad2 /> },
];

export function AppSidebar({
  units = [],
  isLoading = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & { units?: SidebarUnit[]; isLoading?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const grouped = unitsByLayer(units);
  const navMain = layerConfig.map(({ layer, icon }) => {
    const url = `/${layer}`;
    return {
      title: LAYER_TITLES[layer],
      url,
      icon,
      isActive: location.pathname === url,
      items: grouped[layer].map((unit) => {
        const unitUrl = `/${layer}/${unit.id}`;
        return {
          title: unit.title,
          url: unitUrl,
          isActive: location.pathname === unitUrl,
        };
      }),
    };
  });

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Sozler Saylisi" onClick={() => navigate('/')}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Gamepad2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate text-base font-bold">Sozler Saylisi</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavWords />
        <NavMain items={navMain} isLoading={isLoading} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
