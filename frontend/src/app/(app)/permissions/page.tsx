// app/(app)/permissions/page.tsx
import { TypeViewScreen } from "@/screens/TypeViewScreen";

export default function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TypeViewScreen moduleName="permissions" searchParams={searchParams} />;
}

