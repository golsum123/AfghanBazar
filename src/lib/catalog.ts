import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];
export type Category = T["categories"]["Row"];
export type Product = T["products"]["Row"];
export type ProductImage = T["product_images"]["Row"];
export type SellerProfile = T["seller_profiles"]["Row"];
export type ProductStatus = Database["public"]["Enums"]["product_status"];
export type Currency = Database["public"]["Enums"]["currency_code"];
export type Origin = Database["public"]["Enums"]["origin_country"];

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const CURRENCIES: Currency[] = ["AFN", "INR"];
export const ORIGINS: Origin[] = ["Afghanistan", "India"];
export const STATUSES: ProductStatus[] = ["active", "inactive", "out_of_stock"];

export const STATUS_LABEL: Record<ProductStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  out_of_stock: "Out of stock",
};

export function formatPrice(price: number, currency: Currency) {
  return `${currency === "INR" ? "₹" : "؋"} ${Number(price).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function isAvailable(p: Pick<Product, "status" | "stock_quantity">) {
  return p.status === "active" && p.stock_quantity > 0;
}

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  // Keep "Other" last
  return (data ?? []).sort((a, b) => (a.slug === "other" ? 1 : b.slug === "other" ? -1 : 0));
}

/** Turns storage paths into short-lived signed URLs (bucket is private). */
export async function signImagePaths(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUrls(unique, 60 * 60);
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

/** Loads store names for a set of seller user ids (only approved ones are visible publicly). */
export async function fetchStoreNames(sellerIds: string[]) {
  const ids = [...new Set(sellerIds)];
  if (ids.length === 0) return {} as Record<string, SellerProfile>;
  const { data } = await supabase.from("seller_profiles").select("*").in("user_id", ids);
  const map: Record<string, SellerProfile> = {};
  for (const s of data ?? []) map[s.user_id] = s;
  return map;
}

export async function uploadProductImages(userId: string, productId: string, files: File[], startAt = 0) {
  for (const [i, file] of files.entries()) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${productId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type });
    if (upErr) throw upErr;
    const { error } = await supabase
      .from("product_images")
      .insert({ product_id: productId, storage_path: path, url: path, position: startAt + i });
    if (error) throw error;
  }
}

/** Loads products by id plus a signed cover image URL for each. Hidden products are simply omitted by RLS. */
export async function fetchProductsWithCovers(ids: string[]) {
  if (ids.length === 0) return { products: {} as Record<string, Product>, covers: {} as Record<string, string> };
  const { data } = await supabase
    .from("products")
    .select("*, product_images(storage_path, position)")
    .in("id", ids);
  const products: Record<string, Product> = {};
  const coverPath: Record<string, string> = {};
  for (const row of data ?? []) {
    const { product_images, ...p } = row;
    products[p.id] = p as Product;
    const first = [...(product_images ?? [])].sort((a, b) => a.position - b.position)[0];
    if (first) coverPath[p.id] = first.storage_path;
  }
  const signed = await signImagePaths(Object.values(coverPath));
  const covers: Record<string, string> = {};
  for (const [id, path] of Object.entries(coverPath)) if (signed[path]) covers[id] = signed[path];
  return { products, covers };
}
