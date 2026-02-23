"use client";

import { ExternalLink, Info } from "lucide-react";
import { SettingsSection } from "@/app/admin/_components/forms/SettingsSection";
import { PageTitle } from "@/app/admin/_components/forms/PageTitle";
import { SettingsField } from "@/app/admin/_components/forms/SettingsField";
import { InputGroupInput } from "@/components/ui/forms/InputGroup";

export default function ShippingSettingsPage() {
  return (
    <div className="space-y-8">
      <PageTitle
        title="Shipping & Carriers"
        subtitle="Configure carrier API keys for automated delivery tracking"
      />

      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <span>
          Carrier API keys enable automatic delivery status updates.
          Orders shipped with a configured carrier will have their status
          checked and customers notified on delivery. This feature relies
          on a scheduled task (cron job) configured through your hosting
          provider.
        </span>
      </div>

      <SettingsSection
        title="USPS"
        description={
          <>
            Web Tools User ID for tracking.{" "}
            <a
              href="https://www.usps.com/business/web-tools-apis/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
            >
              Register at usps.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </>
        }
      >
        <SettingsField
          endpoint="/api/admin/settings/carriers"
          field="carrier_usps_user_id"
          label="USPS Web Tools User ID"
          input={(value, onChange) => (
            <InputGroupInput
              type="password"
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter USPS API key"
            />
          )}
        />
      </SettingsSection>

      <SettingsSection
        title="UPS"
        description={
          <>
            Client credentials for the UPS Tracking API.{" "}
            <a
              href="https://developer.ups.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
            >
              UPS Developer Portal
              <ExternalLink className="h-3 w-3" />
            </a>
          </>
        }
      >
        <SettingsField
          endpoint="/api/admin/settings/carriers"
          field="carrier_ups_client_id"
          label="UPS Client ID"
          input={(value, onChange) => (
            <InputGroupInput
              type="password"
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter UPS client ID"
            />
          )}
        />
        <SettingsField
          endpoint="/api/admin/settings/carriers"
          field="carrier_ups_client_secret"
          label="UPS Client Secret"
          input={(value, onChange) => (
            <InputGroupInput
              type="password"
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter UPS client secret"
            />
          )}
        />
      </SettingsSection>

      <SettingsSection
        title="FedEx"
        description={
          <>
            API credentials for the FedEx Track API.{" "}
            <a
              href="https://developer.fedex.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
            >
              FedEx Developer Portal
              <ExternalLink className="h-3 w-3" />
            </a>
          </>
        }
      >
        <SettingsField
          endpoint="/api/admin/settings/carriers"
          field="carrier_fedex_api_key"
          label="FedEx API Key"
          input={(value, onChange) => (
            <InputGroupInput
              type="password"
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter FedEx API key"
            />
          )}
        />
        <SettingsField
          endpoint="/api/admin/settings/carriers"
          field="carrier_fedex_secret_key"
          label="FedEx Secret Key"
          input={(value, onChange) => (
            <InputGroupInput
              type="password"
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter FedEx secret key"
            />
          )}
        />
      </SettingsSection>

      <SettingsSection
        title="DHL"
        description={
          <>
            API key for the DHL Shipment Tracking API.{" "}
            <a
              href="https://developer.dhl.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
            >
              DHL Developer Portal
              <ExternalLink className="h-3 w-3" />
            </a>
          </>
        }
      >
        <SettingsField
          endpoint="/api/admin/settings/carriers"
          field="carrier_dhl_api_key"
          label="DHL API Key"
          input={(value, onChange) => (
            <InputGroupInput
              type="password"
              value={value as string}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter DHL API key"
            />
          )}
        />
      </SettingsSection>
    </div>
  );
}
