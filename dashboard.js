const IMGBB_API_KEY = "9c3b9b39a59927a3a799b8c8b49bad6c";

const firebaseConfig = {
  apiKey: "AIzaSyAhfgJlElspGrKXbBKLqnwrUfSYSihWbhI",
  authDomain: "whatsapp-eco-engine-80882.firebaseapp.com",
  projectId: "whatsapp-eco-engine-80882",
  storageBucket: "whatsapp-eco-engine-80882.firebasestorage.app",
  messagingSenderId: "394797472809",
  appId: "1:394797472809:web:b3257dcea988515498d038"
};

let inventory = [];

const savedPhone = localStorage.getItem('merchantPhone') || '';
const savedStoreId = localStorage.getItem('customStoreId') || '';
const savedInventory = localStorage.getItem('merchantInventory') ? JSON.parse(localStorage.getItem('merchantInventory')) : [];

if (savedPhone) document.getElementById('phone').value = savedPhone;
if (savedStoreId) document.getElementById('store-id').value = savedStoreId;

if (savedInventory && savedInventory.length > 0) {
  inventory = savedInventory;
  inventory.forEach(item => addRowToTable(item));
} else {
  addRowToTable(); 
}

document.getElementById('add-item-btn').addEventListener('click', () => addRowToTable());

function addRowToTable(item = { img: '', name: '', price: '' }) {
  const container = document.getElementById('inventory-container');
  const div = document.createElement('div');
  div.className = 'product-row-item';
  
  div.innerHTML = `
    <div class="item-media-box">
      <img class="row-preview-img" src="">
      <input type="hidden" class="p-img-url" value="${item.img || ''}">
      <div class="upload-btn-wrapper">
        <button class="btn" style="background:#eee; color:#333; font-size:12px; padding:8px 12px;">📁 Photo</button>
        <input type="file" class="p-file-input" accept="image/*">
        <span class="upload-status" style="display:block; margin-top:2px;">${item.img ? '✅ Ready' : 'No Photo'}</span>
      </div>
    </div>
    <div class="form-group-item" style="flex:2;"><input type="text" class="p-name" placeholder="Product Name & Size" value="${item.name || ''}" style="margin-bottom:8px;"></div>
    <div class="form-group-item"><input type="number" class="p-price" placeholder="Price" value="${item.price || ''}"></div>
    <div><button class="btn btn-danger delete-row-btn">Delete</button></div>
  `;
  
  const fileInput = div.querySelector('.p-file-input');
  const previewImg = div.querySelector('.row-preview-img');
  const hiddenUrlInput = div.querySelector('.p-img-url');
  const statusText = div.querySelector('.upload-status');
  
  const defaultPlaceholder = 'https://placehold.co/60x60?text=No+Img';
  previewImg.src = item.img ? item.img : defaultPlaceholder;
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    statusText.innerText = "⚡ Crushing Size...";

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
      const imgElement = new Image();
      imgElement.src = event.target.result;
      imgElement.onload = function () {
        const canvas = document.createElement('canvas');
        let width = imgElement.width;
        let height = imgElement.height;
        
        const MAX_SIZE = 800;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgElement, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          statusText.innerText = "⏳ Uploading...";
          const formData = new FormData();
          formData.append("image", blob, "optimized.jpg");

          fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
          })
          .then(response => response.json())
          .then(result => {
            if (result.success) {
              hiddenUrlInput.value = result.data.url;
              previewImg.src = result.data.url;
              statusText.innerText = "✅ Done!";
            } else { statusText.innerText = "❌ Failed"; }
          }).catch(() => statusText.innerText = "❌ Error");
        }, "image/jpeg", 0.7);
      };
    };
  });
  
  div.querySelector('.delete-row-btn').addEventListener('click', () => div.remove());
  container.appendChild(div);
}

function saveData(callback) {
  const phone = document.getElementById('phone').value;
  const storeId = document.getElementById('store-id').value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const items = [];
  
  const rows = document.querySelectorAll('.product-row-item');
  rows.forEach(row => {
    const img = row.querySelector('.p-img-url').value;
    const name = row.querySelector('.p-name').value;
    const price = row.querySelector('.p-price').value;
    if (name && price) items.push({ img, name, price: Number(price) });
  });

  localStorage.setItem('merchantPhone', phone);
  localStorage.setItem('customStoreId', storeId);
  localStorage.setItem('merchantInventory', JSON.stringify(items));
  
  inventory = items;
  if (callback) callback(phone, storeId);
}

document.getElementById('save-btn').addEventListener('click', () => {
  saveData(() => alert("Saved to local device memory blueprint!"));
});

document.getElementById('generate-btn').addEventListener('click', () => {
  saveData((phone, storeId) => {
    if (!phone || !storeId || inventory.length === 0) {
      alert("Please check that phone, store ID, and items are completely filled.");
      return;
    }

    // ⚡ SWITCH TO CLEAN UNCONDITIONAL OVERWRITE ARCHITECTURE (Removes trailing update mask strings)
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/stores/${storeId}`;
    
    const payload = {
      fields: {
        phone: { stringValue: phone },
        items: {
          arrayValue: {
            values: inventory.map(item => ({
              mapValue: {
                fields: {
                  name: { stringValue: item.name },
                  price: { doubleValue: item.price },
                  img: { stringValue: item.img }
                }
              }
            }))
          }
        }
      }
    };

    // ⚡ Using PATCH without query params forces clean, structural initialization if the doc doesn't exist yet!
    fetch(firestoreUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      if (data.name) {
        const finalFormUrl = `https://kimaru.github.io/order/?id=${storeId}`;
        document.getElementById('store-url').href = finalFormUrl;
        document.getElementById('store-url').innerText = finalFormUrl;
        document.getElementById('link-box').style.display = 'block';
        alert("🚀 Inventory published directly from mobile to the cloud database successfully!");
      } else { 
        console.error("Firebase Response:", data);
        alert("Cloud submission refused. Ensure your rules tab allows database transactions."); 
      }
    }).catch(err => alert("Error: " + err.message));
  });
});
