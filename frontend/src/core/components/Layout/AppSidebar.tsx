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
  Avatar,
  AvatarFallback,
} from "@components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import {
  type LucideIcon,
  Home,
  Users,
  Building2,
  KeyRound,
  Shield,
  FileText,
  LogOut,
  Star,
  ChevronsUpDown,
  Blocks,
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

function getInitials(email: string): string {
  const [local] = email.split("@");
  return (local?.slice(0, 2) || "?").toUpperCase();
}

export function AppSidebar({
  userEmail,
  tenantName,
}: {
  userEmail?: string;
  tenantName?: string | null;
}) {
  const { signOut, hasPermission } = useAuth();
  const router = useRouter();

  const routeRules = listRouteRules();
  const generalRoutes = routeRules.filter((rule) => GENERAL_MODULES.includes(rule.module));
  const permissionRoutes = routeRules.filter((rule) => !GENERAL_MODULES.includes(rule.module));

  return (
    <Sidebar>
      <SidebarHeader>
        {/* Placeholder de marca — este é um template sem logo real. Troque o
            quadrado+ícone por um <img> da logo do produto quando houver uma;
            o nome "Alicerce" também é só o nome do template. Não é um botão
            (nada para clicar aqui) — por isso não usa SidebarMenuButton. */}
        <div className="flex items-center gap-2 p-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Blocks className="size-3.5" />
          </span>
          <span className="text-page-title">Alicerce</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/dashboard" passHref>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto">
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[0.65rem]">
                      {userEmail ? getInitials(userEmail) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col text-left">
                    <span className="truncate text-sm">{userEmail ?? "Usuário"}</span>
                    {tenantName ? (
                      <span className="truncate text-xs text-muted-foreground">{tenantName}</span>
                    ) : null}
                  </span>
                  <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="truncate text-sm font-medium">{userEmail ?? "Usuário"}</span>
                  {tenantName ? (
                    <span className="truncate text-xs text-muted-foreground">{tenantName}</span>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    signOut();
                    router.replace("/auth/login");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}