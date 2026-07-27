(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";

  // State Management
  let allProducts = [];
  let cart = [];
  let activeCategory = "All";
  let storePhone = "";

  // DOM Elements
  const loadingState = document.getElementById("loading-state");
  const storeContent = document.getElementById("store-content");
  const storeLogoImg = document.getElementById("store-logo-img");
  const storeTitle = document.getElementById("store-title");
  const storeSlogan = document.getElementById("store-slogan");

  const categoriesBar = document.getElementById("categories-bar");
  const productGrid = document.getElementById("product-grid");

  const cartDrawer = document.getElementById("cart-drawer");
  const cartOverlay = document.getElementById("cart-overlay");
  const cartToggleBtn = document.getElementById("cart-toggle-btn");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartCountBadge = document.getElementById("cart-count-badge");
  const cartTotalText = document.getElementById("cart-total-text");
  const whatsappCheckoutBtn = document.getElementById("whatsapp-checkout-btn");

  // 1. Get Store ID from URL Query Parameters (?store=your-id)
  function getStoreIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("store") ? params.get("store").toLowerCase().trim() : null;
  }

  // 2. Fetch and Parse Store Data from Firestore
  function fetchStoreData(storeId) {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Store non-existent or network error.");
        return res.json();
      })
      .then((doc) => {
        if (!doc.fields) throw new Error("Store data corrupted or empty.");

        // Store Settings
        storePhone = doc.fields.phone?.stringValue || "";
        const slogan = doc.fields.slogan?.stringValue || "Welcome to our store!";
        const themeColor = doc.fields.themeColor?.stringValue || "#10b981";
        const logoUrl = doc.fields.logo?.stringValue || "";

        // Apply Theme Accent Color
        document.documentElement.style.setProperty("--accent-color", themeColor);

        // Update Header UI
        if (storeSlogan) storeSlogan.innerText = slogan;
        if (storeTitle) storeTitle.innerText = storeId.toUpperCase();
        if (storeLogoImg) {
          if (logoUrl) {
            storeLogoImg.src = logoUrl;
            storeLogoImg.style.display = "block";
          } else {
            storeLogoImg.style.display = "none";
          }
        }

        // Parse Products safely (Handles both legacy string category & array categories)
        const rawItems = doc.fields.items?.arrayValue?.values || [];

        allProducts = rawItems.map((item) => {
          const fields = item.mapValue?.fields || {};

          let cats = [];

          // Case A: Saved as array of string values
          if (fields.categories?.arrayValue?.values) {
            cats = fields.categories.arrayValue.values
              .map((v) => v.stringValue)
              .filter(Boolean);
          }
          // Case B: Fallback for older single-string entries
          else if (fields.category?.stringValue) {
            cats = [fields.category.stringValue];
          }

          // Case C: Fallback default
          if (!cats || cats.length === 0) {
            cats = ["General"];
          }

          return {
            name: fields.name?.stringValue || "Unnamed Product",
            price: Number(fields.price?.doubleValue || fields.price?.integerValue || 0),
            categories: cats,
            stock: fields.stock?.stringValue || "instock",
            img: fields.img?.stringValue || "https://placehold.co/300x300?text=No+Photo",
          };
        });

        // Hide Loading State & Show Store Content
        if (loadingState) loadingState.style.display = "none";
        if (storeContent) storeContent.style.display = "block";

        renderCategories();
        renderProducts();
      })
      .catch((err) => {
        console.error("Store Load Error:", err);
        if (loadingState) {
          loadingState.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #991b1b;">
              <p style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">⚠️ Store Not Found</p>
              <p style="font-size: 14px; color: #64748b;">Could not load store "${storeId}". Make sure you saved and published from the dashboard first.</p>
            </div>
          `;
        }
      });
  }

  // 3. Render Filter Category Chips
  function renderCategories() {
    if (!categoriesBar) return;
    categoriesBar.innerHTML = "";

    // Extract unique categories across all items
    const catSet = new Set(["All"]);
    allProducts.forEach((product) => {
      if (Array.isArray(product.categories)) {
        product.categories.forEach((cat) => catSet.add(cat));
      }
    });

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

  // 4. Render Product Grid
  function renderProducts() {
    if (!productGrid) return;
    productGrid.innerHTML = "";

    // Filter products matching activeCategory
    const filteredProducts =
      activeCategory === "All"
        ? allProducts
        : allProducts.filter(
            (p) => Array.isArray(p.categories) && p.categories.includes(activeCategory)
          );

    if (filteredProducts.length === 0) {
      productGrid.innerHTML = `<p style="text-align: center; color: #94a3b8; grid-column: 1/-1; padding: 40px 0;">No products found in this category.</p>`;
      return;
    }

    filteredProducts.forEach((item) => {
      const stockBadge =
        item.stock === "instock"
          ? `<span class="stock-tag stock-instock">In Stock</span>`
          : item.stock === "lowstock"
          ? `<span class="stock-tag stock-lowstock">Low Stock</span>`
          : `<span class="stock-tag stock-outofstock">Out of Stock</span>`;

      const isDisabled = item.stock === "outofstock" ? "disabled" : "";
      const btnText = item.stock === "outofstock" ? "Out of Stock" : "+ Add to Cart";
      const categoriesText = (item.categories || ["General"]).join(" • ");

      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <img src="${item.img}" class="product-img" alt="${item.name}" onerror="this.src='https://placehold.co/300x300?text=No+Photo';">
        <div class="product-details">
          <div>
            ${stockBadge}
            <div style="font-size: 11px; color: #64748b; margin: 4px 0 2px 0;">${categoriesText}</div>
            <div class="product-title">${item.name}</div>
            <div class="product-price">KSh ${item.price.toLocaleString()}</div>
          </div>
          <button class="add-to-cart-btn" data-name="${encodeURIComponent(item.name)}" data-price="${item.price}" ${isDisabled}>
            ${btnText}
          </button>
        </div>
      `;
      productGrid.appendChild(card);
    });

    // Attach Add to Cart Listeners
    document.querySelectorAll(".add-to-cart-btn:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const name = decodeURIComponent(e.currentTarget.getAttribute("data-name"));
        const price = Number(e.currentTarget.getAttribute("data-price"));
        addToCart(name, price);
      });
    });
  }

  // 5. Cart Operations
  function addToCart(name, price) {
    const existingIndex = cart.findIndex((item) => item.name === name);

    if (existingIndex > -1) {
      cart[existingIndex].qty += 1;
    } else {
      cart.push({ name, price, qty: 1 });
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
        row.className = "cart-item-row";
        row.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;";
        row.innerHTML = `
          <div>
            <div style="font-weight: 600; font-size: 14px; color: #0f172a;">${item.name}</div>
            <div style="font-size: 12px; color: #64748b;">KSh ${item.price.toLocaleString()} x ${item.qty}</div>
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

    if (cartCountBadge) cartCountBadge.innerText = totalItems;
    if (cartTotalText) cartTotalText.innerText = `KSh ${totalPrice.toLocaleString()}`;

    // Attach Quantity Listeners
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
    if (!cartDrawer || !cartOverlay) return;
    if (open) {
      cartDrawer.classList.add("open");
      cartOverlay.classList.add("open");
    } else {
      cartDrawer.classList.remove("open");
      cartOverlay.classList.remove("open");
    }
  }

  // 6. WhatsApp Order Checkout
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
      message += `${i + 1}. *${item.name}*\n   Qty: ${item.qty} x KSh ${item.price.toLocaleString()} = KSh ${itemTotal.toLocaleString()}\n`;
    });

    message += `\n💰 *Total Amount:* KSh ${totalPrice.toLocaleString()}\n\nPlease confirm availability and payment details.`;

    const cleanPhone = storePhone.replace(/[^0-9]/g, "");
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(waUrl, "_blank");
  }

  // Initial Event Attachments
  if (cartToggleBtn) cartToggleBtn.addEventListener("click", () => toggleCartDrawer(true));
  if (closeCartBtn) closeCartBtn.addEventListener("click", () => toggleCartDrawer(false));
  if (cartOverlay) cartOverlay.addEventListener("click", () => toggleCartDrawer(false));
  if (whatsappCheckoutBtn) whatsappCheckoutBtn.addEventListener("click", checkoutToWhatsApp);

  // App Initialization
  const currentStoreId = getStoreIdFromUrl();
  if (currentStoreId) {
    fetchStoreData(currentStoreId);
  } else {
    if (loadingState) {
      loadingState.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #64748b;">
          <p style="font-size: 16px; font-weight: 600;">No Store Selected</p>
          <p style="font-size: 13px; margin-top: 4px;">Please open the store link from your dashboard.</p>
        </div>
      `;
    }
  }
})();
