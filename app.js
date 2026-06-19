import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// FİREBASE KONFİQURASİYASI
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

// Elementləri götürürük
const saveBtn = document.getElementById('saveBtn');
const deleteBtn = document.getElementById('deleteBtn');
const ledList = document.getElementById('ledList');
const searchInput = document.getElementById('searchInput');
const ledFileInput = document.getElementById('ledFileInput');
const fileSelectedName = document.getElementById('fileSelectedName');
const modalTitle = document.getElementById('modalTitle');
const modal = document.getElementById('addModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// Preview Modalı elementləri
const imagePreviewModal = document.getElementById('imagePreviewModal');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const previewTitle = document.getElementById('previewTitle');
const previewImage = document.getElementById('previewImage');
const previewBox = document.getElementById('previewBox');
const previewPrice = document.getElementById('previewPrice');
const goToEditBtn = document.getElementById('goToEditBtn');

let base64Image = "";
let currentSelectedData = null;

// 🎨 KVADRATIN DAXİLİNDƏ RƏNGLİ MESAJ GÖSTƏRMƏK (YAŞIL VƏ QIRMIZI)
function showInModalAlert(message, isError = false) {
    const alertBox = document.getElementById("modalAlert");
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.style.display = "block";
        
        if (isError) {
            // Səhv və ya Silinmə olanda: Qırmızı fon, tünd qırmızı yazı
            alertBox.style.backgroundColor = "#fce8e6";
            alertBox.style.color = "#c5221f";
            alertBox.style.border = "1px solid #fad2cf";
        } else {
            // Hər şey düz olanda: Yaşıl fon, tünd yaşıl yazı
            alertBox.style.backgroundColor = "#e7f5ec";
            alertBox.style.color = "#1f874c";
            alertBox.style.border = "1px solid #d3edd9";
        }
    }
}

// Fayl seçiləndə base64-ə çevir
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

    if(!name || !box) {
        showInModalAlert("Zəhmət olmasa LED adı və Qutu nömrəsini yazın!", true);
        return;
    }

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
            showInModalAlert("Məlumat uğurla yeniləndi!", false); // Yaşıl zolaq çıxır
        } else {
            await addDoc(collection(db, "ledler"), ledData);
            showInModalAlert("Uğurla əlavə edildi!", false); // Yaşıl zolaq çıxır
        }

        // Siyahı anında yenilənir
        ledleriGetir();

        // 2 saniyə mesaja baxsınlar deyə gözləyib modalı bağlayırıq
        setTimeout(() => {
            closeAndResetModal();
            imagePreviewModal.style.display = 'none';
        }, 2000);

    } catch (error) {
        console.error("Xəta: ", error);
        showInModalAlert("Xəta baş verdi.", true); // Qırmızı zolaq çıxır
    } finally {
        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.innerText = currentSelectedData && currentSelectedData.id ? "Yenilə" : "Bazaya Yaz";
        }, 2000);
    }
});

// SİLMƏK FUNKSİYASI (HEÇ BİR BLOKLAYICI ALERT YOXDUR, KVADRATDA QIRMIZI GÖSTƏRİR)
deleteBtn.addEventListener('click', async () => {
    if (!currentSelectedData || !currentSelectedData.id) return;
    
    try {
        deleteBtn.innerText = "Silinir...";
        deleteBtn.disabled = true;

        const docRef = doc(db, "ledler", currentSelectedData.id);
        await deleteDoc(docRef);
        
        showInModalAlert("Məlumat anbardan silindi!", true); // Qırmızı zolaq çıxır
        
        ledleriGetir();
        
        setTimeout(() => {
            closeAndResetModal();
            imagePreviewModal.style.display = 'none';
        }, 2000);
        
    } catch (error) {
        console.error(error);
        showInModalAlert("Silərkən xəta oldu.", true);
    } finally {
        setTimeout(() => {
            deleteBtn.disabled = false;
            deleteBtn.innerText = "Məlumatı Sil";
        }, 2000);
    }
});

