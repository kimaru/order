(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";
  const DEFAULT_STORE_ID = "perfumescentre";

  // URL State & Cart State
  const urlParams = new URLSearchParams(window.location.search);
  const storeId = (urlParams.get("store") || DEFAULT_STORE_ID).toLowerCase().trim();

  let storeData = null;
  let cart = []; // Array of { product, variantIndex, selectedSize, selectedPrice, qty }
  let activeCategory = "All";

  // Helper: DOM Safe Getter
  const getEl = (id) => document.getElementById(id);

  // Helper: Safe Price Evaluator
  function getItemPrice(item, variantIndex = 0) {
    if (item.variants && item.variants.length > variantIndex) {
      return Number(item.variants[variantIndex].price || 0);
    }
    return Number(item.price || 0);
  }

  // --- FETCH STORE DATA ---
  function loadStoreData() {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Store not found or connection failed.");
        return res.json();
      })
      .then((doc) => {
        if (!doc || !doc.fields) throw new Error("Store document is empty.");

        const fields = doc.fields;
        const rawItems = fields.items?.arrayValue?.values || [];

        const parsedItems = rawItems.map((item, index) => {
          const f = item.mapValue?.fields || {};

          // Categories
          let cats = [];
          if (f.categories?.arrayValue?.values) {
            cats = f.categories.arrayValue.values.map((v) => v.stringValue).filter(Boolean);
          } else if (f.category?.stringValue) {
            cats = [f.category.stringValue];
          }

          // Variants
          let variantsList = [];
          if (f.variants?.arrayValue?.values) {
            variantsList = f.variants.arrayValue.values.map((v) => {
              const vf = v.mapValue?.fields || {};
              return {
                size: vf.size?.stringValue || "Standard",
                price: Number(vf.price?.doubleValue || vf.price?.integerValue || 0)
              };
            });
          }

          const fallbackPrice = Number(f.price?.doubleValue || f.price?.integerValue || 0);
          if (variantsList.length === 0) {
            variantsList = [{ size: "Standard", price: fallbackPrice }];
          }

          return {
            id: index,
            name: f.name?.stringValue || "Unnamed Item",
            price: fallbackPrice || variantsList[0].price,
            categories: cats.length ? cats : ["General"],
            variants: variantsList,
            stock: f.stock?.stringValue || "instock",
            img: f.img?.stringValue || "https://placehold.co/100x100?text=Product"
          };
        });

        storeData = {
          phone: fields.phone?.stringValue || "",
          slogan: fields.slogan?.stringValue || "Welcome to our catalog",
          themeColor: fields.themeColor?.stringValue || "#10b981",
          logo: fields.logo?.stringValue || "",
          items: parsedItems
        };

        applyThemeAndHeader();
        renderCategoriesMenu();
        renderProducts();
        updateCartUI();
      })
      .catch((err) => {
        console.error("[STOREFRONT ERROR]:", err);
        const catalogGrid = getEl("catalog-grid");
        if (catalogGrid) {
          catalogGrid.innerHTML = `<p style="text-align:center; grid-column: 1/-1; padding: 40px; color: #ef4444;">Unable to load store "${storeId}". Please check the URL or dashboard connection.</p>`;
        }
      });
  }

  // --- BRANDING & HEADER ---
  function applyThemeAndHeader() {
    if (!storeData) return;

    document.documentElement.style.setProperty("--primary-color", storeData.themeColor);

    const sloganEl = getEl("store-slogan");
    if (sloganEl) sloganEl.innerText = storeData.slogan;

    const logoEl = getEl("store-logo");
    if (logoEl && storeData.logo) logoEl.src = storeData.logo;
  }

  // --- CATEGORY FILTERING ---
  function renderCategoriesMenu() {
    const nav = getEl("category-nav");
    if (!nav || !storeData) return;

    // Collect all unique categories across items
    const allCats = new Set(["All"]);
    storeData.items.forEach((item) => {
      item.categories.forEach((c) => allCats.add(c));
    });

    nav.innerHTML = "";
    allCats.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = `cat-filter-btn ${cat === activeCategory ? "active" : ""}`;
      btn.innerText = cat;
      btn.addEventListener("click", () => {
        activeCategory = cat;
        renderCategoriesMenu();
        renderProducts();
      });
      nav.appendChild(btn);
    });
  }

  // --- RENDER PRODUCTS GRID ---
  function renderProducts() {
    const grid = getEl("catalog-grid");
    if (!grid || !storeData) return;
    grid.innerHTML = "";

    const filteredItems = storeData.items.filter((item) => {
      if (activeCategory === "All") return true;
      return item.categories.includes(activeCategory);
    });

    if (filteredItems.length === 0) {
      grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px;">No products found in this category.</p>`;
      return;
    }

    filteredItems.forEach((item) => {
      const card = document.createElement("div");
      card.className = "product-card";

      // Variant Selector Options
      let variantOptionsHTML = "";
      item.variants.forEach((v, idx) => {
        variantOptionsHTML += `<option value="${idx}">${v.size} - KSh ${v.price.toLocaleString()}</option>`;
      });

      card.innerHTML = `
        <img src="${item.img}" alt="${item.name}" class="product-img" onerror="this.src='https://placehold.co/200x200?text=Product';">
        <div class="product-details">
          <h3 class="product-title">${item.name}</h3>
          <p class="product-cats">${item.categories.join(", ")}</p>
          
          <div class="variant-select-wrapper" style="margin: 8px 0;">
            <select class="variant-dropdown" data-id="${item.id}" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px;">
              ${variantOptionsHTML}
            </select>
          </div>

          <div class="product-bottom" style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
            <span class="product-price" id="price-display-${item.id}" style="font-weight: 700; color: #0f172a;">
              KSh ${getItemPrice(item, 0).toLocaleString()}
            </span>
            <button type="button" class="add-to-cart-btn" data-id="${item.id}" style="background: var(--primary-color, #10b981); color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
              + Add
            </button>
          </div>
        </div>
      `;

      grid.appendChild(card);

      // Listen to variant dropdown changes
      const dropdown = card.querySelector(`.variant-dropdown`);
      dropdown.addEventListener("change", (e) => {
        const vIdx = Number(e.target.value);
        const priceLabel = getEl(`price-display-${item.id}`);
        if (priceLabel) {
          priceLabel.innerText = `KSh ${getItemPrice(item, vIdx).toLocaleString()}`;
        }
      });

      // Listen to Add to Cart
      card.querySelector(".add-to-cart-btn").addEventListener("click", () => {
        const selectedVariantIdx = Number(dropdown.value);
        addToCart(item, selectedVariantIdx);
      });
    });
  }

  // --- CART MANAGEMENT & TOTAL CALCULATIONS ---
  function addToCart(product, variantIndex) {
    const variant = product.variants[variantIndex] || { size: "Standard", price: product.price };
    
    // Search if same product AND size already exist in cart
    const existingIndex = cart.findIndex(
      (c) => c.product.id === product.id && c.selectedSize === variant.size
    );

    if (existingIndex > -1) {
      cart[existingIndex].qty += 1;
    } else {
      cart.push({
        product: product,
        variantIndex: variantIndex,
        selectedSize: variant.size,
        selectedPrice: Number(variant.price || 0),
        qty: 1
      });
    }

    updateCartUI();
    openCartModal();
  }

  function updateCartQuantity(index, delta) {
    if (!cart[index]) return;
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
    updateCartUI();
  }

  function updateCartUI() {
    const cartCountLabel = getEl("cart-count");
    const cartItemsContainer = getEl("cart-items-container");
    const cartTotalLabel = getEl("cart-total-price");

    // Calculate total item count and sum overall price safely
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.selectedPrice * item.qty, 0);

    if (cartCountLabel) cartCountLabel.innerText = totalCount;
    if (cartTotalLabel) cartTotalLabel.innerText = `KSh ${totalPrice.toLocaleString()}`;

    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `<p style="text-align: center; color: #94a3b8; padding: 20px 0;">Your cart is currently empty.</p>`;
      return;
    }

    cart.forEach((item, index) => {
      const itemSubtotal = item.selectedPrice * item.qty;
      const row = document.createElement("div");
      row.className = "cart-item-row";
      row.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9;";

      row.innerHTML = `
        <div style="flex: 1; padding-right: 8px;">
          <div style="font-weight: 600; font-size: 14px;">${item.product.name}</div>
          <div style="font-size: 12px; color: #64748b;">${item.selectedSize} • KSh ${item.selectedPrice.toLocaleString()}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="qty-btn minus" data-index="${index}" style="width: 26px; height: 26px; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">-</button>
          <span style="font-size: 14px; font-weight: 600;">${item.qty}</span>
          <button type="button" class="qty-btn plus" data-index="${index}" style="width: 26px; height: 26px; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">+</button>
        </div>
        <div style="font-weight: 700; font-size: 14px; min-width: 80px; text-align: right; color: #0f172a;">
          KSh ${itemSubtotal.toLocaleString()}
        </div>
      `;

      cartItemsContainer.appendChild(row);
    });

    // Wire Quantity adjust buttons
    cartItemsContainer.querySelectorAll(".qty-btn.minus").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.getAttribute("data-index"));
        updateCartQuantity(idx, -1);
      });
    });

    cartItemsContainer.querySelectorAll(".qty-btn.plus").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.getAttribute("data-index"));
        updateCartQuantity(idx, 1);
      });
    });
  }

  // --- WHATSAPP ORDER CHECKOUT ---
  function sendWhatsAppOrder() {
    if (cart.length === 0) return alert("Your cart is empty!");

    const phone = storeData?.phone || "";
    if (!phone) {
      return alert("Store phone number is missing. Please update it in the dashboard.");
    }

    let message = `🛒 *NEW ORDER - ${storeData?.slogan || "Store"}*\n\n`;
    let grandTotal = 0;

    cart.forEach((item, i) => {
      const subtotal = item.selectedPrice * item.qty;
      grandTotal += subtotal;
      message += `${i + 1}. *${item.product.name}* (${item.selectedSize})\n`;
      message += `   Qty: ${item.qty} × KSh ${item.selectedPrice.toLocaleString()} = *KSh ${subtotal.toLocaleString()}*\n\n`;
    });

    message += `------------------------------\n`;
    message += `💰 *TOTAL AMOUNT:* KSh ${grandTotal.toLocaleString()}\n\n`;
    message += `Please confirm my order and share payment/delivery instructions!`;

    const encodedMsg = encodeURIComponent(message);
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, "_blank");
  }

  // --- MODAL CONTROLS ---
  function openCartModal() {
    const modal = getEl("cart-modal");
    if (modal) modal.style.display = "flex";
  }

  function closeCartModal() {
    const modal = getEl("cart-modal");
    if (modal) modal.style.display = "none";
  }

  // --- INIT ---
  window.addEventListener("DOMContentLoaded", () => {
    loadStoreData();

    const openCartBtn = getEl("open-cart-btn");
    if (openCartBtn) openCartBtn.addEventListener("click", openCartModal);

    const closeCartBtn = getEl("close-cart-btn");
    if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartModal);

    const checkoutBtn = getEl("checkout-whatsapp-btn");
    if (checkoutBtn) checkoutBtn.addEventListener("click", sendWhatsAppOrder);
  });
})();
