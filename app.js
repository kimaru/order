const PROJECT_ID = "whatsapp-eco-engine-80882";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function parseFirestore(valObj) {
  if (!valObj) return null;
  if ("stringValue" in valObj) return valObj.stringValue;
  if ("integerValue" in valObj) return parseInt(valObj.integerValue, 10);
  if ("doubleValue" in valObj) return parseFloat(valObj.doubleValue);
  if ("booleanValue" in valObj) return valObj.booleanValue;
  if ("arrayValue" in valObj) return (valObj.arrayValue.values || []).map(parseFirestore);
  if ("mapValue" in valObj) {
    const res = {};
    for (const [k, v] of Object.entries(valObj.mapValue.fields || {})) res[k] = parseFirestore(v);
    return res;
  }
  return null;
}

async function fetchStorefront(storeId) {
  try {
    const res = await fetch(`${FIRESTORE_BASE_URL}/stores/${storeId}`);
    if (!res.ok) throw new Error(`Store not found (Status ${res.status})`);
    const doc = await res.json();
    const data = {};
    for (const [k, v] of Object.entries(doc.fields || {})) data[k] = parseFirestore(v);
    return data;
  } catch (err) {
    console.error("Storefront Error:", err);
    return null;
  }
}

function sendWhatsAppOrder(phone, prodName, price) {
  const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
  if (!cleanPhone) return alert("Store phone number is missing.");
  const text = encodeURIComponent(`Hello! I would like to order: ${prodName} (KSh ${price})`);
  window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
}

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const storeId = params.get("store") || "perfumescentre";

  const store = await fetchStorefront(storeId);
  const titleEl = document.getElementById("store-title");
  const gridEl = document.getElementById("catalog-grid");

  if (!store) {
    if (titleEl) titleEl.innerText = "Store Not Found";
    if (gridEl) gridEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Unable to load catalog. Please verify the URL or publish store settings from the dashboard.</p>`;
    return;
  }

  if (titleEl) titleEl.innerText = store.storeName || "Welcome to Our Store";

  if (gridEl) {
    const products = store.products || [];
    if (products.length === 0) {
      gridEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No products available right now.</p>`;
      return;
    }

    gridEl.innerHTML = products.map((p) => `
      <div class="card">
        <img src="${p.image || 'https://via.placeholder.com/200'}" alt="${p.name}">
        <h3>${p.name}</h3>
        <div class="price">KSh ${p.price || 0}</div>
        <button class="btn-buy" onclick="sendWhatsAppOrder('${store.whatsappNumber}', '${p.name}', ${p.price || 0})">Order via WhatsApp</button>
      </div>
    `).join("");
  }
});
