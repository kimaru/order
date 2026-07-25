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
  const prodImgFileInput = document.getElementById("prod-img-file");
  const prodPreviewImg = document.getElementById("prod-preview-img");
  const addProdBtn = document.getElementById("add-prod-btn");
  const productListContainer = document.getElementById("product-list-container");
  const prodCount = document.getElementById("prod-count");

  let localItems = [];
  let currentLogoBase64 = "";
  let currentProdImgBase64 = "";

  // Update Color Hex Label
  if (storeThemeColorInput) {
    storeThemeColorInput.addEventListener("input", (e) => {
      if (colorHexLabel) colorHexLabel.innerText = e.target.value;
    });
  }

  // Universal Client-Side Image Compressor
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

  // Handle Logo Upload
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

  // Handle Product Image Upload
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
    setTimeout(() => { statusMsg.style.display = "none"; }, 4000);
  }

  // Fetch Store Settings & Catalog from Firestore
  function fetchFromCloud() {
    const storeId = storeIdInput.value.trim().toLowerCase();
    if (!storeId) {
      showStatus("Please enter a Store ID first.", true);
      return;
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    fetch(firestoreUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Store not found or network error");
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
            img: fields.img?.stringValue || "",
          };
        });

        renderProducts();
        showStatus(`Loaded store settings and ${localItems.length} products.`);
      })
      .catch((err) => {
        console.error(err);
        showStatus("Store ID not found in cloud. Ready to create new store.", false);
      });
  }

  // Render Product Catalog to DOM
  function renderProducts() {
    if (!productListContainer) return;
    productListContainer.innerHTML = "";
    if (prodCount) prodCount.innerText = localItems.length;

    if (localItems.length === 0) {
      productListContainer.innerHTML = `<p style="color: #94a3b8; font-size: 13px; text-align: center; padding: 12px 0;">No products in list yet.</p>`;
      return;
    }

    localItems.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "product-row";
      row.innerHTML = `
        <img src="${item.img || 'https://placehold.co/100x100?text=No+Img'}" onerror="this.src='https://placehold.co/100x100?text=No+Img';">
        <div>
          <strong style="font-size: 14px; color: #0f172a;">${item.name}</strong>
        </div>
        <div style="font-weight: 600; font-size: 14px; color: #0f172a;">KSh ${item.price.toLocaleString()}</div>
        <button class="del-btn" data-index="${index}">🗑️</button>
      `;
      productListContainer.appendChild(row);
    });

    // Delete item handlers
    document.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.getAttribute("data-index");
        localItems.splice(idx, 1);
        renderProducts();
      });
    });
  }

  // Add Product Action
  if (addProdBtn) {
    addProdBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const name = prodNameInput.value.trim();
      const price = Number(prodPriceInput.value);

      if (!name || isNaN(price) || price <= 0) {
        showStatus("Please enter a valid product name and price.", true);
        return;
      }

      const finalImg = currentProdImgBase64 || "https://placehold.co/200x200?text=No+Photo";

      localItems.push({
        name: name,
        price: price,
        img: finalImg
      });

      renderProducts();

      // Reset Form
      prodNameInput.value = "";
      prodPriceInput.value = "";
      if (prodImgFileInput) prodImgFileInput.value = "";
      currentProdImgBase64 = "";
      if (prodPreviewImg) prodPreviewImg.src = "https://placehold.co/100x100?text=Product";

      showStatus(`Added "${name}" to list.`);
    });
  }

  // Save Settings & Sync Catalog to Firestore
  function saveToCloud() {
    const storeId = storeIdInput.value.trim().toLowerCase();
    const phone = storePhoneInput.value.trim();
    const slogan = storeSloganInput.value.trim();
    const themeColor = storeThemeColorInput.value;

    if (!storeId) {
      showStatus("Please enter a Store ID.", true);
      return;
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    const formattedItems = localItems.map((item) => ({
      mapValue: {
        fields: {
          name: { stringValue: item.name },
          price: { doubleValue: item.price },
          img: { stringValue: item.img || "" },
        },
      },
    }));

    const payload = {
      fields: {
        phone: { stringValue: phone },
        slogan: { stringValue: slogan },
        logo: { stringValue: currentLogoBase64 },
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
        if (!res.ok) throw new Error("Failed to sync to Firestore");
        return res.json();
      })
      .then(() => {
        showStatus("🚀 Store settings, branding, and catalog published successfully!");
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
