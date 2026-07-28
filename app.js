(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";
  const DEFAULT_STORE_ID = "perfumescentre";

  const urlParams = new URLSearchParams(window.location.search);
  const storeId = (urlParams.get("store") || DEFAULT_STORE_ID).toLowerCase().trim();

  let storeData = null;
  let cart = [];
  let activeCategory = "All";

  const getEl = (id) => document.getElementById(id);

  function getItemPrice(item, variantIndex = 0) {
    if (item.variants && item.variants.length > variantIndex) {
      return Number(item.variants[variantIndex].price || 0);
    }
    return Number(item.price || 0);
  }

  function loadStoreData() {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Store not found or network issue.");
        return res.json();
      })
      .then((doc) => {
        if (!doc || !doc.fields) throw new Error("Store document contains no valid fields.");

        const fields = doc.fields;
        const rawItems = fields.items?.arrayValue?.values || [];

        const parsedItems = rawItems.map((item, index) => {
          const f = item.mapValue?.fields || {};

          let cats = [];
          if (f.categories?.arrayValue?.values) {
            cats = f.categories.arrayValue.values.map((v) => v.stringValue).filter(Boolean);
          } else if (f.category?.stringValue) {
            cats = [f.category.stringValue];
          }

          let variantsList = [];
          if (f.variants?.arrayValue?.values) {
            variantsList = f.variants.arrayValue.values.map((v) => {
              const vf = v.mapValue?.fields || {};
              return {
                size: vf.size?.stringValue || "100ml",
                price: Number(vf.price?.doubleValue || vf.price?.integerValue || 0)
              };
            });
          }

          const fallbackPrice = Number(f.price?.doubleValue || f.price?.integerValue || 0);
          if (variantsList.length === 0) {
            variantsList = [{ size: "100ml", price: fallbackPrice }];
          }

          return {
            id: index,
            name: f.name?.stringValue || `Item ${index + 1}`,
            price: fallbackPrice || variantsList[0].price,
            categories: cats.length ? cats : ["General"],
            variants: variantsList,
            stock: f.stock?.stringValue || "instock",
            img: f.img?.stringValue || "https://placehold.co/200x200?text=Product"
          };
        });

        storeData = {
          phone: fields.phone?.stringValue || "",
          slogan: fields.slogan?.stringValue || "Welcome to our store",
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
        console.error("[STOREFRONT LOAD ERROR]:", err);
        const catalogGrid = getEl("catalog-grid");
        if (catalogGrid) {
          catalogGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">Unable to load store "${storeId}". Please check connection or publish changes from dashboard.</p>`;
        }
      });
  }

  function applyThemeAndHeader() {
    if (!storeData) return;
    document.documentElement.style.setProperty("--primary-color", storeData.themeColor);

    const sloganEl = getEl("store-slogan");
    if (sloganEl) sloganEl.innerText = storeData.slogan;

    const logoEl = getEl("store-logo");
    if (logoEl && storeData.logo) logoEl.src = storeData.logo;
  }

  function renderCategoriesMenu() {
    const nav = getEl("category-nav");
    if (!nav || !storeData) return;

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

      let variantOptionsHTML = item.variants.map((v, idx) => 
        `<option value="${idx}">${v.size} - KSh ${v.price.toLocaleString()}</option>`
      ).join("");

      card.innerHTML = `
        <img src="${item.img}" alt="${item.name}" class="product-img" onerror="this.src='https://placehold.co/200x200?text=Product';">
        <div class="product-details">
          <h3 class="product-title" style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">${item.name}</h3>
          <p class="product-cats" style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${item.categories.join(", ")}</p>
          
          <div style="margin: 8px 0;">
            <select class="variant-dropdown" data-id="${item.id}" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px;">
              ${variantOptionsHTML}
            </select>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
            <span class="product-price" id="price-display-${item.id}" style="font-weight: 700; color: #0f172a; font-size: 14px;">
              KSh ${getItemPrice(item, 0).toLocaleString()}
            </span>
            <button type="button" class="add-to-cart-btn" data-id="${item.id}" style="background: var(--primary-color, #10b981); color: #fff; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
              + Add
            </button>
          </div>
        </div>
      `;

      grid.appendChild(card);

      const dropdown = card.querySelector(`.variant-dropdown`);
      dropdown.addEventListener("change", (e) => {
        const vIdx = Number(e.target.value);
        const priceLabel = getEl(`price-display-${item.id}`);
        if (priceLabel) {
          priceLabel.innerText = `KSh ${getItemPrice(item, vIdx).toLocaleString()}`;
        }
      });

      card.querySelector(".add-to-cart-btn").addEventListener("click", () => {
        const selectedVariantIdx = Number(dropdown.value);
        addToCart(item, selectedVariantIdx);
      });
    });
  }

  function addToCart(product, variantIndex) {
    const variant = product.variants[variantIndex] || { size: "100ml", price: product.price };
    
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

    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.selectedPrice * item.qty), 0);

    if (cartCountLabel) cartCountLabel.innerText = totalCount;
    if (cartTotalLabel) cartTotalLabel.innerText = `KSh ${totalPrice.toLocaleString()}`;

    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `<p style="text-align: center; color: #94a3b8; padding: 20px 0;">Your cart is empty.</p>`;
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

  function sendWhatsAppOrder() {
    if (cart.length === 0) return alert("Your cart is empty!");

    const phone = storeData?.phone || "";
    if (!phone) {
      return alert("Store phone number is missing in dashboard settings.");
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
    message += `Please confirm my order and share payment details.`;

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
  }

  function openCartModal() {
    const modal = getEl("cart-modal");
    if (modal) modal.style.display = "flex";
  }

  function closeCartModal() {
    const modal = getEl("cart-modal");
    if (modal) modal.style.display = "none";
  }

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
