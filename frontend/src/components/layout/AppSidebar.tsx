"use client";

import Link from "next/link";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarFooter,
} from "@components/ui/sidebar";
import {
  type LucideIcon,
  User2,
  Home,
  Users,
  Building2,
  KeyRound,
  Shield,
  FileText,
  CheckSquare2,
  LogOut,
  Star
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { listRouteRules, RouteAccessMeta } from "@lib/authz";

const MODULE_ICONS: Record<RouteAccessMeta["module"], LucideIcon> = {
  users: Users,
  favorites: Star,
  tenants: Building2,
  roles: KeyRound,
  permissions: Shield,
  audit: FileText,
  tasks: CheckSquare2,
};

const GENERAL_MODULES: RouteAccessMeta["module"][] = ["users", "tenants"];

function renderNavLabel(title: string) {
  if (title === "Papeis") {
    return "Papéis";
  }

  if (title === "Permissoes") {
    return "Permissões";
  }

  return title;
}

function NavItem({
  href,
  label,
  icon: Icon,
  disabled,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled: boolean;
}) {
  if (!disabled) {
    return (
      <Link href={href} passHref>
        <SidebarMenuButton asChild>
          <span className="flex items-center">
            <Icon className="mr-2 h-2 w-2" />
            {label}
          </span>
        </SidebarMenuButton>
      </Link>
    );
  }

  return (
    <SidebarMenuButton disabled>
      <span className="flex items-center opacity-50">
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </span>
    </SidebarMenuButton>
  );
}

export function AppSidebar() {
  const { signOut, hasPermission } = useAuth();
  const router = useRouter();

  const routeRules = listRouteRules();
  const generalRoutes = routeRules.filter((rule) => GENERAL_MODULES.includes(rule.module));
  const permissionRoutes = routeRules.filter((rule) => !GENERAL_MODULES.includes(rule.module));

  return (
    <Sidebar>
      <SidebarHeader>

      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/" passHref>
                  <SidebarMenuButton asChild>
                    <span className="flex items-center">
                      <Home className="mr-2 h-4 w-4" />
                      Dashboard
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              {generalRoutes.map((route) => (
                <SidebarMenuItem key={route.prefix}>
                  <NavItem
                    href={route.prefix}
                    label={renderNavLabel(route.title)}
                    icon={MODULE_ICONS[route.module]}
                    disabled={!hasPermission(route.permission)}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Permissões</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {permissionRoutes.map((route) => (
                <SidebarMenuItem key={route.prefix}>
                  <NavItem
                    href={route.prefix}
                    label={renderNavLabel(route.title)}
                    icon={MODULE_ICONS[route.module]}
                    disabled={!hasPermission(route.permission)}
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                signOut();
                router.replace("/auth/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}