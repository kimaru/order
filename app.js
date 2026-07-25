(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";

  // Extract Store ID from URL parameter (e.g. index.html?store=aromatic-vibes)
  const urlParams = new URLSearchParams(window.location.search);
  const storeId = urlParams.get("store") || "aromatic-vibes";

  // State
  let storePhone = "";
  let cart = JSON.parse(localStorage.getItem(`cart_${storeId}`)) || [];

  // DOM Elements
  const brandLogo = document.getElementById("brand-logo");
  const brandName = document.getElementById("brand-name");
  const brandSlogan = document.getElementById("brand-slogan");
  const productGrid = document.getElementById("product-grid");

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
  const custNotesInput = document.getElementById("cust-notes");

  // Fetch Store Settings & Catalog from Firestore
  function fetchStoreData() {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Store not found");
        return res.json();
      })
      .then((doc) => {
        if (!doc.fields) return;

        // Phone Number
        storePhone = doc.fields.phone?.stringValue || "";

        // Dynamic Branding & Colors
        const slogan = doc.fields.slogan?.stringValue || "";
        const logoUrl = doc.fields.logo?.stringValue || "";
        const themeColor = doc.fields.themeColor?.stringValue || "#10b981";

        // Apply Custom Accent Color Variable
        document.documentElement.style.setProperty("--accent-color", themeColor);

        // Header Updates
        brandName.innerText = storeId.replace(/-/g, " ");
        if (slogan) {
          brandSlogan.innerText = slogan;
          brandSlogan.style.display = "block";
        } else {
          brandSlogan.style.display = "none";
        }

        if (logoUrl) {
          brandLogo.src = logoUrl;
          brandLogo.style.display = "block";
        } else {
          brandLogo.style.display = "none";
        }

        // Render Catalog Items
        const rawItems = doc.fields.items?.arrayValue?.values || [];
        const items = rawItems.map((item) => {
          const fields = item.mapValue?.fields || {};
          return {
            name: fields.name?.stringValue || "Unnamed Product",
            price: Number(fields.price?.doubleValue || fields.price?.integerValue || 0),
            img: fields.img?.stringValue || "https://placehold.co/300x300?text=No+Photo",
          };
        });

        renderProducts(items);
      })
      .catch((err) => {
        console.error(err);
        brandName.innerText = "Store Not Found";
        productGrid.innerHTML = `<p style="text-align: center; color: #94a3b8; grid-column: 1/-1;">Could not load products for "${storeId}". Please check the URL parameter.</p>`;
      });
  }

  // Render Catalog Grid
  function renderProducts(items) {
    productGrid.innerHTML = "";

    if (items.length === 0) {
      productGrid.innerHTML = `<p style="text-align: center; color: #94a3b8; grid-column: 1/-1;">No products available right now.</p>`;
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <img src="${item.img}" class="product-img" alt="${item.name}" onerror="this.src='https://placehold.co/300x300?text=No+Photo';">
        <div class="product-details">
          <div>
            <div class="product-title">${item.name}</div>
            <div class="product-price">KSh ${item.price.toLocaleString()}</div>
          </div>
          <button class="add-to-cart-btn" data-name="${item.name}" data-price="${item.price}">+ Add to Cart</button>
        </div>
      `;
      productGrid.appendChild(card);
    });

    // Add to Cart Listeners
    document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const name = e.target.getAttribute("data-name");
        const price = Number(e.target.getAttribute("data-price"));
        addToCart(name, price);
      });
    });
  }

  // Cart Management
  function addToCart(name, price) {
    const existing = cart.find((item) => item.name === name);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ name, price, qty: 1 });
    }
    saveCart();
  }

  function updateQty(index, change) {
    cart[index].qty += change;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
    saveCart();
  }

  function saveCart() {
    localStorage.setItem(`cart_${storeId}`, JSON.stringify(cart));
    updateCartUI();
  }

  function calculateTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function calculateItemCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function updateCartUI() {
    const count = calculateItemCount();
    const total = calculateTotal();

    cartBadge.innerText = count;
    cartTotal.innerText = `KSh ${total.toLocaleString()}`;

    // Render Drawer Items
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

  // Drawer Toggle Handlers
  function openCart() {
    cartDrawer.classList.add("open");
    cartOverlay.style.display = "block";
  }

  function closeCart() {
    cartDrawer.classList.remove("open");
    cartOverlay.style.display = "none";
  }

  openCartBtn.addEventListener("click", openCart);
  closeCartBtn.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);

  // WhatsApp Checkout Handler
  whatsappCheckoutBtn.addEventListener("click", () => {
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    const name = custNameInput.value.trim();
    const address = custAddressInput.value.trim();
    const notes = custNotesInput.value.trim();

    if (!name || !address) {
      alert("Please fill in your Name and Delivery Address.");
      return;
    }

    if (!storePhone) {
      alert("This merchant has not set up a WhatsApp phone number yet.");
      return;
    }

    let message = `🛒 *NEW ORDER - ${storeId.toUpperCase()}*\n\n`;
    message += `👤 *Customer:* ${name}\n`;
    message += `📍 *Delivery Address:* ${address}\n`;
    if (notes) message += `📝 *Notes:* ${notes}\n`;
    message += `\n*Order Items:*\n`;

    cart.forEach((item, i) => {
      message += `${i + 1}. ${item.name} (x${item.qty}) - KSh ${(item.price * item.qty).toLocaleString()}\n`;
    });

    message += `\n💰 *Total:* KSh ${calculateTotal().toLocaleString()}`;

    const cleanedPhone = storePhone.replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
  });

  // Initialize Page
  fetchStoreData();
  updateCartUI();
})();
