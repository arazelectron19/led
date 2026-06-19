import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const modal = document.getElementById('addModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

const imagePreviewModal = document.getElementById('imagePreviewModal');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const previewTitle = document.getElementById('previewTitle');
const previewImage = document.getElementById('previewImage');
const previewBox = document.getElementById('previewBox');
const previewPrice = document.getElementById('previewPrice');
const goToEditBtn = document.getElementById('goToEditBtn');

const tabAnbar = document.getElementById('tabAnbar');
const tabZakaz = document.getElementById('tabZakaz');
const listTitle = document.getElementById('listTitle');
let currentTab = "anbar"; 

const loadingContainer = document.getElementById('loadingContainer');

const normalHeader = document.getElementById('normalHeader');
const selectionHeader = document.getElementById('selectionHeader');
const selectionCount = document.getElementById('selectionCount');
const btnCancelSelection = document.getElementById('btnCancelSelection');
const btnSelectAll = document.getElementById('btnSelectAll');
const btnDeleteSelected = document.getElementById('btnDeleteSelected');
const btnDeleteAllZakaz = document.getElementById('btnDeleteAllZakaz');

let isSelectionMode = false;
let selectedItemIds = []; 
let loadedZakazIds = [];  

const choiceModal = document.getElementById('choiceModal');
const closeChoiceBtn = document.getElementById('closeChoiceBtn');
const btnCreateNew = document.getElementById('btnCreateNew');
const btnSelectFromAnbar = document.getElementById('btnSelectFromAnbar');
const anbarSelectModal = document.getElementById('anbarSelectModal');
const closeAnbarSelectBtn = document.getElementById('closeAnbarSelectBtn');
const anbarSearchInput = document.getElementById('anbarSearchInput');
const anbarSelectContainer = document.getElementById('anbarSelectContainer');
const countModal = document.getElementById('countModal');
const closeCountBtn = document.getElementById('closeCountBtn');
const countModalModelName = document.getElementById('countModalModelName');
const zakazCountInput = document.getElementById('zakazCountInput');
const btnConfirmZakaz = document.getElementById('btnConfirmZakaz');

let base64Image = "";
let currentSelectedData = null;
let selectedAnbarItemForZakaz = null;
let allAnbarItems = [];

function showInModalAlert(message, isError = false) {
    const alertBox = document.getElementById("modalAlert");
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.style.display = "block";
        if (isError) {
            alertBox.style.backgroundColor = "#fce8e6"; alertBox.style.color = "#c5221f"; alertBox.style.border = "1px solid #fad2cf";
        } else {
            alertBox.style.backgroundColor = "#e7f5ec"; alertBox.style.color = "#1f874c"; alertBox.style.border = "1px solid #d3edd9";
        }
    }
}

if (tabAnbar) {
    tabAnbar.addEventListener('click', () => {
        exitSelectionMode();
        currentTab = "anbar";
        if (listTitle) listTitle.innerText = "Anbardakı LED-lər";
        
        // Klasları nizamlayırıq
        tabAnbar.classList.add('active');
        tabZakaz.classList.remove('active');
        
        tabAnbar.style.backgroundColor = "#007bff"; tabAnbar.style.color = "white";
        tabZakaz.style.backgroundColor = "#e0e0e0"; tabZakaz.style.color = "#333";
        ledleriGetir(searchInput ? searchInput.value : "");
    });
}

if (tabZakaz) {
    tabZakaz.addEventListener('click', () => {
        exitSelectionMode();
        currentTab = "zakaz";
        if (listTitle) listTitle.innerText = "Sifariş Olunacaq LED-lər (Zakaz)";
        
        // Klasları nizamlayırıq
        tabZakaz.classList.add('active');
        tabAnbar.classList.remove('active');
        
        tabZakaz.style.backgroundColor = "#28a745"; tabZakaz.style.color = "white";
        tabAnbar.style.backgroundColor = "#e0e0e0"; tabAnbar.style.color = "#333";
        ledleriGetir(searchInput ? searchInput.value : "");
    });
}

