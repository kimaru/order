// ... [In app.js inside fetchStoreData parser] ...
allProducts = rawItems.map((item) => {
  const itemFields = item.mapValue?.fields || {};
  
  // Support multi-category array with fallback for legacy single category
  let cats = [];
  if (itemFields.categories?.arrayValue?.values) {
    cats = itemFields.categories.arrayValue.values.map(v => v.stringValue);
  } else if (itemFields.category?.stringValue) {
    cats = [itemFields.category.stringValue];
  }
  if (cats.length === 0) cats = ["General"];

  return {
    name: itemFields.name?.stringValue || "Unnamed Product",
    price: Number(itemFields.price?.doubleValue || itemFields.price?.integerValue || 0),
    categories: cats,
    stock: itemFields.stock?.stringValue || "instock",
    img: itemFields.img?.stringValue || "https://placehold.co/300x300?text=No+Photo",
  };
});

// ... [In app.js renderCategories] ...
function renderCategories() {
  categoriesBar.innerHTML = "";
  
  // Flatten all product categories into a unique set
  const catSet = new Set(["All"]);
  allProducts.forEach(p => (p.categories || []).forEach(c => catSet.add(c)));

  catSet.forEach(cat => {
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

// ... [In app.js renderProducts] ...
function renderProducts() {
  productGrid.innerHTML = "";

  // Match if activeCategory is 'All' or if the product's categories array includes activeCategory
  const filtered = activeCategory === "All" 
    ? allProducts 
    : allProducts.filter(p => p.categories && p.categories.includes(activeCategory));

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
          <div style="font-size: 11px; color: #64748b; margin-bottom: 2px;">${item.categories.join(" • ")}</div>
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
