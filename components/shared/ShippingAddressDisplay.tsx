import { formatPhoneNumber, getCountryName } from "./record-utils";

interface ShippingAddressDisplayProps {
  recipientName?: string | null;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  showCountry?: boolean;
  /** When "full", renders spelled-out country name (e.g., "US" -> "United States"). Default: "code". */
  countryDisplayFormat?: "code" | "full";
  fallbackText?: string;
  mutedClassName?: string;
  /** When true (default), renders address/country/phone in muted style. */
  muteAddressLines?: boolean;
}

export function ShippingAddressDisplay({
  recipientName,
  phone,
  street,
  city,
  state,
  postalCode,
  country,
  showCountry,
  countryDisplayFormat = "code",
  fallbackText = "Store Pickup",
  mutedClassName = "text-muted-foreground",
  muteAddressLines,
}: ShippingAddressDisplayProps) {
  if (!street) {
    return (
      <span className="text-sm">
        {fallbackText}
      </span>
    );
  }

  const addressLineClass = muteAddressLines ? mutedClassName : undefined;
  const displayCountry =
    showCountry && country
      ? countryDisplayFormat === "full"
        ? getCountryName(country)
        : country
      : null;

  return (
    <div className="text-sm">
      {recipientName && <div>{recipientName}</div>}
      <div className={`text-xs ${addressLineClass ?? ""}`}>{street}</div>
      <div className={`text-xs ${addressLineClass ?? ""}`}>
        {city}, {state} {postalCode}
      </div>
      {displayCountry && (
        <div className={`text-xs ${addressLineClass ?? ""}`}>{displayCountry}</div>
      )}
      {phone && (
        <div className={`text-xs ${addressLineClass ?? ""}`}>
          {formatPhoneNumber(phone)}
        </div>
      )}
    </div>
  );
}
