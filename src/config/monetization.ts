/**
 * Void Reader - Monetization & Support Configuration
 * 
 * Configured for non-intrusive monetization:
 * - Developer Gaming Top-up Promotion (kazutogaming)
 * - Community Donation Support (Saweria)
 * 
 * Structured for easy future admin panel controls.
 */

export interface TopupConfig {
  enabled: boolean;
  brand: string;
  title: string;
  subtitle: string;
  buttonText: string;
  url: string;
  bannerImage?: string;
  badge?: string;
}

export interface DonationConfig {
  enabled: boolean;
  provider: string;
  title: string;
  description: string;
  buttonText: string;
  url: string;
  badge?: string;
}

export interface MonetizationConfig {
  topup: TopupConfig;
  donation: DonationConfig;
}

export const MONETIZATION_CONFIG: MonetizationConfig = {
  topup: {
    enabled: true,
    brand: "kazutogaming",
    title: "kazutogaming",
    subtitle: "Top Up Game Cepat & Aman",
    buttonText: "Top Up Sekarang",
    url: "https://kazutogaming.my.id/",
    badge: "Official Partner",
    bannerImage: "",
  },

  donation: {
    enabled: true,
    provider: "Saweria",
    title: "Support Void Reader",
    description: "Help support the development and maintenance of Void Reader.",
    buttonText: "Donate via Saweria",
    url: "https://saweria.co/baguskazuto",
    badge: "Community",
  },
};
