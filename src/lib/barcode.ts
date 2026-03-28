export async function lookupBarcode(barcode: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,product_name_he`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1) return null; // product not found in database

    const product = data.product;
    // Prefer Hebrew name, fall back to default name
    return product.product_name_he || product.product_name || null;
  } catch {
    return null;
  }
}
