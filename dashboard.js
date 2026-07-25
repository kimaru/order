(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";

  // Elements
  const storeIdInput = document.getElementById("store-id-input");
  const storePhoneInput = document.getElementById("store-phone-input");
  const storeSloganInput = document.getElementById("store-slogan-input");
  const storeLogoFileInput = document.getElementById("store-logo-file");
  const logoPreviewImg = document.getElementById("logo-preview-img");
  const storeThemeColorInput = document.getElementById("store-theme-color");
  const colorHexLabel = document.getElementById("color-hex-label");

  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const fetchCloudBtn = document.getElementById("fetch-cloud-btn");
  const syncCloudBtn = document.getElementById("sync-cloud-btn");
  const statusMsg = document.getElementById("status-msg");

  const prodNameInput = document.getElementById("prod-name");
  const prodPriceInput = document.getElementById("prod-price");
  const prodCategorySelect = document.getElementById("prod-category-select");
  const prodCustomCategoryInput = document.getElementById("prod-custom-category");
  const prodStockSelect = document.getElementById("prod-stock");
  const prodImgFileInput = document.getElementById("prod-img-file");
  const prodPreviewImg = document.getElementById("prod-preview-img");
  const addProdBtn = document.getElementById("add-prod-btn");
  const productListContainer = document.getElementById("product-list-container");
  const prodCount = document.getElementById("prod-count");

  // Category Manager Elements
  const manageCategorySelect = document.getElementById("manage-category-select");
  const renameCatBtn = document.getElementById("rename-cat-btn");
  const deleteCatBtn = document.getElementById("delete-cat-btn");

  const copyLinkBtn = document.getElementById("copy-link-btn");

  let localItems = [];
  let availableCategories = new Set(["General"]);
  let currentLogoBase64 = "";
  let currentProdImgBase64 = "";
  let currentGeneratedUrl = "";
  let editingIndex = -1;

  // Handle Product Form Category Dropdown Toggle
  if (prodCategorySelect) {
    prodCategorySelect.addEventListener("change", (e) => {
      if (e.target.value === "__ADD_NEW__") {
        prodCustomCategoryInput.style.display = "block";
        prodCustomCategoryInput.focus();
      } else {
        prodCustomCategoryInput.style.display = "none";
        prodCustomCategoryInput.value = "";
      }
    });
  }

  // Populate Product Dropdown and Category Manager Dropdown
  function refreshCategoryDropdowns(selectedCategory = "General") {
    // Collect categories actively used by products
    availableCategories = new Set(["General"]);
    localItems.forEach(item => {
      if (item.category) availableCategories.add(item.category);
    });

    // 1. Refresh Product Addition Form Dropdown
    if (prodCategorySelect) {
      prodCategorySelect.innerHTML = "";
      availableCategories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.innerText = cat;
        prodCategorySelect.appendChild(opt);
      });

      const addNewOpt = document.createElement("option");
      addNewOpt.value = "__ADD_NEW__";
      addNewOpt.innerText = "➕ Add another category...";
      prodCategorySelect.appendChild(addNewOpt);

      if (availableCategories.has(selectedCategory)) {
        prodCategorySelect.value = selectedCategory;
        prodCustomCategoryInput.style.display = "none";
      } else if (selectedCategory && selectedCategory !== "General") {
        availableCategories.add(selectedCategory);
        refreshCategoryDropdowns(selectedCategory);
      }
    }

    // 2. Refresh Category Manager Tool Dropdown
    if (manageCategorySelect) {
      manageCategorySelect.innerHTML = `<option value="">Select a category to manage...</option>`;
      availableCategories.forEach((cat) => {
        if (cat !== "General") {
          const opt = document.createElement("option");
          opt.value = cat;
          opt.innerText = cat;
          manageCategorySelect.appendChild(opt);
        }
      });
    }
  }

  // Rename Category Across All Products
  if (renameCatBtn) {
    renameCatBtn.addEventListener("click", () => {
      const oldCat = manageCategorySelect.value;
      if (!oldCat) {
        showStatus("Please select a category to rename.", true);
        return;
      }

      const newCat = prompt(`Enter new name for category "${oldCat}":`, oldCat);
      if (!newCat || newCat.trim() === "" || newCat.trim() === oldCat) return;

      const trimmedNewCat = newCat.trim();

      localItems.forEach((item) => {
        if (item.category === oldCat) {
          item.category = trimmedNewCat;
        }
      });

      renderProducts();
      refreshCategoryDropdowns(trimmedNewCat);
      showStatus(`Renamed category "${oldCat}" to "${trimmedNewCat}". Click "Publish" to sync.`);
    });
  }

  // Delete Category Across All Products (Revert assigned items to "General")
  if (deleteCatBtn) {
    deleteCatBtn.addEventListener("click", () => {
      const targetCat = manageCategorySelect.value;
      if (!targetCat) {
        showStatus("Please select a category to delete.", true);
        return;
      }

      if (confirm(`Are you sure you want to delete category "${targetCat}"? All items in this category will be moved to "General".`)) {
        localItems.forEach((item) => {
          if (item.category === targetCat) {
            item.category = "General";
          }
        });

        renderProducts();
        refreshCategoryDropdowns("General");
        showStatus(`Deleted category "${targetCat}". Assigned items moved to "General". Click "Publish" to sync.`);
      }
    });
  }

  function updateStoreLinkBanner(storeId) {
    const banner = document.getElementById("store-link-banner");
    const urlText = document.getElementById("store-url-text");
    const visitBtn = document.getElementById("visit-store-btn");

    if (!storeId || !banner) return;

    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    currentGeneratedUrl = `${window.location.origin}${basePath}/index.html?store=${encodeURIComponent(storeId)}`;

    if (urlText) urlText.innerText = currentGeneratedUrl;
    if (visitBtn) visitBtn.href = currentGeneratedUrl;
    
    banner.style.display = "flex";
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      if (!currentGeneratedUrl) return;
      navigator.clipboard.writeText(currentGeneratedUrl).then(() => {
        showStatus("📋 Storefront link copied to clipboard!");
      });
    });
  }

  if (storeThemeColorInput) {
    storeThemeColorInput.addEventListener("input", (e) => {
      if (colorHexLabel) colorHexLabel.innerText = e.target.value;
    });
  }

  function compressImage(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/webp", quality);
        callback(dataUrl);
      };
    };
  }

  if (storeLogoFileInput) {
    storeLogoFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, 250, 250, 0.8, (compressedBase64) => {
          currentLogoBase64 = compressedBase64;
          if (logoPreviewImg) logoPreviewImg.src = compressedBase64;
        });
      }
    });
  }

  if (prodImgFileInput) {
    prodImgFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        compressImage(file, 500, 500, 0.8, (compressedBase64) => {
          currentProdImgBase64 = compressedBase64;
          if (prodPreviewImg) prodPreviewImg.src = compressedBase64;
        });
      }
    });
  }

  function showStatus(text, isError = false) {
    if (!statusMsg) return;
    statusMsg.innerText = text;
    statusMsg.style.display = "block";
    statusMsg.style.backgroundColor = isError ? "#fef2f2" : "#f0fdf4";
    statusMsg.style.borderColor = isError ? "#fecaca" : "#bbf7d0";
    statusMsg.style.color = isError ? "#991b1b" : "#166534";
    setTimeout(() => { statusMsg.style.display = "none"; }, 5000);
  }

  // Fetch Store Data from Firestore
  function fetchFromCloud() {
    const storeId = storeIdInput.value.trim().toLowerCase();
    if (!storeId) {
      showStatus("Please enter a Store ID first.", true);
      return;
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Store ID not found in database.");
        return res.json();
      })
      .then((doc) => {
        if (!doc.fields) return;

        storePhoneInput.value = doc.fields.phone?.stringValue || "";
        storeSloganInput.value = doc.fields.slogan?.stringValue || "";
        storeThemeColorInput.value = doc.fields.themeColor?.stringValue || "#10b981";
        if (colorHexLabel) colorHexLabel.innerText = storeThemeColorInput.value;

        currentLogoBase64 = doc.fields.logo?.stringValue || "";
        if (logoPreviewImg) {
          logoPreviewImg.src = currentLogoBase64 || "https://placehold.co/100x100?text=Logo";
        }

        const rawItems = doc.fields.items?.arrayValue?.values || [];
        localItems = rawItems.map((item) => {
          const fields = item.mapValue?.fields || {};
          return {
            name: fields.name?.stringValue || "",
            price: Number(fields.price?.doubleValue || fields.price?.integerValue || 0),
            category: fields.category?.stringValue || "General",
            stock: fields.stock?.stringValue || "instock",
            img: fields.img?.stringValue || "",
          };
        });

        resetProductForm();
        renderProducts();
        refreshCategoryDropdowns();
        updateStoreLinkBanner(storeId);
        showStatus(`Loaded store "${storeId}" with ${localItems.length} products!`);
      })
      .catch((err) => {
        console.error(err);
        showStatus(`Store "${storeId}" does not exist in cloud yet. Save settings to create it!`, false);
        updateStoreLinkBanner(storeId);
      });
  }

  // Render Local Product List
  function renderProducts() {
    if (!productListContainer) return;
    productListContainer.innerHTML = "";
    if (prodCount) prodCount.innerText = localItems.length;

    if (localItems.length === 0) {
      productListContainer.innerHTML = `<p style="color: #94a3b8; font-size: 13px; text-align: center; padding: 12px 0;">No products added yet.</p>`;
      return;
    }

    localItems.forEach((item, index) => {
      const stockBadge = item.stock === 'instock' 
        ? `<span class="badge badge-instock">In Stock</span>`
        : item.stock === 'lowstock'
        ? `<span class="badge badge-lowstock">Low Stock</span>`
        : `<span class="badge badge-outofstock">Out of Stock</span>`;

      const row = document.createElement("div");
      row.className = "product-row";
      row.innerHTML = `
        <img src="${item.img || 'https://placehold.co/100x100?text=No+Img'}" onerror="this.src='https://placehold.co/100x100?text=No+Img';">
        <div>
          <strong style="font-size: 14px; color: #0f172a;">${item.name}</strong>
          <div style="font-size: 12px; color: #64748b;">🏷️ ${item.category || 'General'} | ${stockBadge}</div>
        </div>
        <div style="font-weight: 600; font-size: 14px; color: #0f172a;">KSh ${item.price.toLocaleString()}</div>
        <div style="display: flex; gap: 6px; justify-content: flex-end;">
          <button class="edit-btn" data-index="${index}" title="Edit Product" style="background:none; border:none; cursor:pointer; font-size:15px;">✏️</button>
          <button class="del-btn" data-index="${index}" title="Delete Product">🗑️</button>
        </div>
      `;
      productListContainer.appendChild(row);
    });

    document.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.getAttribute("data-index");
        localItems.splice(idx, 1);
        if (editingIndex == idx) resetProductForm();
        renderProducts();
        refreshCategoryDropdowns();
      });
    });

    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.target.getAttribute("data-index"));
        startEditingProduct(idx);
      });
    });
  }

  function startEditingProduct(index) {
    editingIndex = index;
    const item = localItems[index];

    prodNameInput.value = item.name;
    prodPriceInput.value = item.price;
    prodStockSelect.value = item.stock || "instock";
    currentProdImgBase64 = item.img || "";

    refreshCategoryDropdowns(item.category || "General");

    if (prodPreviewImg) {
      prodPreviewImg.src = item.img || "https://placehold.co/100x100?text=Product";
    }

    addProdBtn.innerText = "💾 Update Product";
    addProdBtn.style.background = "#2563eb";
    addProdBtn.style.color = "white";

    prodNameInput.focus();
  }

  function resetProductForm() {
    editingIndex = -1;
    prodNameInput.value = "";
    prodPriceInput.value = "";
    prodCustomCategoryInput.value = "";
    prodCustomCategoryInput.style.display = "none";
    prodStockSelect.value = "instock";
    if (prodImgFileInput) prodImgFileInput.value = "";
    currentProdImgBase64 = "";
    if (prodPreviewImg) prodPreviewImg.src = "https://placehold.co/100x100?text=Product";

    refreshCategoryDropdowns();

    addProdBtn.innerText = "+ Add Product to List";
    addProdBtn.style.background = "#f1f5f9";
    addProdBtn.style.color = "#334155";
  }

  // Add/Update Item in Local List
  if (addProdBtn) {
    addProdBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const name = prodNameInput.value.trim();
      const price = Number(prodPriceInput.value);
      const stock = prodStockSelect.value;

      let category = prodCategorySelect.value;
      if (category === "__ADD_NEW__") {
        category = prodCustomCategoryInput.value.trim();
      }
      if (!category) category = "General";

      if (!name || isNaN(price) || price <= 0) {
        showStatus("Please enter a valid product name and price.", true);
        return;
      }

      const finalImg = currentProdImgBase64 || "https://placehold.co/200x200?text=No+Photo";

      if (editingIndex >= 0) {
        localItems[editingIndex] = { name, price, category, stock, img: finalImg };
        showStatus(`Updated "${name}". Click "Publish All Changes" to sync online.`);
      } else {
        localItems.push({ name, price, category, stock, img: finalImg });
        showStatus(`Added "${name}" to list. Click "Publish All Changes" to sync online.`);
      }

      renderProducts();
      refreshCategoryDropdowns(category);
      resetProductForm();
    });
  }

  // Save/Publish to Firestore
  function saveToCloud() {
    const storeId = storeIdInput.value.trim().toLowerCase();
    const phone = storePhoneInput.value.trim();
    const slogan = storeSloganInput.value.trim();
    const themeColor = storeThemeColorInput.value || "#10b981";

    if (!storeId) {
      showStatus("Please enter a Store ID.", true);
      return;
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    const formattedItems = localItems.map((item) => ({
      mapValue: {
        fields: {
          name: { stringValue: item.name || "" },
          price: { doubleValue: Number(item.price) || 0 },
          category: { stringValue: item.category || "General" },
          stock: { stringValue: item.stock || "instock" },
          img: { stringValue: item.img || "" },
        },
      },
    }));

    const payload = {
      fields: {
        phone: { stringValue: phone || "" },
        slogan: { stringValue: slogan || "" },
        logo: { stringValue: currentLogoBase64 || "" },
        themeColor: { stringValue: themeColor },
        items: { arrayValue: { values: formattedItems } },
      },
    };

    fetch(firestoreUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Cloud save failed.");
        return res.json();
      })
      .then(() => {
        updateStoreLinkBanner(storeId);
        showStatus(`🚀 Published successfully! All changes live on storefront.`);
      })
      .catch((err) => {
        console.error(err);
        showStatus("Failed to publish to cloud.", true);
      });
  }

  if (fetchCloudBtn) fetchCloudBtn.addEventListener("click", fetchFromCloud);
  if (saveSettingsBtn) saveSettingsBtn.addEventListener("click", saveToCloud);
  if (syncCloudBtn) syncCloudBtn.addEventListener("click", saveToCloud);
})();
