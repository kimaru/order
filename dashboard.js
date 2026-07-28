// ==========================================
// STORE DASHBOARD LOGIC (GitHub Pages Compatible)
// Project: whatsapp-eco-engine-80882
// ==========================================

const PROJECT_ID = "whatsapp-eco-engine-80882";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Helper: Get element by ID safely
function getEl(id) {
  return document.getElementById(id);
}

// ------------------------------------------
// 1. UPDATE STORE LINK BANNER
// ------------------------------------------
function updateStoreLinkBanner(storeId) {
  const storeLinkBanner = getEl("store-link-banner");
  const storeUrlText = getEl("store-url-text");
  const visitStoreBtn = getEl("visit-store-btn");

  if (!storeId) {
    if (storeLinkBanner) storeLinkBanner.style.display = "none";
    return;
  }

  // Relative path ensures navigation stays within /order/ on GitHub Pages
  const storeRelativePath = `index.html?store=${encodeURIComponent(storeId)}`;

  // Construct absolute URL display for copying
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
// 4. FIRESTORE SYNC & FETCH
// ------------------------------------------
async function syncToCloud(storeId, storeData) {
  try {
    const fields = {};
    for (const [key, val] of Object.entries(storeData)) {
      fields[key] = convertToFirestoreValue(val);
    }

    const response = await fetch(`${FIRESTORE_BASE_URL}/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(`Cloud Sync Failed: ${errData.error?.message || response.statusText}`);
    }
    console.log(`Successfully synced store: ${storeId}`);
  } catch (error) {
    console.error("syncToCloud Error:", error);
    alert(`Sync Warning: ${error.message}`);
  }
}

async function fetchFromCloud(storeId) {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/stores/${storeId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Cloud Fetch Failed: ${response.statusText}`);
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
// 5. INITIALIZATION
// ------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const currentStoreId = urlParams.get("store") || "perfumescentre";

  // Update URL Banner on initialization
  updateStoreLinkBanner(currentStoreId);

  // Fetch current store config from Firestore
  const cloudData = await fetchFromCloud(currentStoreId);
  if (cloudData) {
    console.log("Store loaded from cloud:", cloudData);
  }
});
