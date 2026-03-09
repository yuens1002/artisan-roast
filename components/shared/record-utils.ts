import { parsePhoneNumberFromString } from "libphonenumber-js";

export function formatPhoneNumber(phone: string): string {
  const parsed = parsePhoneNumberFromString(phone, "US");
  return parsed ? parsed.formatInternational() : phone;
}

export function getStatusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "PROCESSING":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "DELIVERED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "OUT_FOR_DELIVERY":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "SHIPPED":
    case "PICKED_UP":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "ACTIVE":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "PAUSED":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "CANCELLED":
    case "CANCELED":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "PAST_DUE":
    case "FAILED":
      return "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "PICKED_UP":
      return "Picked Up";
    case "OUT_FOR_DELIVERY":
      return "Out for Delivery";
    case "DELIVERED":
      return "Delivered";
    case "PROCESSING":
      return "Processing";
    case "CANCELLED":
      return "Canceled";
    case "PAST_DUE":
      return "Past Due";
    case "FAILED":
      return "Unfulfilled";
    default:
      return status.charAt(0) + status.slice(1).toLowerCase();
  }
}

export function formatPrice(priceInCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceInCents / 100);
}

/** Map ISO 3166-1 alpha-2 code to full country name. Falls back to the code itself. */
export function getCountryName(code: string | null | undefined): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
