"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthUserProfile } from "@/features/auth/auth.service";

export function AppShell({ user, children }: { user: AuthUserProfile; children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 p-4">
                <SidebarTrigger />
                {children}
            </main>
        </SidebarProvider>
    );
}