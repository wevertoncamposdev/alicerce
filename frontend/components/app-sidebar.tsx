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
  SidebarMenuBadge,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarSeparator,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  User2,
  Home,
  Users,
  Building2,
  ChevronDown,
  KeyRound,
  Shield,
  FileText,
  LogOut,
} from "lucide-react";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 font-bold text-lg">
          <User2 className="w-5 h-5" /> SaaS Admin
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/main" passHref>
                  <SidebarMenuButton asChild>
                    <span className="flex items-center">
                      <Home className="mr-2 h-4 w-4" />
                      Dashboard
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/main/users" passHref>
                  <SidebarMenuButton asChild>
                    <span className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      Usuários
                    </span>
                  </SidebarMenuButton>
                </Link>
                <SidebarMenuBadge>5</SidebarMenuBadge>
                <SidebarMenuAction>
                  <ChevronDown className="w-4 h-4" />
                </SidebarMenuAction>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <Link href="/main/users/admins" passHref>
                      <SidebarMenuButton asChild size="sm">
                        <span>Admins</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <Link href="/main/users/guests" passHref>
                      <SidebarMenuButton asChild size="sm">
                        <span>Guests</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/main/tenants" passHref>
                  <SidebarMenuButton asChild>
                    <span className="flex items-center">
                      <Building2 className="mr-2 h-4 w-4" />
                      Tenants
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Permissões</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/main/roles" passHref>
                  <SidebarMenuButton asChild>
                    <span className="flex items-center">
                      <KeyRound className="mr-2 h-4 w-4" />
                      Papéis
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/main/permissions" passHref>
                  <SidebarMenuButton asChild>
                    <span className="flex items-center">
                      <Shield className="mr-2 h-4 w-4" />
                      Permissões
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/main/audit" passHref>
                  <SidebarMenuButton asChild>
                    <span className="flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      Auditoria
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}