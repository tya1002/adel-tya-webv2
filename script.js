// adel x tya web - Ultra Premium
let rekapHistory = JSON.parse(localStorage.getItem('adel_tya_history')) || [];
let calcLogs = JSON.parse(localStorage.getItem('adel_tya_calc_logs')) || [];

// --- WELCOME TRANSITION (Blur & Fade) ---
function enterApp() {
    const welcome = document.getElementById('welcome-screen');
    const content = document.getElementById('app-content');
    
    welcome.classList.add('exit'); // Trigger CSS blur & fade
    
    setTimeout(() => {
        welcome.classList.add('hidden');
        content.classList.remove('hidden');
        setTimeout(() => content.style.opacity = '1', 50);
    }, 800);
}

// --- NAVIGATION ---
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) target.style.display = 'block';
    
    const btn = document.getElementById('nav-' + id);
    if(btn) btn.classList.add('active');
    
    if(id === 'history') renderHistory();
}

// --- TABLE ---
function addRow(name = '', kilo = '', modal = '') {
    const tbody = document.getElementById('table-body');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="input-name" value="${name}" placeholder="..."></td>
        <td><input type="number" step="0.1" class="input-kilo" value="${kilo}" oninput="updateRowTotal(this)"></td>
        <td><input type="number" class="input-modal" value="${modal}" oninput="updateRowTotal(this)"></td>
        <td style="text-align: right; font-weight: 800; color: var(--accent); font-size: 0.8rem;" class="subtotal-cell">Rp 0</td>
        <td style="text-align: center;">
            <button onclick="this.closest('tr').remove()" style="background:none; border:none; color:var(--text-secondary); cursor:pointer;">
                <i data-lucide="trash" style="width:16px"></i>
            </button>
        </td>
    `;
    tbody.appendChild(row);
    if(kilo && modal) updateRowTotal(row.querySelector('.input-kilo'));
    lucide.createIcons();
}

function updateRowTotal(input) {
    const row = input.closest('tr');
    const k = parseFloat(row.querySelector('.input-kilo').value) || 0;
    const m = parseFloat(row.querySelector('.input-modal').value) || 0;
    row.querySelector('.subtotal-cell').innerText = k > 0 && m > 0 ? "Rp " + (k * m * 1000).toLocaleString('id-ID') : "Rp 0";
}

function clearTable() {
    document.getElementById('table-body').innerHTML = '';
    document.getElementById('result-display').classList.add('hidden');
    for(let i=0; i<3; i++) addRow();
}

// --- PROCESSING ---
function processData() {
    const rows = document.querySelectorAll('#table-body tr');
    let totalK = 0, totalP = 0;
    const items = [];
    rows.forEach(r => {
        const k = parseFloat(r.querySelector('.input-kilo').value) || 0;
        const m = parseFloat(r.querySelector('.input-modal').value) || 0;
        if(k > 0) {
            const sub = m > 0 ? k * m * 1000 : 0;
            totalP += sub; totalK += k;
            items.push({ n: r.querySelector('.input-name').value || "Item", k, m, sub });
        }
    });
    if(items.length === 0) return showToast("Isi data dulu ya.");
    
    document.getElementById('total-kilo').innerText = totalK.toFixed(1) + " Kg";
    document.getElementById('total-penjualan').innerText = "Rp " + totalP.toLocaleString('id-ID');
    document.getElementById('result-display').classList.remove('hidden');

    rekapHistory.unshift({ id: Date.now(), date: new Date().toLocaleString('id-ID'), items, totalK, totalP });
    rekapHistory = rekapHistory.slice(0, 50); // Keep only last 50
    localStorage.setItem('adel_tya_history', JSON.stringify(rekapHistory));
    showToast("Data Berhasil Disimpan! ✨");
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if(rekapHistory.length === 0) return list.innerHTML = '<p style="text-align:center; padding:40px; color:var(--text-secondary);">Belum ada arsip.</p>';
    list.innerHTML = rekapHistory.map(e => `
        <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; margin-bottom:12px; border-left:4px solid var(--accent);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div><div style="font-weight:700; font-size:0.85rem;">${e.date}</div><div style="font-size:0.7rem; color:var(--text-secondary);">${e.items.length} Item • ${e.totalK.toFixed(1)} Kg</div></div>
                <div style="text-align:right;"><div style="color:var(--accent); font-weight:800; font-size:1rem;">Rp ${e.totalP.toLocaleString('id-ID')}</div><button class="btn-modern" onclick="copyHistory(${e.id})" style="padding:4px 10px; font-size:0.6rem; margin-top:5px; border-radius:8px; background:rgba(255,255,255,0.05);">Salin</button></div>
            </div>
        </div>
    `).join('');
}

function clearHistory() {
    if(confirm("Hapus semua arsip rekap?")) {
        rekapHistory = [];
        localStorage.removeItem('adel_tya_history');
        renderHistory();
        showToast("Arsip dikosongkan.");
    }
}

function copyHistory(id) {
    const e = rekapHistory.find(h => h.id === id);
    let txt = `REKAP - ${e.date}\n` + e.items.map(i => `- ${i.n}: ${i.k}kg @${i.m}k = Rp ${i.sub.toLocaleString()}`).join('\n');
    txt += `\nTOTAL: ${e.totalK}Kg | Rp ${e.totalP.toLocaleString()}`;
    navigator.clipboard.writeText(txt);
    showToast("Detail disalin!");
}

function exportToText() {
    const k = document.getElementById('total-kilo').innerText, p = document.getElementById('total-penjualan').innerText;
    let txt = `REKAP ADEL X TYA\n----------------\n` + Array.from(document.querySelectorAll('#table-body tr')).map(r => {
        const kn = r.querySelector('.input-name').value, kv = r.querySelector('.input-kilo').value, mv = r.querySelector('.input-modal').value;
        return kv ? `${kn || 'Ikan'}: ${kv}kg @${mv}k` : null;
    }).filter(x => x).join('\n') + `\n\nTOTAL: ${k}\nHASIL: ${p}`;
    navigator.clipboard.writeText(txt);
    showToast("Rekap disalin!");
}

// --- CALCULATOR ---
function toggleCalculator() {
    const c = document.getElementById('floating-calc');
    c.classList.toggle('hidden');
    if(!c.classList.contains('hidden')) {
        renderCalcLogs();
        if(!c.style.top) { c.style.top = "100px"; c.style.right = "30px"; }
    }
}
function toggleCalcHistory() {
    const overlay = document.getElementById('calc-history-overlay');
    overlay.classList.toggle('open');
}
function calcInput(v) { 
    const s = document.getElementById('calc-screen'); 
    let displayValue = v;
    if (v === '*') displayValue = '×';
    if (v === '/') displayValue = '÷';
    s.value = s.value === "0" ? displayValue : s.value + displayValue; 
}
function calcClearAll() { document.getElementById('calc-screen').value = "0"; document.getElementById('calc-op-view').innerText = ""; }
function calcBackspace() { const s = document.getElementById('calc-screen'); s.value = s.value.slice(0, -1) || "0"; }
function calcEqual() {
    const s = document.getElementById('calc-screen');
    try {
        const expression = s.value.replace(/×/g, '*').replace(/÷/g, '/');
        const res = eval(expression);
        const log = `${s.value} = ${res}`;
        document.getElementById('calc-op-view').innerText = s.value + " =";
        s.value = res;
        calcLogs.unshift(log);
        localStorage.setItem('adel_tya_calc_logs', JSON.stringify(calcLogs.slice(0, 20)));
        renderCalcLogs();
    } catch { s.value = "Error"; setTimeout(() => s.value = "0", 1000); }
}
function renderCalcLogs() {
    document.getElementById('calc-logs-container').innerHTML = calcLogs.map(l => `<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.75rem; color:var(--text-secondary);">${l}</div>`).join('');
}

