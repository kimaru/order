(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";

  const urlParams = new URLSearchParams(window.location.search);
  const storeId = (urlParams.get("store") || "aromatic-vibes").toLowerCase().trim();

  // State
  let storePhone = "";
  let allProducts = [];
  let activeCategory = "All";

  let cart = JSON.parse(localStorage.getItem(`cart_${storeId}`)) || [];

  // DOM Elements
  const brandLogo = document.getElementById("brand-logo");
  const brandName = document.getElementById("brand-name");
  const brandSlogan = document.getElementById("brand-slogan");
  const productGrid = document.getElementById("product-grid");
  const categoriesBar = document.getElementById("categories-bar");

  const cartBadge = document.getElementById("cart-badge");
  const cartTotal = document.getElementById("cart-total");
  const openCartBtn = document.getElementById("open-cart-btn");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const cartOverlay = document.getElementById("cart-overlay");
  const cartDrawer = document.getElementById("cart-drawer");
  const cartItemsContainer = document.getElementById("cart-items-container");

  const whatsappCheckoutBtn = document.getElementById("whatsapp-checkout-btn");
  const custNameInput = document.getElementById("cust-name");
  const custAddressInput = document.getElementById("cust-address");

  function fetchStoreData() {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Store record not found.");
        return res.json();
      })
      .then((doc) => {
        const fields = doc.fields || {};

        storePhone = fields.phone?.stringValue || "";
        const slogan = fields.slogan?.stringValue || "";
        const logoUrl = fields.logo?.stringValue || "";
        const themeColor = fields.themeColor?.stringValue || "#10b981";

        document.documentElement.style.setProperty("--accent-color", themeColor);
        brandName.innerText = storeId.replace(/-/g, " ");

        if (slogan) { brandSlogan.innerText = slogan; brandSlogan.style.display = "block"; }
        if (logoUrl) { brandLogo.src = logoUrl; brandLogo.style.display = "block"; }

        // Parse Products
        const rawItems = fields.items?.arrayValue?.values || [];
        allProducts = rawItems.map((item) => {
          const itemFields = item.mapValue?.fields || {};
          return {
            name: itemFields.name?.stringValue || "Unnamed Product",
            price: Number(itemFields.price?.doubleValue || itemFields.price?.integerValue || 0),
            category: itemFields.category?.stringValue || "General",
            stock: itemFields.stock?.stringValue || "instock",
            img: itemFields.img?.stringValue || "https://placehold.co/300x300?text=No+Photo",
          };
        });

        renderCategories();
        renderProducts();
        updateCartUI();
      })
      .catch((err) => {
        console.error(err);
        brandName.innerText = "Store Not Found";
        productGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b;">Store "${storeId}" does not exist.</p>`;
      });
  }

  function renderCategories() {
    categoriesBar.innerHTML = "";
    const categories = ["All", ...new Set(allProducts.map(p => p.category || "General"))];

    categories.forEach(cat => {
      const chip = document.createElement("button");
      chip.className = `chip ${cat === activeCategory ? 'active' : ''}`;
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
    productGrid.innerHTML = "";

    const filtered = activeCategory === "All" 
      ? allProducts 
      : allProducts.filter(p => p.category === activeCategory);

    if (filtered.length === 0) {
      productGrid.innerHTML = `<p style="text-align: center; color: #94a3b8; grid-column: 1/-1; padding: 30px;">No products in this category.</p>`;
      return;
    }

    filtered.forEach((item) => {
      const stockBadge = item.stock === 'instock' 
        ? `<span class="stock-tag stock-instock">In Stock</span>`
        : item.stock === 'lowstock'
        ? `<span class="stock-tag stock-lowstock">Low Stock</span>`
        : `<span class="stock-tag stock-outofstock">Out of Stock</span>`;

      const isDisabled = item.stock === 'outofstock' ? 'disabled' : '';
      const btnText = item.stock === 'outofstock' ? 'Out of Stock' : '+ Add to Cart';

      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <img src="${item.img}" class="product-img" alt="${item.name}" onerror="this.src='https://placehold.co/300x300?text=No+Photo';">
        <div class="product-details">
          <div>
            ${stockBadge}
            <div class="product-title">${item.name}</div>
            <div class="product-price">KSh ${item.price.toLocaleString()}</div>
          </div>
          <button class="add-to-cart-btn" data-name="${item.name}" data-price="${item.price}" ${isDisabled}>${btnText}</button>
        </div>
      `;
      productGrid.appendChild(card);
    });

    document.querySelectorAll(".add-to-cart-btn:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const name = e.target.getAttribute("data-name");
        const price = Number(e.target.getAttribute("data-price"));
        addToCart(name, price);
      });
    });
  }

  function addToCart(name, price) {
    const existing = cart.find((item) => item.name === name);
    if (existing) { existing.qty += 1; } 
    else { cart.push({ name, price, qty: 1 }); }
    saveCart();
  }

  function updateQty(index, change) {
    cart[index].qty += change;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart();
  }

  function saveCart() {
    localStorage.setItem(`cart_${storeId}`, JSON.stringify(cart));
    updateCartUI();
  }

  function calculateSubtotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = calculateSubtotal();

    cartBadge.innerText = count;
    cartTotal.innerText = `KSh ${subtotal.toLocaleString()}`;

    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `<p style="text-align: center; color: #94a3b8; padding: 20px 0;">Your cart is empty.</p>`;
      return;
    }

    cart.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "cart-item-row";
      row.innerHTML = `
        <div>
          <strong style="font-size: 14px;">${item.name}</strong>
          <div style="font-size: 12px; color: #64748b;">KSh ${item.price.toLocaleString()} × ${item.qty}</div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" data-index="${index}" data-change="-1">-</button>
          <span style="font-size: 13px; font-weight: 600;">${item.qty}</span>
          <button class="qty-btn" data-index="${index}" data-change="1">+</button>
        </div>
      `;
      cartItemsContainer.appendChild(row);
    });

    document.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.target.getAttribute("data-index"));
        const change = Number(e.target.getAttribute("data-change"));
        updateQty(idx, change);
      });
    });
  }

  openCartBtn.addEventListener("click", () => {
    cartDrawer.classList.add("open");
    cartOverlay.style.display = "block";
  });

  closeCartBtn.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);

  function closeCart() {
    cartDrawer.classList.remove("open");
    cartOverlay.style.display = "none";
  }

  // WhatsApp Checkout
  whatsappCheckoutBtn.addEventListener("click", () => {
    if (cart.length === 0) { alert("Your cart is empty."); return; }

    const name = custNameInput.value.trim();
    const address = custAddressInput.value.trim();

    if (!name || !address) {
      alert("Please enter your Full Name and Delivery Address.");
      return;
    }

    if (!storePhone) {
      alert("This merchant has not set up a WhatsApp phone number yet.");
      return;
    }

    const subtotal = calculateSubtotal();

    let message = `🛒 *NEW ORDER - ${storeId.toUpperCase()}*\n\n`;
    message += `👤 *Customer:* ${name}\n`;
    message += `📍 *Delivery Address:* ${address}\n\n`;
    message += `*Order Items:*\n`;

    cart.forEach((item, i) => {
      message += `${i + 1}. ${item.name} (x${item.qty}) - KSh ${(item.price * item.qty).toLocaleString()}\n`;
    });

    message += `\n💰 *Total Due:* KSh ${subtotal.toLocaleString()}`;

    const cleanedPhone = storePhone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  });

  fetchStoreData();
})();
