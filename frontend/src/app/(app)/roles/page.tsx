// app/(app)/roles/page.tsx
import { TypeViewScreen } from "@core/screens/TypeViewScreen";
export default function RolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TypeViewScreen moduleName="roles" searchParams={searchParams} />;
}