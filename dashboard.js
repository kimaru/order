(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";
  const DEFAULT_STORE_ID = "perfumescentre";

  // State Management
  let products = [];
  let availableCategories = ["Men", "Women", "Unisex", "Designer", "Niche"];
  let selectedCategories = [];
  let editingIndex = null; // Track item being edited (null = adding new)

  let logoBase64 = "";
  let prodImageBase64 = "";

  // Helper: Element safe getter
  const getEl = (id) => document.getElementById(id);

  // Status Banner display
  function showStatus(msg, type = "success") {
    console.log(`[STATUS ${type.toUpperCase()}]:`, msg);
    const statusMsg = getEl("status-msg");
    if (!statusMsg) {
      alert(`${type.toUpperCase()}: ${msg}`);
      return;
    }
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
    setTimeout(() => { if (statusMsg) statusMsg.style.display = "none"; }, 6000);
  }

  // Update Live Link
  function updateStoreLinkBanner(storeId) {
    const storeLinkBanner = getEl("store-link-banner");
    const storeUrlText = getEl("store-url-text");
    const visitStoreBtn = getEl("visit-store-btn");

    if (!storeId) {
      if (storeLinkBanner) storeLinkBanner.style.display = "none";
      return;
    }
    const storeUrl = `${window.location.origin}${window.location.pathname.replace("dashboard.html", "index.html")}?store=${storeId.toLowerCase().trim()}`;
    if (storeUrlText) storeUrlText.innerText = storeUrl;
    if (visitStoreBtn) visitStoreBtn.href = storeUrl;
    if (storeLinkBanner) storeLinkBanner.style.display = "flex";
  }

  // MAIN FETCH FUNCTION
  function fetchFromCloud() {
    const storeIdInput = getEl("store-id-input");
    const storeId = (storeIdInput?.value || DEFAULT_STORE_ID).trim().toLowerCase();

    showStatus(`⏳ Connecting to Cloud for "${storeId}"...`, "success");

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (res.status === 404) {
          throw new Error(`Store "${storeId}" is not published in Firestore yet. Add your items below and click "Publish All Changes" to create it!`);
        }
        if (!res.ok) {
          throw new Error(`HTTP Error ${res.status} while fetching store data.`);
        }
        return res.json();
      })
      .then((doc) => {
        if (!doc || !doc.fields) {
          throw new Error(`Document for "${storeId}" exists but contains no fields.`);
        }

        const fields = doc.fields;

        // 1. Phone & Slogan
        const phoneEl = getEl("store-phone-input");
        const sloganEl = getEl("store-slogan-input");
        if (phoneEl) phoneEl.value = fields.phone?.stringValue || "";
        if (sloganEl) sloganEl.value = fields.slogan?.stringValue || "";

        // 2. Theme Color
        const themeColor = fields.themeColor?.stringValue || "#10b981";
        const themeEl = getEl("store-theme-color");
        const hexEl = getEl("color-hex-label");
        if (themeEl) themeEl.value = themeColor;
        if (hexEl) hexEl.innerText = themeColor;

        // 3. Logo
        logoBase64 = fields.logo?.stringValue || "";
        const logoImg = getEl("logo-preview-img");
        if (logoImg) {
          logoImg.src = logoBase64 || "https://placehold.co/100x100?text=Logo";
        }

        // 4. Products Array Parsing
        const rawItems = fields.items?.arrayValue?.values || [];

        products = rawItems.map((item, index) => {
          const f = item.mapValue?.fields || {};

          let cats = [];
          if (f.categories?.arrayValue?.values) {
            cats = f.categories.arrayValue.values.map((v) => v.stringValue).filter(Boolean);
          } else if (f.category?.stringValue) {
            cats = [f.category.stringValue];
          }

          cats.forEach((c) => {
            if (c && !availableCategories.includes(c)) availableCategories.push(c);
          });

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

          const basePrice = Number(f.price?.doubleValue || f.price?.integerValue || 0);
          if (variantsList.length === 0) {
            variantsList = [{ size: "Standard", price: basePrice }];
          }

          return {
            name: f.name?.stringValue || `Product ${index + 1}`,
            categories: cats.length ? cats : ["General"],
            variants: variantsList,
            stock: f.stock?.stringValue || "instock",
            img: f.img?.stringValue || "https://placehold.co/100x100?text=Product"
          };
        });

        renderCategoryTags();
        renderProductList();
        updateStoreLinkBanner(storeId);
        showStatus(`🎉 Loaded store data for "${storeId}" (${products.length} products found)!`);
      })
      .catch((err) => {
        showStatus(err.message, "error");
      });
  }

  // --- VARIANT UI ---
  function renderVariantRows(variants = []) {
    const container = getEl("variants-container");
    if (!container) return;
    container.innerHTML = "";

    if (variants.length === 0) {
      variants = [{ size: "100ml", price: "" }];
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

  function getVariantsFromForm() {
    const rows = document.querySelectorAll(".variant-row");
    const variants = [];
    rows.forEach((row) => {
      const size = row.querySelector(".variant-size")?.value.trim();
      const price = Number(row.querySelector(".variant-price")?.value || 0);
      if (size && price > 0) variants.push({ size, price });
    });
    return variants;
  }

  // --- CATEGORY UI ---
  function renderCategoryTags() {
    const list = getEl("category-tags-list");
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

  // --- EDIT PRODUCT LOGIC ---
  function startEditingProduct(index) {
    const item = products[index];
    if (!item) return;

    editingIndex = index;

    // Fill form fields
    if (getEl("prod-name")) getEl("prod-name").value = item.name;
    if (getEl("prod-stock")) getEl("prod-stock").value = item.stock;

    prodImageBase64 = item.img;
    if (getEl("prod-preview-img")) getEl("prod-preview-img").src = item.img;

    selectedCategories = [...item.categories];
    renderCategoryTags();
    renderVariantRows(item.variants);

    // Update Button UI
    const addBtn = getEl("add-prod-btn");
    if (addBtn) {
      addBtn.innerText = "💾 Save Edits to Product";
      addBtn.style.background = "#2563eb";
      addBtn.style.color = "#ffffff";
    }

    showStatus(`Editing "${item.name}". Update the fields and click "Save Edits".`, "success");
  }

  function resetProductForm() {
    editingIndex = null;

    if (getEl("prod-name")) getEl("prod-name").value = "";
    if (getEl("prod-stock")) getEl("prod-stock").value = "instock";
    prodImageBase64 = "";

    if (getEl("prod-preview-img")) {
      getEl("prod-preview-img").src = "https://placehold.co/100x100?text=Product";
    }

    selectedCategories = [];
    renderCategoryTags();
    renderVariantRows();

    const addBtn = getEl("add-prod-btn");
    if (addBtn) {
      addBtn.innerText = "+ Add Product to List";
      addBtn.style.background = "#f1f5f9";
      addBtn.style.color = "#334155";
    }
  }

  // --- CATALOG LIST UI ---
  function renderProductList() {
    const productListContainer = getEl("product-list-container");
    const prodCountLabel = getEl("prod-count");

    if (prodCountLabel) prodCountLabel.innerText = products.length;
    if (!productListContainer) return;
    productListContainer.innerHTML = "";

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
        <div style="display: flex; gap: 6px;">
          <button class="edit-btn" data-index="${index}" title="Edit Item" style="background: #e0f2fe; color: #0369a1; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 12px; font-weight: 600;">✏️ Edit</button>
          <button class="del-btn" data-index="${index}" title="Remove Item" style="background: none; border: none; font-size: 16px; cursor: pointer; color: #ef4444;">🗑️</button>
        </div>
      `;
      productListContainer.appendChild(row);
    });

    // Wire up Edit buttons
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.getAttribute("data-index"));
        startEditingProduct(idx);
      });
    });

    // Wire up Delete buttons
    document.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.getAttribute("data-index"));
        const removedName = products[idx]?.name || "Item";
        products.splice(idx, 1);
        if (editingIndex === idx) resetProductForm();
        renderProductList();
        showStatus(`Removed "${removedName}" from catalog.`);
      });
    });
  }

  // --- PUBLISH TO CLOUD ---
  function syncToCloud() {
    const storeIdInput = getEl("store-id-input");
    const storeId = (storeIdInput?.value || DEFAULT_STORE_ID).trim().toLowerCase();

    showStatus(`🚀 Publishing changes for "${storeId}"...`, "success");

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
        phone: { stringValue: getEl("store-phone-input")?.value.trim() || "" },
        slogan: { stringValue: getEl("store-slogan-input")?.value.trim() || "" },
        themeColor: { stringValue: getEl("store-theme-color")?.value || "#10b981" },
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
        if (!res.ok) throw new Error(`Publish failed (HTTP ${res.status})`);
        return res.json();
      })
      .then(() => {
        updateStoreLinkBanner(storeId);
        showStatus(`🎉 Successfully published store "${storeId}" to the cloud!`);
      })
      .catch((err) => {
        showStatus(`Failed to publish: ${err.message}`, "error");
      });
  }

  // --- INITIALIZATION ---
  window.addEventListener("DOMContentLoaded", () => {
    const storeIdInput = getEl("store-id-input");
    if (storeIdInput && !storeIdInput.value) {
      storeIdInput.value = DEFAULT_STORE_ID;
    }

    // File input preview listeners
    const logoFileInput = getEl("store-logo-file");
    if (logoFileInput) {
      logoFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            logoBase64 = evt.target.result;
            const preview = getEl("logo-preview-img");
            if (preview) preview.src = logoBase64;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const prodImgInput = getEl("prod-img-file");
    if (prodImgInput) {
      prodImgInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            prodImageBase64 = evt.target.result;
            const preview = getEl("prod-preview-img");
            if (preview) preview.src = prodImageBase64;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const fetchBtn = getEl("fetch-cloud-btn");
    if (fetchBtn) fetchBtn.addEventListener("click", fetchFromCloud);

    const syncBtn = getEl("sync-cloud-btn");
    if (syncBtn) syncBtn.addEventListener("click", syncToCloud);

    const addVariantBtn = getEl("add-variant-btn");
    if (addVariantBtn) {
      addVariantBtn.addEventListener("click", () => {
        const container = getEl("variants-container");
        if (!container) return;
        const row = document.createElement("div");
        row.className = "variant-row";
        row.style.cssText = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";
        row.innerHTML = `
          <input type="text" class="variant-size" placeholder="Size (e.g. 50ml)" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <input type="number" class="variant-price" placeholder="Price (KSh)" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <button type="button" class="remove-variant-btn" style="background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">✕</button>
        `;
        container.appendChild(row);
        row.querySelector(".remove-variant-btn").addEventListener("click", () => row.remove());
      });
    }

    const addCatBtn = getEl("add-category-tag-btn");
    if (addCatBtn) {
      addCatBtn.addEventListener("click", () => {
        const newCatInput = getEl("prod-new-category-input");
        const catVal = newCatInput?.value.trim();
        if (catVal) {
          if (!availableCategories.includes(catVal)) availableCategories.push(catVal);
          if (!selectedCategories.includes(catVal)) selectedCategories.push(catVal);
          newCatInput.value = "";
          renderCategoryTags();
        }
      });
    }

    const addProdBtn = getEl("add-prod-btn");
    if (addProdBtn) {
      addProdBtn.addEventListener("click", () => {
        const name = getEl("prod-name")?.value.trim();
        const stock = getEl("prod-stock")?.value;
        const variants = getVariantsFromForm();

        if (!name) return showStatus("Please enter a product name.", "error");
        if (variants.length === 0) return showStatus("Please enter at least one size variant with a price.", "error");

        const productData = {
          name,
          categories: selectedCategories.length ? [...selectedCategories] : ["General"],
          variants,
          stock,
          img: prodImageBase64 || "https://placehold.co/100x100?text=Product"
        };

        if (editingIndex !== null) {
          // Updating existing product
          products[editingIndex] = productData;
          showStatus(`Updated "${name}".`);
        } else {
          // Adding new product
          products.push(productData);
          showStatus(`Added "${name}" to list.`);
        }

        resetProductForm();
        renderProductList();
      });
    }

    renderVariantRows();
    renderCategoryTags();
    renderProductList();

    // Auto-fetch on load
    fetchFromCloud();
  });
})();