// BAZADAN LED-LƏRİ OXUMAQ VƏ AXTARIŞ
async function ledleriGetir(searchQuery = "") {
    ledList.innerHTML = `
        <div class="loading-container" id="mainSpinner">
            <div class="spinner"></div>
            <p style="color: #666; font-size: 15px; font-weight: 500; margin-top: 10px;">Yüklənir...</p>
        </div>
    `;

    try {
        const q = query(collection(db, "ledler"), orderBy("tarix", "desc"));
        const querySnapshot = await getDocs(q);
        
        ledList.innerHTML = "";
        let hansiSaLedTapildi = false;

        querySnapshot.forEach((doc) => {
            const id = doc.id;
            const data = doc.data();
            
            if(searchQuery && !data.ledAdi.includes(searchQuery.toUpperCase())) return;

            hansiSaLedTapildi = true;

            let displayPrice = data.qiymet;
            if (!displayPrice || displayPrice === "undefined") {
                displayPrice = "Təyin edilməyib";
            } else if(!isNaN(displayPrice)) {
                displayPrice = displayPrice + " AZN";
            }

            const currentImg = (data.sekilUrl && data.sekilUrl !== "undefined") ? data.sekilUrl : "https://via.placeholder.com/150?text=Sekil+Yoxdur";

            const card = document.createElement('div');
            card.className = 'led-card';
            card.innerHTML = `
                <h4>${data.ledAdi}</h4>
                <p>Qutu: <span class="box-badge">${data.qutuNomresi}</span></p>
                <p>Qiymət: <span class="price-badge">${displayPrice}</span></p>
                <img src="${currentImg}" alt="led-sekli">
            `;

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

        if (!hansiSaLedTapildi) {
            ledList.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">Axtarışa uyğun LED tapılmadı.</p>`;
        }

    } catch (error) {
        ledList.innerHTML = "<p style='text-align:center; color:red; padding:20px;'>Məlumat gətirilərkən xəta oldu.</p>";
        console.error(error);
    }
}

// ŞƏKLƏ KLİK EDƏNDƏ TAM EKRAN REJİMİ
previewImage.addEventListener('click', () => {
    if (!currentSelectedData || !currentSelectedData.sekilUrl) return;

    const fullScreenContainer = document.createElement('div');
    fullScreenContainer.className = 'full-screen-mode';

    const fsImage = document.createElement('img');
    fsImage.src = currentSelectedData.sekilUrl;
    fsImage.alt = 'Tam Ekran LED Şəkli';

    fullScreenContainer.appendChild(fsImage);
    document.body.appendChild(fullScreenContainer);

    fullScreenContainer.addEventListener('click', () => {
        fullScreenContainer.remove();
    });
});

// REDAKTƏ REJİMİ
goToEditBtn.addEventListener('click', () => {
    if (!currentSelectedData) return;
    
    modalTitle.innerText = "LED Məlumatını Redaktə Et";
    document.getElementById('ledName').value = currentSelectedData.ledAdi;
    document.getElementById('boxNumber').value = currentSelectedData.qutuNomresi;
    
    const rawPrice = currentSelectedData.qiymet;
    document.getElementById('ledPrice').value = (rawPrice === "Təyin edilməyib" || rawPrice === "undefined") ? "" : rawPrice;
    document.getElementById('ledImageUrl').value = currentSelectedData.sekilUrl.startsWith("data:image") ? "" : currentSelectedData.sekilUrl;
    
    saveBtn.innerText = "Yenilə";
    deleteBtn.style.display = "block";
    
    const alertBox = document.getElementById("modalAlert");
    if (alertBox) {
        alertBox.style.display = "none";
        alertBox.textContent = "";
    }

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
    
    const alertBox = document.getElementById("modalAlert");
    if (alertBox) {
        alertBox.style.display = "none";
        alertBox.textContent = "";
    }
    
    modal.style.display = 'none';
}

// MENYUNU AÇMA / BAĞLAMA HADİSƏLƏRİ
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
