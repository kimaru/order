(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";

  // State Management
  let storePhone = "";
  let storeItems = [];
  let cart = []; // Array of { name, price, quantity, img }

  // DOM Elements
  const storeTitle = document.getElementById("store-title");
  const catalogGrid = document.getElementById("catalog-grid");
  const floatingCart = document.getElementById("floating-cart");
  const cartCount = document.getElementById("cart-count");
  const cartBarTotal = document.getElementById("cart-bar-total");
  const cartOverlay = document.getElementById("cart-overlay");
  const cartDrawer = document.getElementById("cart-drawer");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartTotalPrice = document.getElementById("cart-total-price");
  const whatsappCheckoutBtn = document.getElementById("whatsapp-checkout-btn");

  // Customer Form Elements
  const custNameInput = document.getElementById("cust-name");
  const custAddressInput = document.getElementById("cust-address");
  const custNotesInput = document.getElementById("cust-notes");

  // 1. Get Store ID from URL parameter (e.g., index.html?id=mystore)
  const urlParams = new URLSearchParams(window.location.search);
  const storeId = (urlParams.get("id") || "demo").toLowerCase();

  // Update Store Title
  if (storeTitle) {
    storeTitle.innerText = storeId.replace(/-/g, " ");
  }

  // 2. Fetch Storefront Data from Firestore
  function fetchStorefront() {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Store "${storeId}" not found (HTTP ${res.status})`);
        }
        return res.json();
      })
      .then((doc) => {
        if (!doc.fields) return;

        // Parse Store Phone
        storePhone = doc.fields.phone?.stringValue || "";

        // Parse Store Items
        const rawItems = doc.fields.items?.arrayValue?.values || [];
        storeItems = rawItems.map((item) => {
          const mapFields = item.mapValue?.fields || {};
          return {
            name: mapFields.name?.stringValue || "Untitled Product",
            price: Number(mapFields.price?.doubleValue || mapFields.price?.integerValue || 0),
            img: mapFields.img?.stringValue || "https://placehold.co/300x300?text=No+Image",
          };
        });

        renderCatalog();
      })
      .catch((err) => {
        console.error("Error loading storefront:", err);
        if (catalogGrid) {
          catalogGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 16px; color: #64748b;">
              <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Store Not Found</p>
              <p style="font-size: 13px;">Please check the store link or create this store ID in your dashboard.</p>
            </div>`;
        }
      });
  }

  // 3. Render Product Catalog Grid
  function renderCatalog() {
    if (!catalogGrid) return;

    if (storeItems.length === 0) {
      catalogGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 16px; color: #64748b;">
          No products currently available in this store.
        </div>`;
      return;
    }

    catalogGrid.innerHTML = "";

    storeItems.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "product-card";

      const formattedPrice = item.price.toLocaleString();
      const imgSrc = item.img || "https://placehold.co/300x300?text=No+Image";

      card.innerHTML = `
        <img src="${imgSrc}" class="product-img" alt="${item.name}" onerror="this.src='https://placehold.co/300x300?text=No+Image';">
        <div class="product-details">
          <div>
            <div class="product-title">${item.name}</div>
            <div class="product-price">KSh ${formattedPrice}</div>
          </div>
          <button class="add-to-cart-btn" data-index="${index}">+ Add to Cart</button>
        </div>
      `;

      catalogGrid.appendChild(card);
    });

    // Add click listeners to "Add to Cart" buttons
    document.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.dataset.index;
        addToCart(storeItems[idx]);
      });
    });
  }

  // 4. Cart Logic
  function addToCart(product) {
    const existingIndex = cart.findIndex((item) => item.name === product.name);

    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        name: product.name,
        price: product.price,
        quantity: 1,
        img: product.img,
      });
    }

    updateCartUI();
  }

  function changeQuantity(index, delta) {
    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
    updateCartUI();
  }

  // 5. Update UI (Floating Bar & Drawer Content)
  function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Floating Bar Visibility & Count
    if (totalItems > 0) {
      floatingCart.style.display = "flex";
      cartCount.innerText = totalItems;
      cartBarTotal.innerText = `KSh ${totalPrice.toLocaleString()}`;
    } else {
      floatingCart.style.display = "none";
      closeCartDrawer();
    }

    // Render Items inside Cart Drawer
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `<p class="empty-msg">Your cart is currently empty.</p>`;
      cartTotalPrice.innerText = "KSh 0.00";
      return;
    }

    cartItemsContainer.innerHTML = "";
    cart.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "cart-item-row";

      const itemTotal = (item.price * item.quantity).toLocaleString();

      row.innerHTML = `
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-sub">KSh ${item.price.toLocaleString()} × ${item.quantity} = <strong>KSh ${itemTotal}</strong></div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn minus-btn" data-index="${index}">-</button>
          <span style="font-size: 13px; font-weight: 600;">${item.quantity}</span>
          <button class="qty-btn plus-btn" data-index="${index}">+</button>
        </div>
      `;

      cartItemsContainer.appendChild(row);
    });

    cartTotalPrice.innerText = `KSh ${totalPrice.toLocaleString()}`;

    // Attach quantity button handlers
    document.querySelectorAll(".minus-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        changeQuantity(e.target.dataset.index, -1);
      });
    });

    document.querySelectorAll(".plus-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        changeQuantity(e.target.dataset.index, 1);
      });
    });
  }

  // 6. Cart Drawer Toggle Controls
  function openCartDrawer() {
    cartOverlay.classList.add("active");
    cartDrawer.classList.add("active");
  }

  function closeCartDrawer() {
    cartOverlay.classList.remove("active");
    cartDrawer.classList.remove("active");
  }

  if (floatingCart) floatingCart.addEventListener("click", openCartDrawer);
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCartDrawer);

  // 7. Complete Order on WhatsApp Handler
  if (whatsappCheckoutBtn) {
    whatsappCheckoutBtn.addEventListener("click", () => {
      if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
      }

      if (!storePhone) {
        alert("This store has not configured a WhatsApp phone number yet.");
        return;
      }

      // Read Customer Delivery Details
      const custName = custNameInput ? custNameInput.value.trim() : "";
      const custAddress = custAddressInput ? custAddressInput.value.trim() : "";
      const custNotes = custNotesInput ? custNotesInput.value.trim() : "";

      // Validate Required Fields
      if (!custName) {
        alert("Please enter your name for the order.");
        if (custNameInput) custNameInput.focus();
        return;
      }

      if (!custAddress) {
        alert("Please enter your delivery address or location.");
        if (custAddressInput) custAddressInput.focus();
        return;
      }

      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Build Formatted WhatsApp Message
      let message = `🛍️ *NEW ORDER PLACED*\n`;
      message += `----------------------------------\n`;
      message += `👤 *Customer:* ${custName}\n`;
      message += `📍 *Delivery Address:* ${custAddress}\n`;
      if (custNotes) {
        message += `📝 *Notes:* ${custNotes}\n`;
      }
      message += `----------------------------------\n\n`;
      message += `🛒 *ORDER ITEMS:*\n`;

      cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        message += `${index + 1}. *${item.name}* x${item.quantity} — KSh ${itemTotal.toLocaleString()}\n`;
      });

      message += `\n💰 *TOTAL AMOUNT:* KSh ${totalAmount.toLocaleString()}\n`;
      message += `----------------------------------\n`;
      message += `Please confirm my order and share payment instructions!`;

      // Clean phone number (keep digits only)
      const cleanPhone = storePhone.replace(/[^0-9]/g, "");
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

      // Redirect to WhatsApp
      window.open(whatsappUrl, "_blank");
    });
  }

  // Initialize Storefront
  fetchStorefront();
})();