// --- DRAGGABLE ---
function dragElement(e) {
    let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
    const h = document.getElementById(e.id + "-header");
    if(h) h.onmousedown = dmd;

    function dmd(ev) {
        if(window.innerWidth <= 600) return;
        ev.preventDefault();
        p3 = ev.clientX; p4 = ev.clientY;
        document.onmouseup = ced; document.onmousemove = ed;
    }
    function ed(ev) {
        ev.preventDefault();
        p1 = p3 - ev.clientX; p2 = p4 - ev.clientY;
        p3 = ev.clientX; p4 = ev.clientY;
        e.style.top = (e.offsetTop - p2) + "px";
        e.style.left = (e.offsetLeft - p1) + "px";
        e.style.right = "auto"; e.style.bottom = "auto";
    }
    function ced() { document.onmouseup = null; document.onmousemove = null; }
}

// --- OCR STATE MACHINE & MODAL MANAGEMENT ---
let lastImageBase64 = "";

document.getElementById('camera-input').addEventListener('change', hU);
document.getElementById('file-input').addEventListener('change', hU);

async function hU(e) {
    const f = e.target.files[0]; if(!f) return;
    
    showToast("Mengompres gambar...");
    
    const reader = new FileReader();
    reader.onload = async (re) => {
        const img = new Image();
        img.onload = async () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Tingkatkan resolusi maksimal ke 1800px agar detail tetap tajam
            const maxDim = 1800;
            let w = img.width;
            let h = img.height;
            if (w > h && w > maxDim) { h *= maxDim / w; w = maxDim; }
            else if (h > maxDim) { w *= maxDim / h; h = maxDim; }
            
            canvas.width = w; canvas.height = h;
            
            // Optimasi kontras & kecerahan
            ctx.filter = 'contrast(1.25) brightness(1.03)';
            ctx.drawImage(img, 0, 0, w, h);
            
            // Simpan data base64 terkompresi
            lastImageBase64 = canvas.toDataURL('image/jpeg', 0.85);
            
            // Buka Modal & Mulai Proses
            showOCRPreview(lastImageBase64);
            startOCRProcess(lastImageBase64);
            
            e.target.value = ''; // Reset input file
        };
        img.src = re.target.result;
    };
    reader.readAsDataURL(f);
}

