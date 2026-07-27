(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";

  // State Management
  let products = [];
  let availableCategories = ["Men", "Women", "Unisex", "Designer", "Niche"];
  let selectedCategories = [];

  // Helper Elements
  const storeIdInput = document.getElementById("store-id-input");
  const storePhoneInput = document.getElementById("store-phone-input");
  const storeSloganInput = document.getElementById("store-slogan-input");
  const storeThemeColor = document.getElementById("store-theme-color");
  const colorHexLabel = document.getElementById("color-hex-label");
  const logoPreviewImg = document.getElementById("logo-preview-img");
  const storeLogoFile = document.getElementById("store-logo-file");

  const prodNameInput = document.getElementById("prod-name");
  const prodStockSelect = document.getElementById("prod-stock");
  const prodPreviewImg = document.getElementById("prod-preview-img");
  const prodImgFile = document.getElementById("prod-img-file");
  const prodCountLabel = document.getElementById("prod-count");
  const productListContainer = document.getElementById("product-list-container");

  const statusMsg = document.getElementById("status-msg");
  const storeLinkBanner = document.getElementById("store-link-banner");
  const storeUrlText = document.getElementById("store-url-text");
  const visitStoreBtn = document.getElementById("visit-store-btn");
  const copyLinkBtn = document.getElementById("copy-link-btn");

  let logoBase64 = "";
  let prodImageBase64 = "";

  // Show status banner
  function showStatus(msg, type = "success") {
    if (!statusMsg) return;
    statusMsg.style.display = "block";
    statusMsg.innerText = msg;
    if (type === "success") {
      statusMsg.style.background = "#dcfce7";
      statusMsg.style.color = "#166534";
      statusMsg.style.borderColor = "#bbf7d0";
    } else {
      statusMsg.style.background = "#fee2e2";
      statusMsg.style.color = "#991b1b";
      statusMsg.style.borderColor = "#fecaca";
    }
    setTimeout(() => { statusMsg.style.display = "none"; }, 5000);
  }

  // Update live store link UI
  function updateStoreLinkBanner(storeId) {
    if (!storeId) {
      if (storeLinkBanner) storeLinkBanner.style.display = "none";
      return;
    }
    const storeUrl = `${window.location.origin}${window.location.pathname.replace("dashboard.html", "index.html")}?store=${storeId.toLowerCase().trim()}`;
    if (storeUrlText) storeUrlText.innerText = storeUrl;
    if (visitStoreBtn) visitStoreBtn.href = storeUrl;
    if (storeLinkBanner) storeLinkBanner.style.display = "flex";
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", () => {
      const url = storeUrlText?.innerText;
      if (url) {
        navigator.clipboard.writeText(url);
        showStatus("Storefront link copied to clipboard!");
      }
    });
  }

  if (storeThemeColor) {
    storeThemeColor.addEventListener("input", (e) => {
      if (colorHexLabel) colorHexLabel.innerText = e.target.value;
    });
  }

  // Handle Image Conversions
  if (storeLogoFile) {
    storeLogoFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          logoBase64 = evt.target.result;
          if (logoPreviewImg) logoPreviewImg.src = logoBase64;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (prodImgFile) {
    prodImgFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          prodImageBase64 = evt.target.result;
          if (prodPreviewImg) prodPreviewImg.src = prodImageBase64;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // --- VARIANT MANAGEMENT ---
  function renderVariantRows(variants = []) {
    const container = document.getElementById("variants-container");
    if (!container) return;
    container.innerHTML = "";

    if (variants.length === 0) {
      variants = [
        { size: "30ml", price: "" },
        { size: "50ml", price: "" },
        { size: "100ml", price: "" }
      ];
    }

    variants.forEach((v) => {
      const row = document.createElement("div");
      row.className = "variant-row";
      row.style.cssText = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";
      row.innerHTML = `
        <input type="text" class="variant-size" placeholder="Size (e.g. 100ml)" value="${v.size || ""}" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
        <input type="number" class="variant-price" placeholder="Price (KSh)" value="${v.price || ""}" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
        <button type="button" class="remove-variant-btn" style="background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">✕</button>
      `;
      container.appendChild(row);

      row.querySelector(".remove-variant-btn").addEventListener("click", () => row.remove());
    });
  }

  const addVariantBtn = document.getElementById("add-variant-btn");
  if (addVariantBtn) {
    addVariantBtn.addEventListener("click", () => {
      const container = document.getElementById("variants-container");
      if (!container) return;
      const row = document.createElement("div");
      row.className = "variant-row";
      row.style.cssText = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";
      row.innerHTML = `
        <input type="text" class="variant-size" placeholder="Size (e.g. 250ml)" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
        <input type="number" class="variant-price" placeholder="Price (KSh)" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
        <button type="button" class="remove-variant-btn" style="background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">✕</button>
      `;
      container.appendChild(row);
      row.querySelector(".remove-variant-btn").addEventListener("click", () => row.remove());
    });
  }

  function getVariantsFromForm() {
    const rows = document.querySelectorAll(".variant-row");
    const variants = [];
    rows.forEach((row) => {
      const size = row.querySelector(".variant-size")?.value.trim();
      const price = Number(row.querySelector(".variant-price")?.value || 0);
      if (size && price > 0) {
        variants.push({ size, price });
      }
    });
    return variants;
  }

  // --- CATEGORY TAG MANAGEMENT ---
  function renderCategoryTags() {
    const list = document.getElementById("category-tags-list");
    if (!list) return;
    list.innerHTML = "";

    availableCategories.forEach((cat) => {
      const isSelected = selectedCategories.includes(cat);
      const tag = document.createElement("span");
      tag.className = `cat-tag ${isSelected ? "selected" : ""}`;
      tag.innerHTML = `${cat} <span class="remove-cat-x" data-cat="${cat}">✕</span>`;

      tag.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-cat-x")) {
          e.stopPropagation();
          const targetCat = e.target.getAttribute("data-cat");
          availableCategories = availableCategories.filter((c) => c !== targetCat);
          selectedCategories = selectedCategories.filter((c) => c !== targetCat);
        } else {
          if (isSelected) {
            selectedCategories = selectedCategories.filter((c) => c !== cat);
          } else {
            selectedCategories.push(cat);
          }
        }
        renderCategoryTags();
      });

      list.appendChild(tag);
    });
  }

  const addCategoryTagBtn = document.getElementById("add-category-tag-btn");
  if (addCategoryTagBtn) {
    addCategoryTagBtn.addEventListener("click", () => {
      const newCatInput = document.getElementById("prod-new-category-input");
      const catVal = newCatInput?.value.trim();
      if (catVal) {
        if (!availableCategories.includes(catVal)) {
          availableCategories.push(catVal);
        }
        if (!selectedCategories.includes(catVal)) {
          selectedCategories.push(catVal);
        }
        newCatInput.value = "";
        renderCategoryTags();
      }
    });
  }

  // --- FETCH FROM CLOUD ---
  const fetchCloudBtn = document.getElementById("fetch-cloud-btn");
  if (fetchCloudBtn) {
    fetchCloudBtn.addEventListener("click", fetchFromCloud);
  }

  function fetchFromCloud() {
    const storeId = storeIdInput?.value.trim().toLowerCase();
    if (!storeId) {
      showStatus("Please enter a Store ID to fetch data.", "error");
      return;
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Store "${storeId}" not found in Cloud.`);
        return res.json();
      })
      .then((doc) => {
        if (!doc.fields) throw new Error("Store exists but contains no fields.");

        const fields = doc.fields;
        if (storePhoneInput) storePhoneInput.value = fields.phone?.stringValue || "";
        if (storeSloganInput) storeSloganInput.value = fields.slogan?.stringValue || "";
        
        const themeColor = fields.themeColor?.stringValue || "#10b981";
        if (storeThemeColor) storeThemeColor.value = themeColor;
        if (colorHexLabel) colorHexLabel.innerText = themeColor;

        logoBase64 = fields.logo?.stringValue || "";
        if (logoPreviewImg && logoBase64) logoPreviewImg.src = logoBase64;

        const rawItems = fields.items?.arrayValue?.values || [];
        products = rawItems.map((item) => {
          const f = item.mapValue?.fields || {};

          // Extract Categories
          let cats = [];
          if (f.categories?.arrayValue?.values) {
            cats = f.categories.arrayValue.values.map((v) => v.stringValue).filter(Boolean);
          } else if (f.category?.stringValue) {
            cats = [f.category.stringValue];
          }

          // Merge into global category list
          cats.forEach((c) => {
            if (!availableCategories.includes(c)) availableCategories.push(c);
          });

          // Extract Variants
          let variantsList = [];
          if (f.variants?.arrayValue?.values) {
            variantsList = f.variants.arrayValue.values.map((v) => {
              const vf = v.mapValue?.fields || {};
              return {
                size: vf.size?.stringValue || "",
                price: Number(vf.price?.doubleValue || vf.price?.integerValue || 0)
              };
            });
          }

          const basePrice = Number(f.price?.doubleValue || f.price?.integerValue || 0);
          if (variantsList.length === 0) {
            variantsList = [{ size: "Standard", price: basePrice }];
          }

          return {
            name: f.name?.stringValue || "Unnamed",
            categories: cats.length ? cats : ["General"],
            variants: variantsList,
            stock: f.stock?.stringValue || "instock",
            img: f.img?.stringValue || "https://placehold.co/100x100?text=Product"
          };
        });

        renderCategoryTags();
        renderProductList();
        updateStoreLinkBanner(storeId);
        showStatus(`Successfully loaded data for store "${storeId}"!`);
      })
      .catch((err) => {
        showStatus(err.message, "error");
      });
  }

  // --- SAVE STORE SETTINGS ---
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", () => {
      const storeId = storeIdInput?.value.trim().toLowerCase();
      if (!storeId) {
        showStatus("Store ID is required.", "error");
        return;
      }
      updateStoreLinkBanner(storeId);
      showStatus("Store settings updated locally. Click 'Publish All Changes' below to save to cloud.");
    });
  }

  // --- ADD PRODUCT TO LIST ---
  const addProdBtn = document.getElementById("add-prod-btn");
  if (addProdBtn) {
    addProdBtn.addEventListener("click", () => {
      const name = prodNameInput?.value.trim();
      const stock = prodStockSelect?.value;
      const variants = getVariantsFromForm();

      if (!name) {
        showStatus("Please enter a product name.", "error");
        return;
      }

      if (variants.length === 0) {
        showStatus("Please enter at least one size variant with a valid price.", "error");
        return;
      }

      const newProduct = {
        name,
        categories: selectedCategories.length ? [...selectedCategories] : ["General"],
        variants,
        stock,
        img: prodImageBase64 || "https://placehold.co/100x100?text=Product"
      };

      products.push(newProduct);

      // Reset Form
      if (prodNameInput) prodNameInput.value = "";
      prodImageBase64 = "";
      if (prodPreviewImg) prodPreviewImg.src = "https://placehold.co/100x100?text=Product";
      selectedCategories = [];
      renderCategoryTags();
      renderVariantRows();
      renderProductList();

      showStatus(`Added "${name}" to product list.`);
    });
  }

  function renderProductList() {
    if (!productListContainer) return;
    productListContainer.innerHTML = "";

    if (prodCountLabel) prodCountLabel.innerText = products.length;

    if (products.length === 0) {
      productListContainer.innerHTML = `<p style="text-align: center; color: #94a3b8; padding: 20px 0; font-size: 13px;">No items in catalog yet.</p>`;
      return;
    }

    products.forEach((p, index) => {
      const sizesSummary = p.variants.map((v) => `${v.size}: KSh ${v.price.toLocaleString()}`).join(" • ");
      const row = document.createElement("div");
      row.className = "product-row";
      row.innerHTML = `
        <img src="${p.img}" alt="${p.name}" onerror="this.src='https://placehold.co/100x100?text=Product';">
        <div>
          <div style="font-weight: 600; font-size: 14px;">${p.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Cats: ${p.categories.join(", ")}</div>
          <div style="font-size: 11px; color: #0f172a; font-weight: 500; margin-top: 2px;">${sizesSummary}</div>
        </div>
        <div>
          <span class="badge badge-${p.stock}">${p.stock}</span>
        </div>
        <button class="del-btn" data-index="${index}" title="Remove Product">🗑️</button>
      `;
      productListContainer.appendChild(row);
    });

    document.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.getAttribute("data-index"));
        products.splice(idx, 1);
        renderProductList();
      });
    });
  }

  // --- PUBLISH TO CLOUD ---
  const syncCloudBtn = document.getElementById("sync-cloud-btn");
  if (syncCloudBtn) {
    syncCloudBtn.addEventListener("click", syncToCloud);
  }

  function syncToCloud() {
    const storeId = storeIdInput?.value.trim().toLowerCase();
    if (!storeId) {
      showStatus("Store ID is required to publish.", "error");
      return;
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    const itemsPayload = products.map((p) => {
      const catValues = p.categories.map((c) => ({ stringValue: c }));
      const variantValues = p.variants.map((v) => ({
        mapValue: {
          fields: {
            size: { stringValue: v.size },
            price: { doubleValue: Number(v.price) }
          }
        }
      }));

      return {
        mapValue: {
          fields: {
            name: { stringValue: p.name },
            price: { doubleValue: Number(p.variants[0]?.price || 0) },
            stock: { stringValue: p.stock },
            img: { stringValue: p.img },
            categories: { arrayValue: { values: catValues } },
            variants: { arrayValue: { values: variantValues } }
          }
        }
      };
    });

    const payload = {
      fields: {
        phone: { stringValue: storePhoneInput?.value.trim() || "" },
        slogan: { stringValue: storeSloganInput?.value.trim() || "" },
        themeColor: { stringValue: storeThemeColor?.value || "#10b981" },
        logo: { stringValue: logoBase64 || "" },
        items: { arrayValue: { values: itemsPayload } }
      }
    };

    fetch(firestoreUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Sync failed with status code ${res.status}`);
        return res.json();
      })
      .then(() => {
        updateStoreLinkBanner(storeId);
        showStatus(`🎉 Successfully published all changes to storefront "${storeId}"!`);
      })
      .catch((err) => {
        showStatus(`Failed to publish: ${err.message}`, "error");
      });
  }

  // Initial Load Setup
  renderVariantRows();
  renderCategoryTags();
  renderProductList();
})();
