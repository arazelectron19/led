import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// BURANI ÖZ REAL FİREBASE KODLARINLA ƏVƏZLƏ!
const firebaseConfig = {
    apiKey: "AIzaSyCF74oiYNEvgWm1rJA7fFERN3kClB1ypSM",
  authDomain: "led-zakaz.firebaseapp.com",
  projectId: "led-zakaz",
  storageBucket: "led-zakaz.firebasestorage.app",
  messagingSenderId: "102340279964",
  appId: "1:102340279964:web:fda009aeddf5cccc5b3759",
  measurementId: "G-4JW29M5CCR"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const ledList = document.getElementById('ledList');
const searchInput = document.getElementById('searchInput');
const ledFileInput = document.getElementById('ledFileInput');
const fileSelectedName = document.getElementById('fileSelectedName');
const modalTitle = document.getElementById('modalTitle');

// Preview Modalı elementləri
const imagePreviewModal = document.getElementById('imagePreviewModal');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const previewTitle = document.getElementById('previewTitle');
const previewImage = document.getElementById('previewImage');
const previewBox = document.getElementById('previewBox');
const previewPrice = document.getElementById('previewPrice');
const goToEditBtn = document.getElementById('goToEditBtn');

let base64Image = "";
let currentSelectedData = null; // Hazırda baxılan LED-in bütün məlumatları

ledFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileSelectedName.innerText = `Seçildi: ${file.name}`;
        const reader = new FileReader();
        reader.onloadend = () => {
            base64Image = reader.result;
        };
        reader.readAsDataURL(file);
    }
});

