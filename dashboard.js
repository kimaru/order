(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";
  const DEFAULT_STORE_ID = "perfumescentre";

  const COMMON_SIZES = ["Standard", "30ml", "50ml", "100ml", "125ml", "200ml", "Small (S)", "Medium (M)", "Large (L)", "XL", "2XL", "Custom..."];

  let products = [];
  let availableCategories = ["General", "Men", "Women", "Unisex"];
  let selectedCategories = [];
  let editingIndex = null;

  let logoBase64 = "";
  let prodImageBase64 = "";

  const getEl = (id) => document.getElementById(id);

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

  function fetchFromCloud() {
    const storeIdInput = getEl("store-id-input");
    const storeId = (storeIdInput?.value || DEFAULT_STORE_ID).trim().toLowerCase();

    showStatus(`⏳ Connecting to Cloud for "${storeId}"...`, "success");

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (res.status === 404) {
          throw new Error(`Store "${storeId}" not published yet. Add items and click "Publish All Changes".`);
        }
        if (!res.ok) throw new Error(`HTTP Error ${res.status} while fetching data.`);
        return res.json();
      })
      .then((doc) => {
        if (!doc || !doc.fields) throw new Error(`Document for "${storeId}" is empty.`);

        const fields = doc.fields;

        const phoneEl = getEl("store-phone-input");
        const sloganEl = getEl("store-slogan-input");
        if (phoneEl) phoneEl.value = fields.phone?.stringValue || "";
        if (sloganEl) sloganEl.value = fields.slogan?.stringValue || "";

        const themeColor = fields.themeColor?.stringValue || "#10b981";
        const themeEl = getEl("store-theme-color");
        const hexEl = getEl("color-hex-label");
        if (themeEl) themeEl.value = themeColor;
        if (hexEl) hexEl.innerText = themeColor;

        logoBase64 = fields.logo?.stringValue || "";
        const logoImg = getEl("logo-preview-img");
        if (logoImg) {
          logoImg.src = logoBase64 || "https://placehold.co/100x100?text=Logo";
        }

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

          const fallbackPrice = Number(f.price?.doubleValue || f.price?.integerValue || 0);
          if (variantsList.length === 0) {
            variantsList = [{ size: "Standard", price: fallbackPrice }];
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

  // --- HYBRID VARIANT ROW (Dropdown + Custom Text Input) ---
  function renderVariantRows(variants = []) {
    const container = getEl("variants-container");
    if (!container) return;
    container.innerHTML = "";

    if (variants.length === 0) {
      variants = [{ size: "Standard", price: "" }];
    }

    variants.forEach((v) => {
      createVariantRowElement(container, v.size, v.price);
    });
  }

  function createVariantRowElement(container, initialSize = "Standard", initialPrice = "") {
    const row = document.createElement("div");
    row.className = "variant-row";
    row.style.cssText = "display: flex; gap: 8px; margin-bottom: 8px; align-items: center;";

    const isPreset = COMMON_SIZES.includes(initialSize);
    const selectedPreset = isPreset ? initialSize : "Custom...";
    const customValue = isPreset ? "" : initialSize;

    let optionsHTML = COMMON_SIZES.map(s => `<option value="${s}" ${s === selectedPreset ? "selected" : ""}>${s}</option>`).join("");

    row.innerHTML = `
      <select class="variant-preset-select" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff;">
        ${optionsHTML}
      </select>
      <input type="text" class="variant-custom-size" placeholder="Type custom size/option..." value="${customValue}" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; display: ${selectedPreset === "Custom..." ? "block" : "none"};">
      <input type="number" class="variant-price" placeholder="Price (KSh)" value="${initialPrice || ""}" style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px;">
      <button type="button" class="remove-variant-btn" style="background: #fee2e2; color: #991b1b; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">✕</button>
    `;

    container.appendChild(row);

    const select = row.querySelector(".variant-preset-select");
    const customInput = row.querySelector(".variant-custom-size");

    select.addEventListener("change", (e) => {
      if (e.target.value === "Custom...") {
        customInput.style.display = "block";
        customInput.focus();
      } else {
        customInput.style.display = "none";
      }
    });

    row.querySelector(".remove-variant-btn").addEventListener("click", () => row.remove());
  }

  function getVariantsFromForm() {
    const rows = document.querySelectorAll(".variant-row");
    const variants = [];
    rows.forEach((row) => {
      const preset = row.querySelector(".variant-preset-select")?.value;
      const custom = row.querySelector(".variant-custom-size")?.value.trim();
      
      let finalSize = "Standard";
      if (preset === "Custom...") {
        finalSize = custom || "Custom";
      } else {
        finalSize = preset;
      }

      const price = Number(row.querySelector(".variant-price")?.value || 0);
      if (finalSize && price > 0) variants.push({ size: finalSize, price });
    });
    return variants;
  }

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

  function startEditingProduct(index) {
    const item = products[index];
    if (!item) return;

    editingIndex = index;

    if (getEl("prod-name")) getEl("prod-name").value = item.name;
    if (getEl("prod-stock")) getEl("prod-stock").value = item.stock;

    prodImageBase64 = item.img;
    if (getEl("prod-preview-img")) getEl("prod-preview-img").src = item.img;

    selectedCategories = [...item.categories];
    renderCategoryTags();
    renderVariantRows(item.variants);

    const addBtn = getEl("add-prod-btn");
    if (addBtn) {
      addBtn.innerText = "💾 Save Edits to Product";
      addBtn.style.background = "#2563eb";
      addBtn.style.color = "#ffffff";
    }

    showStatus(`Editing "${item.name}". Make changes above and click "Save Edits".`, "success");
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
      row.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px;";
      
      row.innerHTML = `
        <img src="${p.img}" alt="${p.name}" onerror="this.src='https://placehold.co/100x100?text=Product';" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; background: #f1f5f9;">
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; font-size: 14px; color: #0f172a;">${p.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Cats: ${p.categories.join(", ")}</div>
          <div style="font-size: 11px; color: #059669; font-weight: 600; margin-top: 2px;">${sizesSummary}</div>
        </div>
        <div>
          <span class="badge badge-${p.stock}" style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${p.stock}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="edit-btn" data-index="${index}" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px; font-weight: 600;">✏️ Edit</button>
          <button type="button" class="del-btn" data-index="${index}" style="background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 12px;">🗑️</button>
        </div>
      `;
      productListContainer.appendChild(row);
    });

    productListContainer.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.currentTarget.getAttribute("data-index"));
        startEditingProduct(idx);
      });
    });

    productListContainer.querySelectorAll(".del-btn").forEach((btn) => {
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

      const primaryPrice = Number(p.variants[0]?.price || 0);
      const primaryCategory = p.categories[0] || "General";

      return {
        mapValue: {
          fields: {
            name: { stringValue: p.name },
            category: { stringValue: primaryCategory },
            price: { doubleValue: primaryPrice },
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

  window.addEventListener("DOMContentLoaded", () => {
    const storeIdInput = getEl("store-id-input");
    if (storeIdInput && !storeIdInput.value) {
      storeIdInput.value = DEFAULT_STORE_ID;
    }

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
        if (container) createVariantRowElement(container, "Standard", "");
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
        if (variants.length === 0) return showStatus("Please select/enter at least one variant option with a price.", "error");

        const productData = {
          name,
          categories: selectedCategories.length ? [...selectedCategories] : ["General"],
          variants,
          stock,
          img: prodImageBase64 || "https://placehold.co/100x100?text=Product"
        };

        if (editingIndex !== null) {
          products[editingIndex] = productData;
          showStatus(`Updated "${name}".`);
        } else {
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

    fetchFromCloud();
  });
})();
