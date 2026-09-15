import { Platform } from 'react-native';

export interface ChimeraPackage {
  identifier: string;
  packageType: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'CUSTOM';
  product: {
    identifier: string;
    description: string;
    title: string;
    priceString: string;
    price: number;
    currencyCode: string;
  };
}

export interface ChimeraCustomerInfo {
  entitlements: {
    active: Record<string, { identifier: string; isActive: boolean; expirationDate?: string }>;
  };
  isPro: boolean;
}

let isPurchasesConfigured = false;
let PurchasesSDK: any = null;

// Dynamically import react-native-purchases if on native iOS/Android
async function getPurchasesSDK() {
  if (PurchasesSDK) return PurchasesSDK;
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    try {
      const module = await import('react-native-purchases');
      PurchasesSDK = module.default || module;
      return PurchasesSDK;
    } catch (e) {
      console.warn('[Purchases] Native purchases module not linked in current environment:', e);
    }
  }
  return null;
}

export class PurchasesService {
  private static listeners: Array<(info: ChimeraCustomerInfo) => void> = [];
  private static cachedCustomerInfo: ChimeraCustomerInfo = {
    entitlements: { active: {} },
    isPro: false,
  };

  /**
   * Initializes RevenueCat Purchases SDK
   */
  public static async initialize(apiKey?: string): Promise<void> {
    const key =
      apiKey ||
      (Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY);

    if (!key) {
      console.warn('[Purchases] RevenueCat API key not configured in environment.');
      return;
    }

    const sdk = await getPurchasesSDK();
    if (sdk && !isPurchasesConfigured) {
      try {
        await sdk.configure({ apiKey: key });
        isPurchasesConfigured = true;

        sdk.addCustomerInfoUpdateListener((customerInfo: any) => {
          const isPro = !!customerInfo.entitlements.active['chimera_pro'];
          this.cachedCustomerInfo = {
            entitlements: customerInfo.entitlements,
            isPro,
          };
          this.notifyListeners(this.cachedCustomerInfo);
        });

        const initialInfo = await sdk.getCustomerInfo();
        const isPro = !!initialInfo.entitlements.active['chimera_pro'];
        this.cachedCustomerInfo = {
          entitlements: initialInfo.entitlements,
          isPro,
        };
        console.log('[Purchases] Initialized successfully. IsPro:', isPro);
      } catch (err) {
        console.warn('[Purchases] Initialization error:', err);
      }
    }
  }

  /**
   * Queries dynamic Offerings from RevenueCat (Never hardcode pricing)
   */
  public static async getOfferings(): Promise<ChimeraPackage[]> {
    const sdk = await getPurchasesSDK();
    if (sdk && isPurchasesConfigured) {
      try {
        const offerings = await sdk.getOfferings();
        if (offerings.current && offerings.current.availablePackages) {
          return offerings.current.availablePackages.map((pkg: any) => ({
            identifier: pkg.identifier,
            packageType: pkg.packageType,
            product: {
              identifier: pkg.product.identifier,
              title: pkg.product.title,
              description: pkg.product.description,
              priceString: pkg.product.priceString,
              price: pkg.product.price,
              currencyCode: pkg.product.currencyCode,
            },
          }));
        }
      } catch (err) {
        console.warn('[Purchases] Error fetching remote offerings:', err);
      }
    }

    // Explicit unavailable state when native SDK or offerings are unavailable
    return [];
  }

  /**
   * Initiates in-app purchase via RevenueCat
   */
  public static async purchasePackage(pkg: ChimeraPackage): Promise<ChimeraCustomerInfo> {
    const sdk = await getPurchasesSDK();
    if (sdk && isPurchasesConfigured) {
      try {
        const { customerInfo } = await sdk.purchasePackage(pkg);
        const isPro = !!customerInfo.entitlements.active['chimera_pro'];
        this.cachedCustomerInfo = {
          entitlements: customerInfo.entitlements,
          isPro,
        };
        this.notifyListeners(this.cachedCustomerInfo);
        return this.cachedCustomerInfo;
      } catch (err: any) {
        if (err.userCancelled) {
          throw new Error('USER_CANCELLED');
        }
        throw err;
      }
    }

    // Strictly disallow fake purchase execution or local entitlement granting
    throw new Error('Purchases are temporarily unavailable. Please try again.');
  }

  /**
   * Restores prior purchases
   */
  public static async restorePurchases(): Promise<ChimeraCustomerInfo> {
    const sdk = await getPurchasesSDK();
    if (sdk && isPurchasesConfigured) {
      try {
        const customerInfo = await sdk.restorePurchases();
        const isPro = !!customerInfo.entitlements.active['chimera_pro'];
        this.cachedCustomerInfo = {
          entitlements: customerInfo.entitlements,
          isPro,
        };
        this.notifyListeners(this.cachedCustomerInfo);
        return this.cachedCustomerInfo;
      } catch (err) {
        throw err;
      }
    }

    throw new Error('Purchases are temporarily unavailable. Please try again.');
  }

  public static isPro(): boolean {
    return this.cachedCustomerInfo.isPro;
  }

  public static subscribe(listener: (info: ChimeraCustomerInfo) => void): () => void {
    this.listeners.push(listener);
    listener(this.cachedCustomerInfo);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notifyListeners(info: ChimeraCustomerInfo): void {
    for (const listener of this.listeners) {
      listener(info);
    }
  }
}