// BAZAYA LED ƏLAVƏ ETMƏK VƏ YA YENİLƏMƏK
saveBtn.addEventListener('click', async () => {
    const name = document.getElementById('ledName').value;
    const box = document.getElementById('boxNumber').value;
    const price = document.getElementById('ledPrice').value;
    const imageUrl = document.getElementById('ledImageUrl').value;

    if(!name || !box) return alert("Zəhmət olmasa LED adı və Qutu nömrəsini yazın!");

    let finalImageUrl = "https://via.placeholder.com/150?text=Sekil+Yoxdur";
    if (base64Image) {
        finalImageUrl = base64Image;
    } else if (imageUrl) {
        finalImageUrl = imageUrl;
    } else if (currentSelectedData && currentSelectedData.sekilUrl) {
        finalImageUrl = currentSelectedData.sekilUrl;
    }

    try {
        saveBtn.innerText = "Gözləyin...";
        saveBtn.disabled = true;

        const ledData = {
            ledAdi: name.toUpperCase(),
            qutuNomresi: box.toUpperCase(),
            qiymet: price || "Təyin edilməyib",
            sekilUrl: finalImageUrl,
            tarix: new Date().toISOString()
        };

        if (currentSelectedData && currentSelectedData.id) {
            const docRef = doc(db, "ledler", currentSelectedData.id);
            await updateDoc(docRef, ledData);
            alert("Məlumat uğurla yeniləndi!");
        } else {
            await addDoc(collection(db, "ledler"), ledData);
            alert("Uğurla əlavə edildi!");
        }

        closeAndResetModal();
        imagePreviewModal.style.display = 'none';
        ledleriGetir();
    } catch (error) {
        console.error("Xəta: ", error);
        alert("Xəta baş verdi.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Bazaya Yaz";
    }
});

// SİLMƏK FUNKSİYASI
deleteBtn.addEventListener('click', async () => {
    if (!currentSelectedData || !currentSelectedData.id) return;
    
    if (confirm("Bu LED məlumatını anbardan tamamilə silmək istədiyinizə əminsiniz?")) {
        try {
            const docRef = doc(db, "ledler", currentSelectedData.id);
            await deleteDoc(docRef);
            alert("Məlumat silindi!");
            closeAndResetModal();
            imagePreviewModal.style.display = 'none';
            ledleriGetir();
        } catch (error) {
            console.error(error);
            alert("Silərkən xəta oldu.");
        }
    }
});

// BAZADAN LED-LƏRİ OXUMAQ VƏ AXTARIŞ
async function ledleriGetir(searchQuery = "") {
   ledList.innerHTML = `
    <div class="loading-container">
        <div class="spinner"></div>
        <p style="color: #777; font-size: 14px;">Məlumatlar gətirilir...</p>
    </div> `;

    try {
        const q = query(collection(db, "ledler"), orderBy("tarix", "desc"));
        const querySnapshot = await getDocs(q);
        ledList.innerHTML = "";

        querySnapshot.forEach((doc) => {
            const id = doc.id;
            const data = doc.data();
            
            if(searchQuery && !data.ledAdi.includes(searchQuery.toUpperCase())) return;

            let displayPrice = data.qiymet;
            // Ekranda "undefined" yazılmasının qarşısını alırıq
            if (!displayPrice || displayPrice === "undefined") {
                displayPrice = "Təyin edilməyib";
            } else if(!isNaN(displayPrice)) {
                displayPrice = displayPrice + " AZN";
            }

            // Əgər köhnə xarab şəkil linki varsa placeholder qoyur
            const currentImg = (data.sekilUrl && data.sekilUrl !== "undefined") ? data.sekilUrl : "https://via.placeholder.com/150?text=Sekil+Yoxdur";

            const card = document.createElement('div');
            card.className = 'led-card';
            card.innerHTML = `
                <h4>${data.ledAdi}</h4>
                <p>Qutu: <span class="box-badge">${data.qutuNomresi}</span></p>
                <p>Qiymət: <span class="price-badge">${displayPrice}</span></p>
                <img src="${currentImg}" alt="led-sekli">
            `;

            // MƏRHƏLƏ 1: KARTA VURANDA ŞƏKİL BÖYÜTMƏ MODALI AÇILIR
            card.addEventListener('click', () => {
                currentSelectedData = { id, ...data, sekilUrl: currentImg };
                
                previewTitle.innerText = data.ledAdi;
                previewImage.src = currentImg;
                previewBox.innerText = data.qutuNomresi;
                previewPrice.innerText = displayPrice;
                
                imagePreviewModal.style.display = 'flex';
            });

            ledList.appendChild(card);
        });
    } catch (error) {
        ledList.innerHTML = "<p>Məlumat gətirilərkən xəta oldu.</p>";
        console.error(error);
    }
}

// MƏRHƏLƏ 2: ŞƏKİL ALTINDAKI REDAKTƏ DÜYMƏSİNƏ BASANDA FORMUN AÇILMASI
goToEditBtn.addEventListener('click', () => {
    if (!currentSelectedData) return;
    
    modalTitle.innerText = "LED Məlumatını Redaktə Et";
    document.getElementById('ledName').value = currentSelectedData.ledAdi;
    document.getElementById('boxNumber').value = currentSelectedData.qutuNomresi;
    
    // Undefined korlamasını təmizləyirik
    const rawPrice = currentSelectedData.qiymet;
    document.getElementById('ledPrice').value = (rawPrice === "Təyin edilməyib" || rawPrice === "undefined") ? "" : rawPrice;
    
    // Şəkil URL mətndirsə göstər, base64-dürsə gizlət
    document.getElementById('ledImageUrl').value = currentSelectedData.sekilUrl.startsWith("data:image") ? "" : currentSelectedData.sekilUrl;
    
    saveBtn.innerText = "Yenilə";
    deleteBtn.style.display = "block";
    
    // Şəkil pəncərəsini bağla, forma pəncərəsini aç
    imagePreviewModal.style.display = 'none';
    modal.style.display = 'flex';
});

// MODALI SIFIRLAMAQ FUNKSİYASI
function closeAndResetModal() {
    document.getElementById('ledName').value = "";
    document.getElementById('boxNumber').value = "";
    document.getElementById('ledPrice').value = "";
    document.getElementById('ledImageUrl').value = "";
    ledFileInput.value = "";
    fileSelectedName.innerText = "";
    base64Image = "";
    currentSelectedData = null;
    modalTitle.innerText = "Yeni LED Əlavə Et";
    saveBtn.innerText = "Bazaya Yaz";
    deleteBtn.style.display = "none";
    modal.style.display = 'none';
}

// MODAL BAĞLAMA DÜYMƏLƏRİ
const modal = document.getElementById('addModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

openModalBtn.addEventListener('click', () => {
    closeAndResetModal();
    modal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', closeAndResetModal);
closePreviewBtn.addEventListener('click', () => imagePreviewModal.style.display = 'none');

window.addEventListener('click', (e) => { 
    if (e.target === modal) closeAndResetModal(); 
    if (e.target === imagePreviewModal) imagePreviewModal.style.display = 'none';
});

searchInput.addEventListener('input', (e) => ledleriGetir(e.target.value));
ledleriGetir();