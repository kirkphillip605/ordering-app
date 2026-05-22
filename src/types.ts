export interface User { id: string; username: string; }
export interface Vendor { id: string; name: string; description: string; }
export interface Unit { id: string; name: string; abbreviation: string; }
export interface ProductVariant {
  id?: string;
  name: string;
  upcs: string[];
}
export interface Product {
  id: string; name: string; description: string; upc?: string;
  brand?: string; category: string; isFrequentlyOrdered: boolean;
  variants: ProductVariant[];
  vendorId: string | null; vendor_name?: string; vendorIds?: string[];
}
export interface PurchaseList {
  id: string; name: string; status: 'draft' | 'ordered';
  itemCount?: number; createdAt?: string;
  isArchived?: string; orderDate?: string;
}
export interface PurchaseListItem {
  id: string; purchaseListId: string; productId: string;
  product_name: string; product_upc: string; quantity: number;
  variantId?: string; variant_name?: string;
  unitId: string; unit_name: string; unit_abbreviation: string;
}
