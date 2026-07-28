(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";
  const DEFAULT_STORE_ID = "perfumescentre";

  let currentStoreId = "";
  let storePhone = "";
  let products = [];
  let cart = [];
  let activeCategory = "All";

  const getEl = (id) => document.getElementById(id);

  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  function formatCurrency(amount) {
    return "KSh " + Number(amount).toLocaleString();
  }

  function initStorefront() {
    currentStoreId = getQueryParam("store") || DEFAULT_STORE_ID;
    fetchStoreData(currentStoreId);
  }

  function fetchStoreData(storeId) {
    const statusText = getEl("store-status-text");
    if (statusText) statusText.innerText = "Loading store data...";

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (res.status === 404) {
          throw new Error(`Store "${storeId}" was not found or has not been published yet.`);
        }
        if (!res.ok) throw new Error(`Failed to load store (HTTP ${res.status}).`);
        return res.json();
      })
      .then((doc) => {
        if (!doc || !doc.fields) throw new Error("Store data is empty.");

        const fields = doc.fields;

        storePhone = fields.phone?.stringValue || "";
        const slogan = fields.slogan?.stringValue || "";
        const themeColor = fields.themeColor?.stringValue || "#10b981";
        const logoUrl = fields.logo?.stringValue || "https://placehold.co/100x100?text=Logo";

        // Apply branding
        document.documentElement.style.setProperty("--primary", themeColor);
        const logoImg = getEl("store-logo");
        if (logoImg) logoImg.src = logoUrl;

        const sloganEl = getEl("store-slogan");
        if (sloganEl) sloganEl.innerText = slogan;

        const storeTitleEl = getEl("store-title");
        if (storeTitleEl) storeTitleEl.innerText = storeId.toUpperCase();

        // Parse Items
        const rawItems = fields.items?.arrayValue?.values || [];

        products = rawItems.map((item) => {
          const f = item.mapValue?.fields || {};

          let categories = [];
          if (f.categories?.arrayValue?.values) {
            categories = f.categories.arrayValue.values.map(v => v.stringValue).filter(Boolean);
          } else if (f.category?.stringValue) {
            categories = [f.category.stringValue];
          }

          let variants = [];
          if (f.variants?.arrayValue?.values) {
            variants = f.variants.arrayValue.values.map((v) => {
              const vf = v.mapValue?.fields || {};
              return {
                size: vf.size?.stringValue || "Standard",
                price: Number(vf.price?.doubleValue || vf.price?.integerValue || 0)
              };
            });
          }

          if (variants.length === 0) {
            const fallbackPrice = Number(f.price?.doubleValue || f.price?.integerValue || 0);
            variants = [{ size: "Standard", price: fallbackPrice }];
          }

          return {
            name: f.name?.stringValue || "Untitled Product",
            categories: categories.length ? categories : ["General"],
            variants: variants,
            stock: f.stock?.stringValue || "instock",
            img: f.img?.stringValue || "https://placehold.co/150x150?text=Product"
          };
        });

        renderCategoryBar();
        renderProducts();
        if (statusText) statusText.innerText = "";
      })
      .catch((err) => {
        console.error(err);
        const catalogContainer = getEl("product-catalog");
        if (catalogContainer) {
          catalogContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #ef4444;">
              <h3>Store Unavailable</h3>
              <p style="color: #64748b; margin-top: 8px;">${err.message}</p>
            </div>
          `;
        }
      });
  }

  function renderCategoryBar() {
    const navContainer = getEl("category-nav");
    if (!navContainer) return;

    const categoriesSet = new Set(["All"]);
    products.forEach(p => {
      p.categories.forEach(c => categoriesSet.add(c));
    });

    const categories = Array.from(categoriesSet);
    navContainer.innerHTML = "";

    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = `cat-chip ${cat === activeCategory ? "active" : ""}`;
      btn.innerText = cat;
      btn.addEventListener("click", () => {
        activeCategory = cat;
        renderCategoryBar();
        renderProducts();
      });
      navContainer.appendChild(btn);
    });
  }

  function renderProducts() {
    const catalogContainer = getEl("product-catalog");
    if (!catalogContainer) return;
    catalogContainer.innerHTML = "";

    const filtered = products.filter(p => {
      if (activeCategory === "All") return true;
      return p.categories.includes(activeCategory);
    });

    if (filtered.length === 0) {
      catalogContainer.innerHTML = `<p style="text-align: center; color: #94a3b8; grid-column: 1 / -1; padding: 40px 0;">No products in this category.</p>`;
      return;
    }

    filtered.forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "prod-card";

      const primaryVariant = p.variants[0] || { size: "Standard", price: 0 };
      const isOutOfStock = p.stock === "out-of-stock";

      let optionsHTML = p.variants.map((v, vIdx) => {
        return `<option value="${vIdx}">${v.size} - ${formatCurrency(v.price)}</option>`;
      }).join("");

      card.innerHTML = `
        <div style="position: relative;">
          <img src="${p.img}" alt="${p.name}" onerror="this.src='https://placehold.co/150x150?text=Product';" class="prod-img">
          ${isOutOfStock ? `<span class="badge-out">Out of Stock</span>` : ""}
        </div>
        <div class="prod-details">
          <div class="prod-title">${p.name}</div>
          <div class="prod-cat">${p.categories.join(", ")}</div>
          
          <div style="margin-top: 12px;">
            ${p.variants.length > 1 ? `
              <select class="variant-select" id="variant-select-${idx}" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; margin-bottom: 8px;">
                ${optionsHTML}
              </select>
            ` : `
              <div class="prod-price" id="price-display-${idx}">${formatCurrency(primaryVariant.price)}</div>
            `}
          </div>

          <button class="add-to-cart-btn" data-prod-index="${idx}" ${isOutOfStock ? "disabled" : ""}>
            ${isOutOfStock ? "Out of Stock" : "Add to Cart 🛒"}
          </button>
        </div>
      `;

      catalogContainer.appendChild(card);

      const variantSelect = card.querySelector(`#variant-select-${idx}`);
      if (variantSelect) {
        variantSelect.addEventListener("change", (e) => {
          const selectedVariant = p.variants[e.target.value];
          const priceDisplay = card.querySelector(`#price-display-${idx}`);
          if (priceDisplay) priceDisplay.innerText = formatCurrency(selectedVariant.price);
        });
      }

      const addToCartBtn = card.querySelector(".add-to-cart-btn");
      if (addToCartBtn && !isOutOfStock) {
        addToCartBtn.addEventListener("click", () => {
          const vIdx = variantSelect ? Number(variantSelect.value) : 0;
          const chosenVariant = p.variants[vIdx] || primaryVariant;
          addToCart(p, chosenVariant);
        });
      }
    });
  }

  function addToCart(product, variant) {
    const existing = cart.find(item => item.name === product.name && item.size === variant.size);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        name: product.name,
        size: variant.size,
        price: variant.price,
        qty: 1
      });
    }
    renderCart();
  }

  function renderCart() {
    const cartCountEl = getEl("cart-count");
    const cartDrawer = getEl("cart-drawer");
    const cartItemsContainer = getEl("cart-items");
    const cartTotalEl = getEl("cart-total");

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (cartCountEl) cartCountEl.innerText = totalQty;
    if (cartTotalEl) cartTotalEl.innerText = formatCurrency(totalPrice);

    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `<p style="text-align: center; color: #94a3b8; padding: 20px 0;">Your cart is empty.</p>`;
      return;
    }

    cart.forEach((item, index) => {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;";
      row.innerHTML = `
        <div>
          <div style="font-size: 13px; font-weight: 600;">${item.name}</div>
          <div style="font-size: 11px; color: #64748b;">${item.size} • ${formatCurrency(item.price)}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="cart-qty-btn" data-action="dec" data-idx="${index}">-</button>
          <span style="font-size: 13px; font-weight: 600;">${item.qty}</span>
          <button class="cart-qty-btn" data-action="inc" data-idx="${index}">+</button>
        </div>
      `;
      cartItemsContainer.appendChild(row);
    });

    cartItemsContainer.querySelectorAll(".cart-qty-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.target.getAttribute("data-idx"));
        const action = e.target.getAttribute("data-action");

        if (action === "inc") {
          cart[idx].qty += 1;
        } else if (action === "dec") {
          cart[idx].qty -= 1;
          if (cart[idx].qty <= 0) cart.splice(idx, 1);
        }
        renderCart();
      });
    });
  }

  function checkoutToWhatsApp() {
    if (cart.length === 0) return alert("Your cart is empty!");
    if (!storePhone) return alert("Store phone number is not configured.");

    let cleanPhone = storePhone.replace(/[^0-9]/g, "");
    let text = `*New Order - ${currentStoreId.toUpperCase()}*\n\n`;

    let total = 0;
    cart.forEach((item, i) => {
      const itemTotal = item.price * item.qty;
      total += itemTotal;
      text += `${i + 1}. *${item.name}* (${item.size})\n   Qty: ${item.qty} x ${formatCurrency(item.price)} = *${formatCurrency(itemTotal)}*\n`;
    });

    text += `\n*Total Order Value: ${formatCurrency(total)}*`;

    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(waUrl, "_blank");
  }

  window.addEventListener("DOMContentLoaded", () => {
    initStorefront();

    const checkoutBtn = getEl("whatsapp-checkout-btn");
    if (checkoutBtn) checkoutBtn.addEventListener("click", checkoutToWhatsApp);
  });
})();