function exitSelectionMode() {
    isSelectionMode = false;
    selectedItemIds = [];
    if (selectionHeader) selectionHeader.style.display = 'none';
    if (normalHeader) normalHeader.style.display = 'flex';
    document.querySelectorAll('.led-card').forEach(el => el.classList.remove('selected-item'));
}

function enterSelectionMode(firstItemId, cardElement) {
    if (currentTab !== "zakaz") return; 
    isSelectionMode = true;
    if (normalHeader) normalHeader.style.display = 'none';
    if (selectionHeader) selectionHeader.style.display = 'flex';
    toggleItemSelection(firstItemId, cardElement);
}

function toggleItemSelection(itemId, cardElement) {
    const index = selectedItemIds.indexOf(itemId);
    if (index > -1) {
        selectedItemIds.splice(index, 1);
        cardElement.classList.remove('selected-item');
    } else {
        selectedItemIds.push(itemId);
        cardElement.classList.add('selected-item');
    }
    
    if (selectionCount) selectionCount.innerText = `${selectedItemIds.length} seçildi`;
    if (selectedItemIds.length === 0) exitSelectionMode();
}

if (btnCancelSelection) btnCancelSelection.addEventListener('click', exitSelectionMode);

if (btnSelectAll) {
    btnSelectAll.addEventListener('click', () => {
        selectedItemIds = [...loadedZakazIds];
        document.querySelectorAll('.led-card').forEach(el => el.classList.add('selected-item'));
        if (selectionCount) selectionCount.innerText = `${selectedItemIds.length} seçildi`;
    });
}

// 🗑️ SEÇİLMİŞLƏRİ SİLMƏK
if (btnDeleteSelected) {
    btnDeleteSelected.addEventListener('click', async () => {
        if (selectedItemIds.length === 0) return;

        try {
            btnDeleteSelected.innerText = "Silinir...";
            const batch = writeBatch(db);
            selectedItemIds.forEach((id) => {
                const docRef = doc(db, "ledler", id);
                batch.delete(docRef);
            });
            await batch.commit();
            exitSelectionMode();
            ledleriGetir(searchInput ? searchInput.value : "");
        } catch (err) {
            alert("Xəta baş verdi.");
        } finally {
            if (btnDeleteSelected) btnDeleteSelected.innerText = "Sil";
        }
    });
}

// 🫗 HAMISINI SİLMƏK
if (btnDeleteAllZakaz) {
    btnDeleteAllZakaz.addEventListener('click', async () => {
        if (loadedZakazIds.length === 0) return;

        try {
            btnDeleteAllZakaz.innerText = "Təmizlənir...";
            const batch = writeBatch(db);
            loadedZakazIds.forEach((id) => {
                const docRef = doc(db, "ledler", id);
                batch.delete(docRef);
            });
            await batch.commit();
            exitSelectionMode();
            ledleriGetir(searchInput ? searchInput.value : "");
        } catch (err) {
            alert("Xəta baş verdi.");
        } finally {
            if (btnDeleteAllZakaz) btnDeleteAllZakaz.innerText = "Tam Sil";
        }
    });
}

if (openModalBtn) openModalBtn.addEventListener('click', () => { choiceModal.style.display = 'flex'; });
if (closeChoiceBtn) closeChoiceBtn.addEventListener('click', () => choiceModal.style.display = 'none');

if (btnCreateNew) {
    btnCreateNew.addEventListener('click', () => {
        choiceModal.style.display = 'none';
        closeAndResetModal();
        modal.style.display = 'flex';
    });
}

if (btnSelectFromAnbar) {
    btnSelectFromAnbar.addEventListener('click', () => {
        choiceModal.style.display = 'none';
        anbarSearchInput.value = "";
        anbarSelectModal.style.display = 'flex';
        anbarSiyahisiniYukle();
    });
}

if (closeAnbarSelectBtn) closeAnbarSelectBtn.addEventListener('click', () => anbarSelectModal.style.display = 'none');
if (closeCountBtn) closeCountBtn.addEventListener('click', () => countModal.style.display = 'none');

