// ==========================================
// STORE DASHBOARD LOGIC (GitHub Pages Compatible)
// Repository: https://kimaru.github.io/order/
// Project ID: whatsapp-eco-engine-80882
// ==========================================

const PROJECT_ID = "whatsapp-eco-engine-80882";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Global State
let currentStoreId = "perfumescentre";
let storeConfig = {
  storeName: "",
  whatsappNumber: "",
  categories: [],
  sizeVariants: [],
  products: []
};

// Helper: DOM Element selector
function getEl(id) {
  return document.getElementById(id);
}

// ------------------------------------------
// 1. LINK BANNER MANAGEMENT
// ------------------------------------------
function updateStoreLinkBanner(storeId) {
  const storeLinkBanner = getEl("store-link-banner");
  const storeUrlText = getEl("store-url-text");
  const visitStoreBtn = getEl("visit-store-btn");

  if (!storeId) {
    if (storeLinkBanner) storeLinkBanner.style.display = "none";
    return;
  }

  // Pure relative link ensures GitHub Pages subfolder (/order/) is preserved
  const storeRelativePath = `index.html?store=${encodeURIComponent(storeId)}`;

  // Construct absolute URL for display/copying
  const currentBasePath = window.location.pathname.replace(/dashboard\.html$/i, "");
  const fullStoreUrl = `${window.location.origin}${currentBasePath}${storeRelativePath}`;

  if (storeUrlText) {
    storeUrlText.innerText = fullStoreUrl;
  }

  if (visitStoreBtn) {
    visitStoreBtn.href = storeRelativePath;
    visitStoreBtn.target = "_blank";
    visitStoreBtn.rel = "noopener noreferrer";
  }

  if (storeLinkBanner) {
    storeLinkBanner.style.display = "flex";
  }
}

// ------------------------------------------
// 2. IMAGE COMPRESSION (CANVAS)
// ------------------------------------------
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
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

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// ------------------------------------------
// 3. FIRESTORE DATA CONVERTERS
// ------------------------------------------
function convertToFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => convertToFirestoreValue(item)),
      },
    };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const [key, v] of Object.entries(val)) {
      fields[key] = convertToFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function parseFirestoreValue(valObj) {
  if (!valObj) return null;
  if ("stringValue" in valObj) return valObj.stringValue;
  if ("integerValue" in valObj) return parseInt(valObj.integerValue, 10);
  if ("doubleValue" in valObj) return parseFloat(valObj.doubleValue);
  if ("booleanValue" in valObj) return valObj.booleanValue;
  if ("nullValue" in valObj) return null;
  if ("arrayValue" in valObj) {
    const arr = valObj.arrayValue.values || [];
    return arr.map((item) => parseFirestoreValue(item));
  }
  if ("mapValue" in valObj) {
    const res = {};
    const fields = valObj.mapValue.fields || {};
    for (const [key, v] of Object.entries(fields)) {
      res[key] = parseFirestoreValue(v);
    }
    return res;
  }
  return null;
}

// ------------------------------------------
// 4. CLOUD SYNC & FETCH
// ------------------------------------------
async function syncToCloud() {
  const syncBtn = getEl("sync-btn");
  if (syncBtn) syncBtn.innerText = "Syncing...";

  try {
    const fields = {};
    for (const [key, val] of Object.entries(storeConfig)) {
      fields[key] = convertToFirestoreValue(val);
    }

    const response = await fetch(`${FIRESTORE_BASE_URL}/stores/${currentStoreId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || response.statusText);
    }
    
    alert("Store config successfully published to live site!");
  } catch (error) {
    console.error("syncToCloud Error:", error);
    alert(`Sync Error: ${error.message}`);
  } finally {
    if (syncBtn) syncBtn.innerText = "Publish Changes";
  }
}

async function fetchFromCloud(storeId) {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/stores/${storeId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Fetch failed: ${response.statusText}`);
    }
    const doc = await response.json();
    const data = {};
    if (doc.fields) {
      for (const [key, valObj] of Object.entries(doc.fields)) {
        data[key] = parseFirestoreValue(valObj);
      }
    }
    return data;
  } catch (error) {
    console.error("fetchFromCloud Error:", error);
    return null;
  }
}

// ------------------------------------------
// 5. DASHBOARD UI & RENDERERS
// ------------------------------------------
function renderCategories() {
  const catList = getEl("category-list");
  const catSelect = getEl("product-category-select");

  if (catList) {
    catList.innerHTML = (storeConfig.categories || [])
      .map((c, i) => `<li>${c} <button onclick="deleteCategory(${i})">✕</button></li>`)
      .join("");
  }

  if (catSelect) {
    catSelect.innerHTML = (storeConfig.categories || [])
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");
  }
}

function renderProducts() {
  const prodTable = getEl("products-table-body");
  if (!prodTable) return;

  prodTable.innerHTML = (storeConfig.products || [])
    .map(
      (p, i) => `
    <tr>
      <td><img src="${p.image || ''}" width="40" height="40" style="object-fit:cover;" /></td>
      <td><strong>${p.name}</strong></td>
      <td>${p.category || '-'}</td>
      <td>${p.price ? 'KSh ' + p.price : 'Variants'}</td>
      <td><button onclick="deleteProduct(${i})">Delete</button></td>
    </tr>
  `
    )
    .join("");
}

// Exposed Functions for Inline HTML Attributes (onclick)
window.addCategory = function () {
  const input = getEl("new-category-input");
  if (input && input.value.trim()) {
    storeConfig.categories = storeConfig.categories || [];
    storeConfig.categories.push(input.value.trim());
    input.value = "";
    renderCategories();
  }
};

window.deleteCategory = function (index) {
  storeConfig.categories.splice(index, 1);
  renderCategories();
};

window.deleteProduct = function (index) {
  if (confirm("Are you sure you want to delete this product?")) {
    storeConfig.products.splice(index, 1);
    renderProducts();
  }
};

window.saveStoreConfig = function () {
  const nameInput = getEl("store-name-input");
  const phoneInput = getEl("store-phone-input");

  if (nameInput) storeConfig.storeName = nameInput.value;
  if (phoneInput) storeConfig.whatsappNumber = phoneInput.value;

  syncToCloud();
};

// ------------------------------------------
// 6. INITIALIZATION ON LOAD
// ------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentStoreId = urlParams.get("store") || "perfumescentre";

  // 1. Update Navigation Link immediately
  updateStoreLinkBanner(currentStoreId);

  // 2. Load Firestore Data
  const cloudData = await fetchFromCloud(currentStoreId);
  if (cloudData) {
    storeConfig = { ...storeConfig, ...cloudData };
    
    // Populate form fields if present
    if (getEl("store-name-input")) getEl("store-name-input").value = storeConfig.storeName || "";
    if (getEl("store-phone-input")) getEl("store-phone-input").value = storeConfig.whatsappNumber || "";

    renderCategories();
    renderProducts();
  }
});
