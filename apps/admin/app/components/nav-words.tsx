import { BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar';

export function NavWords() {
  const location = useLocation();
  const url = '/words';

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Words</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            render={<Link to={url} />}
            isActive={location.pathname === url}
            tooltip="Manage Words"
          >
            <BookOpen />
            <span className="font-medium">Manage Words</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
