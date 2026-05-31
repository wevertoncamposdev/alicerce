"use client";
import UsersTable from "@/features/users/components/UsersTable";
import { FormattedMessage } from 'react-intl';
import { Button, Separator } from "@/components/ui/index";
import UsersForm from "@/features/users/components/UsersForm";


export default function UsersPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">
        <FormattedMessage id="user.title" />
      </h2>
      <Button><FormattedMessage id="user.actions.add" /></Button>
      <Separator />
      <UsersForm />
      <Separator />
      <UsersTable />
      <Separator />
    </div>
  );
}
