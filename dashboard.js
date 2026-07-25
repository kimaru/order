(function () {
  const PROJECT_ID = "whatsapp-eco-engine-80882";
  const IMGBB_API_KEY = "6d0b64d39c0618037f48c0840b3cb1c9"; // Replace with your ImgBB key if different

  let inventory = [];

  // DOM Elements
  const storeIdInput = document.getElementById("store-id");
  const phoneInput = document.getElementById("phone");
  const inventoryContainer = document.getElementById("inventory-container");
  const addItemBtn = document.getElementById("add-item-btn");
  const generateBtn = document.getElementById("generate-btn");
  const fetchCloudBtn = document.getElementById("fetch-cloud-btn");
  const linkBox = document.getElementById("link-box");
  const storeUrlAnchor = document.getElementById("store-url");

  // 1. Initial Load from Local Draft (if returning on same device)
  const savedStoreId = localStorage.getItem("draft_store_id") || "";
  const savedPhone = localStorage.getItem("draft_phone") || "";
  const savedInventory = localStorage.getItem("draft_inventory");

  if (savedStoreId) storeIdInput.value = savedStoreId;
  if (savedPhone) phoneInput.value = savedPhone;

  if (savedInventory) {
    try {
      inventory = JSON.parse(savedInventory);
    } catch (e) {
      inventory = [];
    }
  }

  // If we have a saved Store ID, fetch latest cloud data on startup
  if (savedStoreId) {
    fetchStoreFromCloud(savedStoreId, false);
  } else {
    renderInventory();
  }

  // 2. Cloud Sync Function (Handles both auto-sync and manual button click)
  function fetchStoreFromCloud(storeId, isManualClick = false) {
    if (!storeId) {
      if (isManualClick) alert("Please enter a Store ID first.");
      return;
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}`;

    if (isManualClick && fetchCloudBtn) {
      fetchCloudBtn.innerText = "⏳ Syncing...";
      fetchCloudBtn.disabled = true;
    }

    fetch(firestoreUrl)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404 && isManualClick) {
            alert(`No existing cloud store found with ID "${storeId}". Starting fresh!`);
          } else if (!res.ok && isManualClick) {
            alert(`Error fetching store: HTTP ${res.status}`);
          }
          return null;
        }
        return res.json();
      })
      .then((doc) => {
        if (!doc || !doc.fields) return;

        // Sync Phone Number
        if (doc.fields.phone && doc.fields.phone.stringValue) {
          phoneInput.value = doc.fields.phone.stringValue;
        }

        // Sync Inventory Array
        const rawItems = doc.fields.items?.arrayValue?.values || [];
        inventory = rawItems.map((item) => {
          const mapFields = item.mapValue?.fields || {};
          return {
            name: mapFields.name?.stringValue || "",
            price: Number(mapFields.price?.doubleValue || mapFields.price?.integerValue || 0),
            img: mapFields.img?.stringValue || "",
          };
        });

        // Persist local draft & re-render view
        saveLocalDraft();
        renderInventory();

        if (isManualClick) {
          alert(`✅ Cloud sync complete! Showing live inventory for "${storeId}".`);
        }
      })
      .catch((err) => {
        console.error("Cloud sync error:", err);
        if (isManualClick) alert("Failed to sync from cloud: " + err.message);
      })
      .finally(() => {
        if (isManualClick && fetchCloudBtn) {
          fetchCloudBtn.innerText = "🔄 Fetch from Cloud";
          fetchCloudBtn.disabled = false;
        }
      });
  }

  // Event Listener for Manual "Fetch from Cloud" Button
  if (fetchCloudBtn) {
    fetchCloudBtn.addEventListener("click", () => {
      const id = storeIdInput.value.trim().toLowerCase();
      fetchStoreFromCloud(id, true);
    });
  }

  // Debounced auto-fetch when typing new store handle
  let debounceTimer;
  storeIdInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const id = storeIdInput.value.trim().toLowerCase();
    if (!id) return;

    debounceTimer = setTimeout(() => {
      fetchStoreFromCloud(id, false);
    }, 800);
  });

  // 3. Render Product Cards in Dashboard
  function renderInventory() {
    inventoryContainer.innerHTML = "";

    if (inventory.length === 0) {
      inventoryContainer.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #94a3b8; font-size: 14px;">
          No items added yet. Click <strong>+ Add New Item</strong> to build your catalog.
        </div>`;
      return;
    }

    inventory.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "product-row-item";

      const imgSrc = item.img || "https://placehold.co/100x100?text=No+Image";

      card.innerHTML = `
        <div class="item-media-box">
          <img src="${imgSrc}" class="row-preview-img" id="img-preview-${index}" onerror="this.src='https://placehold.co/100x100?text=No+Image';">
          <div class="upload-btn-wrapper">
            <button class="btn">📸 Photo</button>
            <input type="file" accept="image/*" class="image-uploader" data-index="${index}">
          </div>
        </div>

        <div class="form-group-item" style="flex: 2;">
          <label>Product Name</label>
          <input type="text" class="item-name" data-index="${index}" value="${item.name}" placeholder="e.g. Vanilla Perfume 50ml">
        </div>

        <div class="form-group-item" style="flex: 1;">
          <label>Price</label>
          <input type="number" class="item-price" data-index="${index}" value="${item.price || ''}" placeholder="0.00">
        </div>

        <button class="btn btn-danger remove-btn" data-index="${index}">🗑️</button>
      `;

      inventoryContainer.appendChild(card);
    });

    attachEventListeners();
  }

  // 4. Input Change Listeners & Image Compression/Upload
  function attachEventListeners() {
    // Name input change
    document.querySelectorAll(".item-name").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = e.target.dataset.index;
        inventory[idx].name = e.target.value;
        saveLocalDraft();
      });
    });

    // Price input change
    document.querySelectorAll(".item-price").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = e.target.dataset.index;
        inventory[idx].price = Number(e.target.value);
        saveLocalDraft();
      });
    });

    // Remove item
    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.dataset.index;
        inventory.splice(idx, 1);
        saveLocalDraft();
        renderInventory();
      });
    });

    // Image Upload & Canvas Compression
    document.querySelectorAll(".image-uploader").forEach((fileInput) => {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        const idx = e.target.dataset.index;
        if (!file) return;

        const previewImg = document.getElementById(`img-preview-${idx}`);
        previewImg.style.opacity = "0.4";

        // Compress image using Canvas before uploading
        compressImage(file, 800, 0.7, (compressedBlob) => {
          uploadToImgBB(compressedBlob, (uploadedUrl) => {
            previewImg.style.opacity = "1";
            if (uploadedUrl) {
              inventory[idx].img = uploadedUrl;
              previewImg.src = uploadedUrl;
              saveLocalDraft();
            } else {
              alert("Image upload failed. Please try again.");
            }
          });
        });
      });
    });
  }

  // Canvas Image Compression Helper
  function compressImage(file, maxWidth, quality, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => callback(blob), "image/jpeg", quality);
      };
    };
  }

  // Upload compressed Blob to ImgBB
  function uploadToImgBB(imageBlob, callback) {
    const formData = new FormData();
    formData.append("image", imageBlob);

    fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          callback(data.data.url);
        } else {
          callback(null);
        }
      })
      .catch((err) => {
        console.error("ImgBB Upload error:", err);
        callback(null);
      });
  }

  // 5. Save Local Draft Helper
  function saveLocalDraft() {
    localStorage.setItem("draft_store_id", storeIdInput.value.trim().toLowerCase());
    localStorage.setItem("draft_phone", phoneInput.value.trim());
    localStorage.setItem("draft_inventory", JSON.stringify(inventory));
  }

  // 6. Add New Product Item
  addItemBtn.addEventListener("click", () => {
    inventory.push({ name: "", price: 0, img: "" });
    saveLocalDraft();
    renderInventory();
  });

  // 7. Publish to Firestore Cloud
  generateBtn.addEventListener("click", () => {
    const storeId = storeIdInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();

    if (!storeId) return alert("Please enter a Store ID!");
    if (!phone) return alert("Please enter a WhatsApp Phone Number!");

    generateBtn.innerText = "⏳ Publishing to Cloud...";
    generateBtn.disabled = true;

    // Convert JavaScript array into Firestore REST Document schema
    const firestoreItems = inventory.map((item) => ({
      mapValue: {
        fields: {
          name: { stringValue: item.name || "Product" },
          price: { doubleValue: Number(item.price) || 0 },
          img: { stringValue: item.img || "" },
        },
      },
    }));

    const payload = {
      fields: {
        phone: { stringValue: phone },
        items: {
          arrayValue: {
            values: firestoreItems,
          },
        },
      },
    };

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/stores/${storeId}?updateMask.fieldPaths=phone&updateMask.fieldPaths=items`;

    fetch(firestoreUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP Status ${res.status}`);
        }
        return res.json();
      })
      .then(() => {
        generateBtn.innerText = "🚀 Publish Changes to Live Cloud";
        generateBtn.disabled = false;

        // Build live storefront URL
        const currentOrigin = window.location.origin;
        const currentPath = window.location.pathname.replace("dashboard.html", "index.html");
        const liveUrl = `${currentOrigin}${currentPath}?id=${storeId}`;

        storeUrlAnchor.href = liveUrl;
        storeUrlAnchor.innerText = liveUrl;
        linkBox.style.display = "block";

        saveLocalDraft();
        alert("🎉 Published successfully! All devices will now see this updated catalog.");
      })
      .catch((err) => {
        generateBtn.innerText = "🚀 Publish Changes to Live Cloud";
        generateBtn.disabled = false;
        alert(`Failed to publish: ${err.message}`);
      });
  });
})();