function showOCRPreview(imgSrc) {
    const overlay = document.getElementById('ocr-preview-overlay');
    document.getElementById('ocr-preview-img').src = imgSrc;
    overlay.classList.remove('hidden');
    showScanningState();
}

function hideOCRPreview() {
    document.getElementById('ocr-preview-overlay').classList.add('hidden');
}

function showScanningState() {
    document.getElementById('ocr-modal-title').innerText = "Optimasi Gambar AI";
    document.getElementById('ocr-modal-desc').innerText = "Sistem sedang membaca tulisan tangan dari hasil pengolahan ini:";
    document.getElementById('ocr-scan-frame').classList.remove('hidden');
    document.getElementById('ocr-review-frame').classList.add('hidden');
    document.getElementById('ocr-error-frame').classList.add('hidden');
    
    document.getElementById('btn-ocr-cancel').classList.remove('hidden');
    document.getElementById('btn-ocr-cancel').innerText = "Batal";
    document.getElementById('btn-ocr-retry').classList.add('hidden');
    document.getElementById('btn-ocr-confirm').classList.add('hidden');
}

function showReviewState(resultData) {
    document.getElementById('ocr-modal-title').innerText = "Hasil Pembacaan AI";
    document.getElementById('ocr-modal-desc').innerText = "Periksa & betulkan hasil pembacaan sebelum dimasukkan ke tabel:";
    document.getElementById('ocr-scan-frame').classList.add('hidden');
    document.getElementById('ocr-review-frame').classList.remove('hidden');
    document.getElementById('ocr-error-frame').classList.add('hidden');
    
    document.getElementById('btn-ocr-cancel').classList.remove('hidden');
    document.getElementById('btn-ocr-cancel').innerText = "Batal";
    document.getElementById('btn-ocr-retry').classList.add('hidden');
    
    const confirmBtn = document.getElementById('btn-ocr-confirm');
    confirmBtn.classList.remove('hidden');
    
    // Render tabel review
    const tbody = document.getElementById('ocr-review-table-body');
    tbody.innerHTML = '';
    
    resultData.forEach((item) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
        
        const cleanKilo = item.kilo !== undefined && item.kilo !== null ? String(item.kilo).replace(',', '.') : '';
        const cleanModal = item.modal !== undefined && item.modal !== null ? String(item.modal).replace(',', '.') : '';
        
        tr.innerHTML = `
            <td style="padding: 6px 3px;"><input type="text" class="edit-review-name" value="${item.name || ''}" style="padding: 6px; font-size: 0.85rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; color: white; width: 100%;"></td>
            <td style="padding: 6px 3px;"><input type="number" step="0.1" class="edit-review-kilo" value="${cleanKilo}" style="padding: 6px; font-size: 0.85rem; text-align: center; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; color: white; width: 100%;"></td>
            <td style="padding: 6px 3px;"><input type="number" class="edit-review-modal" value="${cleanModal}" style="padding: 6px; font-size: 0.85rem; text-align: center; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; color: white; width: 100%;"></td>
        `;
        tbody.appendChild(tr);
    });
}

