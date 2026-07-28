const PROJECT_ID = "whatsapp-eco-engine-80882";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

let storeData = null;
let selectedCategory = "ALL";
let cart = []; // Array of { productName, variantSize, price, qty }

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

window.addToCart = function(prodIndex) {
  const product = storeData.products[prodIndex];
  const selectEl = document.getElementById(`variant-select-${prodIndex}`);
  
  let variantSize = "Standard";
  let price = 0;

  if (selectEl) {
    const parts = selectEl.value.split("|");
    variantSize = parts[0];
    price = parseFloat(parts[1]) || 0;
  }

  const existingIndex = cart.findIndex(item => item.productName === product.name && item.variantSize === variantSize);
  
  if (existingIndex > -1) {
    cart[existingIndex].qty += 1;
  } else {
    cart.push({ productName: product.name, variantSize, price, qty: 1 });
  }

  updateCartUI();
};

window.updateQty = function(cartIndex, delta) {
  cart[cartIndex].qty += delta;
  if (cart[cartIndex].qty <= 0) {
    cart.splice(cartIndex, 1);
  }
  updateCartUI();
  renderCartModal();
};

function updateCartUI() {
  const cartBar = document.getElementById("cart-bar");
  const cartCount = document.getElementById("cart-count");
  const cartTotal = document.getElementById("cart-total");
  const modalTotal = document.getElementById("modal-cart-total");

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  if (cartCount) cartCount.innerText = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
  if (cartTotal) cartTotal.innerText = `KSh ${totalPrice.toLocaleString()}`;
  if (modalTotal) modalTotal.innerText = `KSh ${totalPrice.toLocaleString()}`;

  if (cartBar) {
    cartBar.style.display = totalItems > 0 ? "flex" : "none";
  }
}

window.toggleCartModal = function(show) {
  const modal = document.getElementById("cart-modal");
  if (modal) {
    modal.style.display = show ? "flex" : "none";
    if (show) renderCartModal();
  }
};

function renderCartModal() {
  const container = document.getElementById("cart-items-list");
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#6c757d;">Your cart is empty.</p>`;
    return;
  }

  container.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <div>
        <strong>${item.productName}</strong><br>
        <span style="font-size:12px; color:#6c757d;">${item.variantSize} - KSh ${item.price} each</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <button class="qty-btn" onclick="updateQty(${i}, -1)">-</button>
        <span>${item.qty}</span>
        <button class="qty-btn" onclick="updateQty(${i}, 1)">+</button>
      </div>
    </div>
  `).join("");
}

window.sendWhatsAppCartOrder = function() {
  if (!storeData || cart.length === 0) return;

  const cleanPhone = (storeData.whatsappNumber || "").replace(/[^0-9]/g, "");
  if (!cleanPhone) return alert("Store WhatsApp number is missing.");

  let message = `Hello ${storeData.storeName || 'Store'}!\nI would like to order the following items:\n\n`;
  
  let totalPrice = 0;
  cart.forEach(item => {
    const itemTotal = item.price * item.qty;
    totalPrice += itemTotal;
    message += `• *${item.productName}* (${item.variantSize}) x${item.qty} = KSh ${itemTotal.toLocaleString()}\n`;
  });

  message += `\n*Total Amount:* KSh ${totalPrice.toLocaleString()}\n\nPlease confirm availability and payment options.`;
  
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
};

function renderStorefront() {
  const gridEl = document.getElementById("catalog-grid");
  const catBar = document.getElementById("categories-bar");

  if (!storeData || !gridEl) return;

  // Render Categories
  const categories = ["ALL", ...(storeData.categories || [])];
  if (catBar) {
    catBar.innerHTML = categories.map(c => `
      <div class="cat-chip ${selectedCategory === c ? 'active' : ''}" onclick="filterCategory('${c}')">${c}</div>
    `).join("");
  }

  // Multi-Category Filter
  const products = (storeData.products || []).filter(p => {
    if (selectedCategory === "ALL") return true;
    if (Array.isArray(p.categories)) return p.categories.includes(selectedCategory);
    return p.category === selectedCategory;
  });

  if (products.length === 0) {
    gridEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color:#6c757d;">No items available in this category.</p>`;
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
          ` : `<div style="font-weight:bold; color:#27ae60; margin:8px 0; font-size:13px;">Contact for Price</div>`}
        </div>

        <button class="${p.inStock ? 'btn btn-add' : 'btn btn-disabled'}" ${!p.inStock ? 'disabled' : ''} onclick="addToCart(${idx})">
          ${p.inStock ? 'Add to Cart 🛒' : 'Out of Stock'}
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
