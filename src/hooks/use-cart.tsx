import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface CartContextValue {
  count: number;
  wishlistIds: Set<string>;
  refresh: () => Promise<void>;
  /** Adds qty to the existing cart line (capped by the database at available stock). */
  addToCart: (productId: string, qty?: number) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<boolean>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      setWishlistIds(new Set());
      return;
    }
    const [{ data: cart }, { data: wish }] = await Promise.all([
      supabase.from("cart_items").select("quantity").eq("user_id", user.id),
      supabase.from("wishlist_items").select("product_id").eq("user_id", user.id),
    ]);
    setCount((cart ?? []).reduce((s, r) => s + r.quantity, 0));
    setWishlistIds(new Set((wish ?? []).map((w) => w.product_id)));
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addToCart = useCallback(
    async (productId: string, qty = 1) => {
      if (!user) throw new Error("Please sign in");
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();
      const { error } = existing
        ? await supabase.from("cart_items").update({ quantity: existing.quantity + qty }).eq("id", existing.id)
        : await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity: qty });
      if (error) throw new Error(error.message);
      await refresh();
    },
    [user, refresh],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!user) throw new Error("Please sign in");
      const saved = wishlistIds.has(productId);
      const { error } = saved
        ? await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("product_id", productId)
        : await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: productId });
      if (error) throw new Error(error.message);
      await refresh();
      return !saved;
    },
    [user, wishlistIds, refresh],
  );

  const value = useMemo(
    () => ({ count, wishlistIds, refresh, addToCart, toggleWishlist }),
    [count, wishlistIds, refresh, addToCart, toggleWishlist],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