function showErrorState(errorMessage) {
    document.getElementById('ocr-modal-title').innerText = "Gagal Membaca";
    document.getElementById('ocr-modal-desc').innerText = "AI mengalami kendala saat membaca foto Anda.";
    document.getElementById('ocr-scan-frame').classList.add('hidden');
    document.getElementById('ocr-review-frame').classList.add('hidden');
    
    const errFrame = document.getElementById('ocr-error-frame');
    errFrame.classList.remove('hidden');
    document.getElementById('ocr-error-msg').innerText = errorMessage;
    
    document.getElementById('btn-ocr-cancel').classList.remove('hidden');
    document.getElementById('btn-ocr-cancel').innerText = "Batal";
    document.getElementById('btn-ocr-retry').classList.remove('hidden');
    document.getElementById('btn-ocr-confirm').classList.add('hidden');
    lucide.createIcons();
}

async function startOCRProcess(imageBase64) {
    showScanningState();
    showToast("Menganalisis dengan Google AI...");
    
    try {
        const response = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageBase64 })
        });

        if (response.status === 404) throw new Error("API tidak ditemukan. Pastikan sudah deploy.");
        
        const result = await response.json();
        if (result.error) throw new Error(result.error);

        if (!Array.isArray(result) || result.length === 0) {
            throw new Error("AI tidak berhasil mendeteksi data tabel dalam foto.");
        }

        showReviewState(result);
        showToast("Pembacaan selesai! Silakan review.");
    } catch (err) {
        console.error("AI OCR Error:", err);
        showErrorState(err.message);
        showToast("Pembacaan gagal.");
    }
}

async function retryOCR() {
    if (lastImageBase64) {
        startOCRProcess(lastImageBase64);
    } else {
        showToast("Tidak ada gambar untuk di-retry. Silakan upload ulang.");
        hideOCRPreview();
    }
}

function confirmOCRResults() {
    const names = document.querySelectorAll('.edit-review-name');
    const kilos = document.querySelectorAll('.edit-review-kilo');
    const modals = document.querySelectorAll('.edit-review-modal');
    
    let addedCount = 0;
    
    // Kosongkan tabel utama dulu sebelum memasukkan hasil scan baru
    document.getElementById('table-body').innerHTML = '';
    
    names.forEach((nameInput, i) => {
        const name = nameInput.value.trim();
        const kilo = kilos[i].value.trim();
        const modal = modals[i].value.trim();
        
        if (name || kilo) {
            addRow(name, kilo, modal);
            addedCount++;
        }
    });
    
    hideOCRPreview();
    showToast(`Berhasil memasukkan ${addedCount} data ke rekap tabel.`);
}

function showToast(m) {
    const t = document.getElementById('toast'); t.innerText = m;
    t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3000);
}

window.onload = () => {
    for(let i=0; i<3; i++) addRow();
    dragElement(document.getElementById("floating-calc"));
    lucide.createIcons();
};
