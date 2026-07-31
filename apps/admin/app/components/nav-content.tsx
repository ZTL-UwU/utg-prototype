import { BookOpen, TextQuote } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '~/components/ui/sidebar';

const contentItems = [
  { title: 'Words', url: '/words', icon: BookOpen },
  { title: 'Sentences', url: '/sentences', icon: TextQuote },
] as const;

export function NavContent() {
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Content</SidebarGroupLabel>
      <SidebarMenu>
        {contentItems.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              render={<Link to={item.url} />}
              isActive={location.pathname === item.url}
              tooltip={item.title}
            >
              <item.icon />
              <span className="font-medium">{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
