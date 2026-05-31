import { Input, Select } from "@/components/ui/index";
import { SEX_OPTIONS } from "../user.constants";
import { FormattedMessage, useIntl } from "react-intl";

export default function UsersForm() {
    const intl = useIntl();

    return (
        <div className="space-y-4">
            <Input placeholder={intl.formatMessage({ id: "user.name", defaultMessage: "Name" })} />
            <Input placeholder={intl.formatMessage({ id: "user.email", defaultMessage: "Email" })} type="email" />
            <Input placeholder={intl.formatMessage({ id: "user.password", defaultMessage: "Password" })} type="password" />
            <Select
                options={[
                    { label: intl.formatMessage({ id: "user.gender", defaultMessage: "Gender" }), value: "" },
                    ...SEX_OPTIONS.map(opt => ({
                        label: intl.formatMessage({ id: opt.labelKey }),
                        value: opt.value
                    }))
                ]}
            />
        </div>
    );

}
