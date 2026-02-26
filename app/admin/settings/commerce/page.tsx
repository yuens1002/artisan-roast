"use client";

import { ExternalLink } from "lucide-react";
import { SettingsField } from "@/app/admin/_components/forms/SettingsField";
import { SettingsSection } from "@/app/admin/_components/forms/SettingsSection";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { OptionCardGroup } from "@/app/admin/_components/forms/OptionCardGroup";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { WeightUnitOption } from "@/lib/weight-unit";

export default function CommerceSettingsPage() {
  return (
    <div className="space-y-8">
      <PageTitle
        title="Commerce Settings"
        subtitle="Configure product display and commerce-related settings"
      />

      <SettingsSection
        title="Promotion Codes"
        description="Allow customers to enter promotion codes during checkout"
      >
        <SettingsField<boolean>
          endpoint="/api/admin/settings/promo-codes"
          field="enabled"
          label="Enable Promotion Codes"
          autoSave
          defaultValue={false}
          input={(value, onChange) => (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={Boolean(value)}
                    onCheckedChange={(checked) => onChange(checked)}
                  />
                  <Label className="text-sm text-muted-foreground">
                    {value
                      ? "Promotion codes are enabled"
                      : "Promotion codes are disabled"}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Show a promotion code input field on the Stripe Checkout page
                </p>
              </div>
              <div className="space-y-1">
                <a
                  href="https://dashboard.stripe.com/coupons"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Stripe Dashboard
                  <ExternalLink className="h-3 w-3" />
                </a>
                <p className="text-sm text-muted-foreground">
                  Create and manage promotion codes
                </p>
              </div>
            </div>
          )}
        />
      </SettingsSection>

      <SettingsSection
        title="Weight Display Unit"
        description="Choose how product weights are displayed throughout your store"
      >
        <SettingsField
          endpoint="/api/admin/settings/weight-unit"
          field="weightUnit"
          label="Weight Display Unit"
          description="Choose how product weights are displayed throughout your store"
          autoSave
          input={(value, onChange) => (
            <OptionCardGroup
              value={(value as string) || WeightUnitOption.METRIC}
              onValueChange={onChange}
              options={[
                {
                  value: WeightUnitOption.IMPERIAL,
                  title: "Imperial (oz / lb)",
                  description:
                    "Display weights in ounces and pounds (e.g., 12 oz, 2 lb)",
                },
                {
                  value: WeightUnitOption.METRIC,
                  title: "Metric (g / kg)",
                  description:
                    "Display weights in grams and kilograms (e.g., 340 g, 1 kg)",
                },
              ]}
              wrapperClassName="w-full max-w-xl md:max-w-2xl"
            />
          )}
        />
      </SettingsSection>

      <SettingsSection
        title="Product Reviews"
        description="Configure product review settings and email notifications"
      >
        <SettingsField<boolean>
          endpoint="/api/admin/settings/reviews"
          field="enabled"
          label="Enable Product Reviews"
          autoSave
          defaultValue={false}
          input={(value, onChange) => (
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={Boolean(value)}
                  onCheckedChange={(checked) => onChange(checked)}
                />
                <Label className="text-sm text-muted-foreground">
                  {value
                    ? "Product reviews are enabled"
                    : "Product reviews are disabled"}
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Allow customers to submit reviews on product pages
              </p>
            </div>
          )}
        />
        <SettingsField<number>
          endpoint="/api/admin/settings/reviews"
          field="emailDelayDays"
          label="Review Request Email Delay"
          description="Days after delivery before sending a review request email"
          autoSave
          defaultValue={7}
          input={(value, onChange) => (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={90}
                value={value ?? 7}
                onChange={(e) => onChange(parseInt(e.target.value, 10) || 7)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          )}
        />
        <SettingsField<boolean>
          endpoint="/api/admin/settings/reviews"
          field="notifyOnNewReview"
          label="Email on New Review"
          autoSave
          defaultValue={false}
          input={(value, onChange) => (
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={Boolean(value)}
                  onCheckedChange={(checked) => onChange(checked)}
                />
                <Label className="text-sm text-muted-foreground">
                  {value
                    ? "Admin email notifications are enabled"
                    : "Admin email notifications are disabled"}
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Send an email to all admin users when a new review is submitted
              </p>
            </div>
          )}
        />
      </SettingsSection>
    </div>
  );
}
