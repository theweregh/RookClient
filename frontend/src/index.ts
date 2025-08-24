import { fetchItems, fetchItemById } from "./api/ItemsApi";
import { fetchAuctions } from "./api/AuctionsApi";

async function main() {
  try {
    console.log("🔹 Obteniendo items del inventario...");
    const items = await fetchItems();
    console.log("📦 Items:", items);

    if (items.length > 0) {
  const first = items[0];
  if (first) { // TS ya no dará error
    const firstItem = await fetchItemById(first.id);
    console.log("📦 Detalle del primer item:", firstItem);
  }
}


    console.log("🔹 Obteniendo subastas abiertas...");
    const auctions = await fetchAuctions();
    console.log("📌 Subastas abiertas:", auctions);
  } catch (err) {
    console.error("❌ Error en cliente:", err);
  }
}

main();


