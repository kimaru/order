// ==========================================
// AUDITED CUSTOMER STOREFRONT CONTROLLER
// Project ID: whatsapp-eco-engine-80882
// ==========================================

const PROJECT_ID = "whatsapp-eco-engine-80882";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let storeData = null;
let selectedCategory = "ALL";

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
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const doc = await res.json();
    const data = {};
    for (const [k, v] of Object.entries(doc.fields || {})) data[k] = parseFirestore(v);
    return data;
  } catch (err) {
    console.error("Storefront Fetch Error:", err);
    return null;
  }
}

window.filterCategory = function(catName) {
  selectedCategory = catName;
  renderStorefront();
};

window.sendWhatsAppOrder = function(prodIndex) {
  if (!storeData) return;
  const product = storeData.products[prodIndex];
  const selectEl = document.getElementById(`variant-select-${prodIndex}`);
  
  let selectedVariant = "Standard";
  let selectedPrice = 0;

  if (selectEl) {
    const parts = selectEl.value.split("|");
    selectedVariant = parts[0];
    selectedPrice = parts[1];
  }

  const cleanPhone = (storeData.whatsappNumber || "").replace(/[^0-9]/g, "");
  if (!cleanPhone) return alert("Store WhatsApp number is missing.");

  const message = `Hello ${storeData.storeName || 'Store'}!\nI would like to order:\n- *${product.name}* (${selectedVariant}) - KSh ${selectedPrice}\n\nPlease confirm availability and payment details.`;
  
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
};

function renderStorefront() {
  const gridEl = document.getElementById("catalog-grid");
  const catBar = document.getElementById("categories-bar");

  if (!storeData || !gridEl) return;

  // Render Categories Bar
  const categories = ["ALL", ...(storeData.categories || [])];
  if (catBar) {
    catBar.innerHTML = categories.map(c => `
      <div class="cat-chip ${selectedCategory === c ? 'active' : ''}" onclick="filterCategory('${c}')">${c}</div>
    `).join("");
  }

  // Filter Products
  const products = (storeData.products || []).filter(p => {
    if (selectedCategory === "ALL") return true;
    return p.category === selectedCategory;
  });

  if (products.length === 0) {
    gridEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No items available in this category.</p>`;
    return;
  }

  gridEl.innerHTML = products.map((p, idx) => {
    const variants = p.variants || [];
    const hasVariants = variants.length > 0;

    return `
      <div class="card">
        <div>
          <img src="${p.image || 'https://via.placeholder.com/200'}" alt="${p.name}">
          <h3>${p.name}</h3>
          
          ${hasVariants ? `
            <select id="variant-select-${idx}" class="price-select">
              ${variants.map(v => `<option value="${v.size}|${v.price}">${v.size} - KSh ${v.price}</option>`).join("")}
            </select>
          ` : `<div style="font-weight:bold; color:#27ae60; margin:10px 0;">Contact for Price</div>`}
        </div>

        <button class="btn-buy" ${!p.inStock ? 'disabled' : ''} onclick="sendWhatsAppOrder(${idx})">
          ${p.inStock ? 'Order via WhatsApp' : 'Out of Stock'}
        </button>
      </div>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const storeId = params.get("store") || "perfumescentre";

  storeData = await fetchStorefront(storeId);

  const titleEl = document.getElementById("store-title");
  const sloganEl = document.getElementById("store-slogan");
  const logoEl = document.getElementById("store-logo");

  if (!storeData) {
    if (titleEl) titleEl.innerText = "Store Not Found";
    return;
  }

  if (titleEl) titleEl.innerText = storeData.storeName || "Storefront";
  if (sloganEl && storeData.slogan) sloganEl.innerText = storeData.slogan;
  if (logoEl && storeData.logoUrl) {
    logoEl.src = storeData.logoUrl;
    logoEl.style.display = "inline-block";
  }

  renderStorefront();
});
