(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";

  // State Management
  let allProducts = [];
  let cart = [];
  let activeCategory = "All";
  let storePhone = "";

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  function getStoreIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const storeParam = params.get("store");
    return storeParam ? storeParam.toLowerCase().trim() : null;
  }

  function fetchStoreData(storeId) {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Store ID "${storeId}" was not found.`);
        return res.json();
      })
      .then((doc) => {
        if (!doc || !doc.fields) throw new Error("Store data exists but contains no fields.");

        storePhone = doc.fields.phone?.stringValue || "";
        const slogan = doc.fields.slogan?.stringValue || "Welcome to our store!";
        const themeColor = doc.fields.themeColor?.stringValue || "#10b981";
        const logoUrl = doc.fields.logo?.stringValue || "";

        document.documentElement.style.setProperty("--accent-color", themeColor);
        setText("store-slogan", slogan);
        setText("store-title", storeId.toUpperCase());

        const logoImg = document.getElementById("store-logo-img");
        if (logoImg) {
          logoImg.src = logoUrl;
          logoImg.style.display = logoUrl ? "block" : "none";
        }

        const rawItems = doc.fields.items?.arrayValue?.values || [];

        allProducts = rawItems.map((item, index) => {
          const fields = item.mapValue?.fields || {};

          // Parse Categories
          let cats = [];
          if (fields.categories?.arrayValue?.values) {
            cats = fields.categories.arrayValue.values.map((v) => v.stringValue).filter(Boolean);
          } else if (fields.category?.stringValue) {
            cats = [fields.category.stringValue];
          }
          if (!cats.length) cats = ["General"];

          // Parse Variants
          let variantsList = [];
          if (fields.variants?.arrayValue?.values) {
            variantsList = fields.variants.arrayValue.values.map((v) => {
              const vf = v.mapValue?.fields || {};
              return {
                size: vf.size?.stringValue || "Standard",
                price: Number(vf.price?.doubleValue || vf.price?.integerValue || 0)
              };
            });
          }

          // Fallback if no variants exist
          const basePrice = Number(fields.price?.doubleValue || fields.price?.integerValue || 0);
          if (variantsList.length === 0) {
            variantsList = [{ size: "Standard", price: basePrice }];
          }

          return {
            id: `prod-${index}`,
            name: fields.name?.stringValue || "Unnamed Product",
            basePrice: basePrice,
            categories: cats,
            variants: variantsList,
            stock: fields.stock?.stringValue || "instock",
            img: fields.img?.stringValue || "https://placehold.co/300x300?text=No+Photo"
          };
        });

        const loadingState = document.getElementById("loading-state");
        const storeContent = document.getElementById("store-content");

        if (loadingState) loadingState.style.display = "none";
        if (storeContent) storeContent.style.display = "block";

        renderCategories();
        renderProducts();
      })
      .catch((err) => {
        console.error("Storefront Load Failed:", err);
        const loadingState = document.getElementById("loading-state");
        if (loadingState) {
          loadingState.style.display = "block";
          loadingState.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; margin: 20px auto; max-width: 480px;">
              <p style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">⚠️ Could Not Load Store</p>
              <p style="font-size: 13px; color: #7f1d1d;">${err.message}</p>
            </div>
          `;
        }
      });
  }

  function renderCategories() {
    const categoriesBar = document.getElementById("categories-bar");
    if (!categoriesBar) return;
    categoriesBar.innerHTML = "";

    const catSet = new Set(["All"]);
    allProducts.forEach((p) => p.categories.forEach((cat) => catSet.add(cat)));

    catSet.forEach((cat) => {
      const chip = document.createElement("button");
      chip.className = `chip ${cat === activeCategory ? "active" : ""}`;
      chip.innerText = cat;
      chip.addEventListener("click", () => {
        activeCategory = cat;
        renderCategories();
        renderProducts();
      });
      categoriesBar.appendChild(chip);
    });
  }

  function renderProducts() {
    const productGrid = document.getElementById("product-grid");
    if (!productGrid) return;
    productGrid.innerHTML = "";

    const filtered = activeCategory === "All"
      ? allProducts
      : allProducts.filter((p) => p.categories.includes(activeCategory));

    if (filtered.length === 0) {
      productGrid.innerHTML = `<p style="text-align: center; color: #94a3b8; grid-column: 1/-1; padding: 40px 0;">No products found in this category.</p>`;
      return;
    }

    filtered.forEach((item) => {
      const stockBadge =
        item.stock === "instock"
          ? `<span class="stock-tag stock-instock">In Stock</span>`
          : item.stock === "lowstock"
          ? `<span class="stock-tag stock-lowstock">Low Stock</span>`
          : `<span class="stock-tag stock-outofstock">Out of Stock</span>`;

      const isDisabled = item.stock === "outofstock" ? "disabled" : "";
      const btnText = item.stock === "outofstock" ? "Out of Stock" : "+ Add to Cart";
      const categoriesText = item.categories.join(" • ");

      // Initial selected variant is the first option
      const initialVariant = item.variants[0];

      // Build size selector dropdown HTML
      let sizeSelectorHtml = "";
      if (item.variants.length > 1) {
        sizeSelectorHtml = `
          <div style="margin: 8px 0 12px 0;">
            <label style="font-size: 11px; color: #64748b; display: block; margin-bottom: 2px;">Select Size:</label>
            <select class="variant-select" data-prod-id="${item.id}" style="width: 100%; padding: 6px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 6px; background: white;">
              ${item.variants.map((v, i) => `<option value="${i}">${v.size} - KSh ${v.price.toLocaleString()}</option>`).join("")}
            </select>
          </div>
        `;
      } else {
        sizeSelectorHtml = `<div style="font-size: 12px; color: #64748b; margin: 4px 0 8px 0;">Size: <b>${initialVariant.size}</b></div>`;
      }

      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <img src="${item.img}" class="product-img" alt="${item.name}" onerror="this.src='https://placehold.co/300x300?text=No+Photo';">
        <div class="product-details">
          <div>
            ${stockBadge}
            <div style="font-size: 11px; color: #64748b; margin: 4px 0 2px 0;">${categoriesText}</div>
            <div class="product-title">${item.name}</div>
            ${sizeSelectorHtml}
            <div class="product-price" id="price-${item.id}">KSh ${initialVariant.price.toLocaleString()}</div>
          </div>
          <button class="add-to-cart-btn" id="btn-${item.id}" data-prod-id="${item.id}" ${isDisabled}>
            ${btnText}
          </button>
        </div>
      `;
      productGrid.appendChild(card);
    });

    // Handle variant dropdown selection change
    document.querySelectorAll(".variant-select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const prodId = e.target.getAttribute("data-prod-id");
        const selectedIdx = Number(e.target.value);
        const product = allProducts.find((p) => p.id === prodId);

        if (product && product.variants[selectedIdx]) {
          const selectedVariant = product.variants[selectedIdx];
          const priceEl = document.getElementById(`price-${prodId}`);
          if (priceEl) {
            priceEl.innerText = `KSh ${selectedVariant.price.toLocaleString()}`;
          }
        }
      });
    });

    // Add to Cart handler
    document.querySelectorAll(".add-to-cart-btn:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const prodId = e.currentTarget.getAttribute("data-prod-id");
        const product = allProducts.find((p) => p.id === prodId);

        if (!product) return;

        let selectedVariant = product.variants[0];
        const selectEl = document.querySelector(`.variant-select[data-prod-id="${prodId}"]`);
        if (selectEl) {
          selectedVariant = product.variants[Number(selectEl.value)];
        }

        addToCart(product.name, selectedVariant.size, selectedVariant.price);
      });
    });
  }

  function addToCart(name, size, price) {
    const cartKey = `${name} (${size})`;
    const existingIndex = cart.findIndex((item) => item.cartKey === cartKey);

    if (existingIndex > -1) {
      cart[existingIndex].qty += 1;
    } else {
      cart.push({ cartKey, name, size, price, qty: 1 });
    }

    updateCartUI();
    toggleCartDrawer(true);
  }

  function updateQuantity(index, delta) {
    if (cart[index]) {
      cart[index].qty += delta;
      if (cart[index].qty <= 0) {
        cart.splice(index, 1);
      }
    }
    updateCartUI();
  }

  function updateCartUI() {
    const cartItemsContainer = document.getElementById("cart-items-container");
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = "";

    let totalItems = 0;
    let totalPrice = 0;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `<p style="text-align: center; color: #94a3b8; margin-top: 40px;">Your cart is empty.</p>`;
    } else {
      cart.forEach((item, index) => {
        totalItems += item.qty;
        totalPrice += item.price * item.qty;

        const row = document.createElement("div");
        row.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;";
        row.innerHTML = `
          <div>
            <div style="font-weight: 600; font-size: 14px; color: #0f172a;">${item.name}</div>
            <div style="font-size: 12px; color: #64748b;">Size: ${item.size} • KSh ${item.price.toLocaleString()} x ${item.qty}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="qty-btn minus-btn" data-index="${index}" style="width: 26px; height: 26px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; cursor: pointer;">-</button>
            <span style="font-size: 14px; font-weight: 600;">${item.qty}</span>
            <button class="qty-btn plus-btn" data-index="${index}" style="width: 26px; height: 26px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; cursor: pointer;">+</button>
          </div>
        `;
        cartItemsContainer.appendChild(row);
      });
    }

    setText("cart-count-badge", totalItems);
    setText("cart-total-text", `KSh ${totalPrice.toLocaleString()}`);

    document.querySelectorAll(".minus-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.getAttribute("data-index"));
        updateQuantity(idx, -1);
      });
    });

    document.querySelectorAll(".plus-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.getAttribute("data-index"));
        updateQuantity(idx, 1);
      });
    });
  }

  function toggleCartDrawer(open) {
    const cartDrawer = document.getElementById("cart-drawer");
    const cartOverlay = document.getElementById("cart-overlay");
    if (!cartDrawer || !cartOverlay) return;

    if (open) {
      cartDrawer.classList.add("open");
      cartOverlay.classList.add("open");
    } else {
      cartDrawer.classList.remove("open");
      cartOverlay.classList.remove("open");
    }
  }

  function checkoutToWhatsApp() {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    if (!storePhone) {
      alert("This store hasn't configured a WhatsApp phone number yet.");
      return;
    }

    let message = `🛒 *New Order*\n\n`;
    let totalPrice = 0;

    cart.forEach((item, i) => {
      const itemTotal = item.price * item.qty;
      totalPrice += itemTotal;
      message += `${i + 1}. *${item.name}* (${item.size})\n   Qty: ${item.qty} x KSh ${item.price.toLocaleString()} = KSh ${itemTotal.toLocaleString()}\n`;
    });

    message += `\n💰 *Total Amount:* KSh ${totalPrice.toLocaleString()}\n\nPlease confirm availability and payment details.`;

    const cleanPhone = storePhone.replace(/[^0-9]/g, "");
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(waUrl, "_blank");
  }

  const cartToggleBtn = document.getElementById("cart-toggle-btn");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const cartOverlay = document.getElementById("cart-overlay");
  const whatsappCheckoutBtn = document.getElementById("whatsapp-checkout-btn");

  if (cartToggleBtn) cartToggleBtn.addEventListener("click", () => toggleCartDrawer(true));
  if (closeCartBtn) closeCartBtn.addEventListener("click", () => toggleCartDrawer(false));
  if (cartOverlay) cartOverlay.addEventListener("click", () => toggleCartDrawer(false));
  if (whatsappCheckoutBtn) whatsappCheckoutBtn.addEventListener("click", checkoutToWhatsApp);

  const storeId = getStoreIdFromUrl();
  if (storeId) {
    fetchStoreData(storeId);
  } else {
    const loadingState = document.getElementById("loading-state");
    if (loadingState) {
      loadingState.style.display = "block";
      loadingState.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #64748b;">
          <p style="font-size: 16px; font-weight: 600;">No Store Specified in URL</p>
        </div>
      `;
    }
  }
})();