async function anbarSiyahisiniYukle() {
    anbarSelectContainer.innerHTML = "<p style='text-align:center; color:#666;'>Yüklənir...</p>";
    try {
        const q = query(collection(db, "ledler"), orderBy("tarix", "desc"));
        const querySnapshot = await getDocs(q);
        allAnbarItems = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if ((data.status || "anbar") === "anbar") {
                allAnbarItems.push({ id: doc.id, ...data });
            }
        });
        anbarListesiniGoster(allAnbarItems);
    } catch (e) {
        anbarSelectContainer.innerHTML = "<p style='color:red;'>Xəta oldu.</p>";
    }
}

function anbarListesiniGoster(items) {
    anbarSelectContainer.innerHTML = "";
    if (items.length === 0) {
        anbarSelectContainer.innerHTML = "<p style='text-align:center; color:#888;'>Mal tapılmadı.</p>";
        return;
    }
    items.forEach((item) => {
        const row = document.createElement('div');
        row.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;";
        row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${item.sekilUrl}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                <div>
                    <strong style="color:#111;">${item.ledAdi}</strong>
                    <div style="font-size:12px; color:#666;">Qutu: ${item.qutuNomresi}</div>
                </div>
            </div>
            <span style="background-color: #28a745; color: white; padding: 4px 8px; font-size: 12px; font-weight: bold; border-radius: 4px;">Seç</span>
        `;
        row.addEventListener('click', () => {
            selectedAnbarItemForZakaz = item;
            anbarSelectModal.style.display = 'none';
            countModalModelName.innerText = `${item.ledAdi} (Qutu: ${item.qutuNomresi})`;
            zakazCountInput.value = "1";
            countModal.style.display = 'flex';
        });
        anbarSelectContainer.appendChild(row);
    });
}

if (anbarSearchInput) {
    anbarSearchInput.addEventListener('input', (e) => {
        const txt = e.target.value.toUpperCase();
        const filtered = allAnbarItems.filter(item => item.ledAdi.includes(txt));
        anbarListesiniGoster(filtered);
    });
}

if (btnConfirmZakaz) {
    btnConfirmZakaz.addEventListener('click', async () => {
        if (!selectedAnbarItemForZakaz) return;
        const count = zakazCountInput.value || 1;
        try {
            btnConfirmZakaz.innerText = "Əlavə edilir...";
            btnConfirmZakaz.disabled = true;
            const zakazData = {
                ledAdi: selectedAnbarItemForZakaz.ledAdi,
                qutuNomresi: selectedAnbarItemForZakaz.qutuNomresi,
                qiymet: selectedAnbarItemForZakaz.qiymet,
                sekilUrl: selectedAnbarItemForZakaz.sekilUrl,
                tarix: new Date().toISOString(),
                status: "zakaz",
                sifarisSayi: count
            };
            await addDoc(collection(db, "ledler"), zakazData);
            countModal.style.display = 'none';
            if (tabZakaz) tabZakaz.click();
        } catch (err) {
            alert("Xəta baş verdi.");
        } finally {
            btnConfirmZakaz.disabled = false;
            btnConfirmZakaz.innerText = "Sifariş Siyahısına Əlavə Et";
        }
    });
}

async function ledleriGetir(searchQuery = "") {
    if (!ledList) return;
    
    if (loadingContainer) loadingContainer.style.display = 'flex';
    ledList.innerHTML = ""; 

    if (currentTab === "zakaz") {
        ledList.classList.add("zakaz-active-view");
    } else {
        ledList.classList.remove("zakaz-active-view");
    }

    try {
        const q = query(collection(db, "ledler"), orderBy("tarix", "desc"));
        const querySnapshot = await getDocs(q);
        
        ledList.innerHTML = "";
        
        let hansiSaLedTapildi = false;
        loadedZakazIds = []; 

        querySnapshot.forEach((docSnap) => {
            const id = docSnap.id;
            const data = docSnap.data();
            const itemStatus = data.status || "anbar";
            
            if (itemStatus !== currentTab) return;
            if (searchQuery && !data.ledAdi.includes(searchQuery.toUpperCase())) return;

            hansiSaLedTapildi = true;

            if (itemStatus === "zakaz") {
                loadedZakazIds.push(id); 

                const card = document.createElement('div');
                card.className = 'led-card zakaz-style';
                card.dataset.id = id;
                card.innerHTML = `
                    <h4>${data.ledAdi}</h4>
                    <span class="zakaz-count-badge">${data.sifarisSayi || 1} ədəd</span>
                `;

                card.addEventListener('click', () => {
                    if (!isSelectionMode) {
                        enterSelectionMode(id, card);
                    } else {
                        toggleItemSelection(id, card);
                    }
                });

                ledList.appendChild(card);

            } else {
                let displayPrice = data.qiymet;
                if (!displayPrice || displayPrice === "undefined") displayPrice = "Təyin edilməyib";
                else if(!isNaN(displayPrice)) displayPrice = displayPrice + " AZN";

                const currentImg = data.sekilUrl || "https://via.placeholder.com/150?text=Sekil+Yoxdur";

                const card = document.createElement('div');
                card.className = 'led-card';
                card.innerHTML = `
                    <h4>${data.ledAdi}</h4>
                    <p>Qutu: <span class="box-badge">${data.qutuNomresi}</span></p>
                    <p>Qiymət: <span class="price-badge">${displayPrice}</span></p>
                    <img src="${currentImg}" alt="led-sekli">
                `;

                card.addEventListener('click', () => {
                    currentSelectedData = { id, ...data, status: itemStatus, sekilUrl: currentImg };
                    if (previewTitle) previewTitle.innerText = data.ledAdi;
                    if (previewImage) previewImage.src = currentImg;
                    if (previewBox) previewBox.innerText = data.qutuNomresi;
                    if (previewPrice) previewPrice.innerText = displayPrice;
                    if (imagePreviewModal) imagePreviewModal.style.display = 'flex';
                });

                ledList.appendChild(card);
            }
        });

        if (!hansiSaLedTapildi) {
            ledList.innerHTML = `<p style="text-align:center; color:#888; padding:20px; width: 100%;">Məlumat tapılmadı.</p>`;
        }
    } catch (error) {
        ledList.innerHTML = "<p style='text-align:center; color:red; padding:20px; width: 100%;'>Xəta baş verdi.</p>";
    } finally {
        if (loadingContainer) loadingContainer.style.display = 'none';
    }
}

if (goToEditBtn) {
    goToEditBtn.addEventListener('click', () => {
        if (!currentSelectedData) return;
        if (modalTitle) modalTitle.innerText = "Məlumatı Redaktə Et";
        document.getElementById('ledName').value = currentSelectedData.ledAdi;
        document.getElementById('boxNumber').value = currentSelectedData.qutuNomresi;
        document.getElementById('ledPrice').value = currentSelectedData.qiymet === "Təyin edilməyib" ? "" : currentSelectedData.qiymet;
        document.getElementById('ledImageUrl').value = currentSelectedData.sekilUrl ? (currentSelectedData.sekilUrl.startsWith("data:image") ? "" : currentSelectedData.sekilUrl) : "";
        if (saveBtn) saveBtn.innerText = "Yenilə";
        if (deleteBtn) deleteBtn.style.display = "block";
        if (imagePreviewModal) imagePreviewModal.style.display = 'none';
        if (modal) modal.style.display = 'flex';
    });
}

if (saveBtn) {
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
        if (base64Image) finalImageUrl = base64Image;
        else if (imageUrl) finalImageUrl = imageUrl;
        else if (currentSelectedData && currentSelectedData.sekilUrl) finalImageUrl = currentSelectedData.sekilUrl;

        try {
            saveBtn.innerText = "Gözləyin..."; saveBtn.disabled = true;
            const ledData = {
                ledAdi: name.toUpperCase(),
                qutuNomresi: box.toUpperCase(),
                qiymet: price || "Təyin edilməyib",
                sekilUrl: finalImageUrl,
                tarix: new Date().toISOString(),
                status: currentSelectedData && currentSelectedData.status ? currentSelectedData.status : currentTab
            };
            if (currentSelectedData && currentSelectedData.id) {
                const docRef = doc(db, "ledler", currentSelectedData.id);
                await updateDoc(docRef, ledData);
            } else {
                await addDoc(collection(db, "ledler"), ledData);
            }
            ledleriGetir(searchInput ? searchInput.value : "");
            setTimeout(() => { closeAndResetModal(); }, 1000);
        } catch (error) {
            showInModalAlert("Xəta baş verdi.", true);
        } finally {
            setTimeout(() => { saveBtn.disabled = false; }, 1000);
        }
    });
}

if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
        if (!currentSelectedData || !currentSelectedData.id) return;
        if (!confirm("Bu məlumatı silmək istədiyinizə əminsiniz?")) return;
        try {
            const docRef = doc(db, "ledler", currentSelectedData.id);
            await deleteDoc(docRef);
            ledleriGetir(searchInput ? searchInput.value : "");
            closeAndResetModal();
        } catch (error) {
            alert("Silinmədi.");
        }
    });
}

if (ledFileInput) {
    ledFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (fileSelectedName) fileSelectedName.innerText = `Seçildi: ${file.name}`;
            const reader = new FileReader();
            reader.onloadend = () => { base64Image = reader.result; };
            reader.readAsDataURL(file);
        }
    });
}

function closeAndResetModal() {
    document.getElementById('ledName').value = ""; document.getElementById('boxNumber').value = ""; document.getElementById('ledPrice').value = ""; document.getElementById('ledImageUrl').value = "";
    if (ledFileInput) ledFileInput.value = "";
    if (fileSelectedName) fileSelectedName.innerText = "";
    base64Image = ""; currentSelectedData = null;
    if (modal) modal.style.display = 'none';
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeAndResetModal);
if (closePreviewBtn) closePreviewBtn.addEventListener('click', () => { if (imagePreviewModal) imagePreviewModal.style.display = 'none'; });

window.addEventListener('click', (e) => { 
    if (e.target === modal) closeAndResetModal(); 
    if (e.target === imagePreviewModal) imagePreviewModal.style.display = 'none';
    if (e.target === choiceModal) choiceModal.style.display = 'none';
    if (e.target === anbarSelectModal) anbarSelectModal.style.display = 'none';
    if (e.target === countModal) countModal.style.display = 'none';
});

if (searchInput) searchInput.addEventListener('input', (e) => ledleriGetir(e.target.value));

// 🎯 Şəkli tam ekran etmə funksiyası
const fullImageModal = document.getElementById('fullImageModal');
const fullScreenImg = document.getElementById('fullScreenImg');
const fullImageClose = document.querySelector('.full-image-close');
const previewImageEl = document.getElementById('previewImage');

if (previewImageEl) {
    previewImageEl.style.cursor = "pointer";
    previewImageEl.addEventListener('click', () => {
        if (previewImageEl.src && !previewImageEl.src.includes('placeholder')) {
            fullScreenImg.src = previewImageEl.src;
            fullImageModal.style.display = 'flex';
        }
    });
}

if (fullImageClose) {
    fullImageClose.addEventListener('click', () => {
        fullImageModal.style.display = 'none';
    });
}

if (fullImageModal) {
    fullImageModal.addEventListener('click', (e) => {
        if (e.target === fullImageModal) {
            fullImageModal.style.display = 'none';
        }
    });
}

// 🚀 İLK AÇILIŞ TƏNZİMLƏMƏSİ 
// Sayt brauzerdə ilk açılan an işə düşür və Anbar tabını avtomatik aktivləşdirir
if (tabAnbar) {
    tabAnbar.classList.add('active');
    tabAnbar.style.backgroundColor = "#007bff"; 
    tabAnbar.style.color = "white";
}
ledleriGetir();
