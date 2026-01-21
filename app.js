// --- INIT & PWA ---
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; document.getElementById('installBtn').style.display = 'inline-block'; });
document.getElementById('installBtn').addEventListener('click', async () => { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; document.getElementById('installBtn').style.display = 'none'; } });

function updateStatus() {
    const stat = document.getElementById('connectionStatus');
    const mapMsg = document.getElementById('offlineMapMsg');
    const mapFrame = document.getElementById('mapFrame');
    if (navigator.onLine) {
        stat.innerText = "متصل"; stat.className = "online";
        if(mapMsg) mapMsg.style.display = 'none';
        if(mapFrame) mapFrame.style.display = 'block';
    } else {
        stat.innerText = "غير متصل"; stat.className = "offline";
        if(mapMsg) mapMsg.style.display = 'flex';
        if(mapFrame) mapFrame.style.display = 'none';
    }
}
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
updateStatus();

// --- SEARCH & FILTER ---
const grid = document.getElementById('resultsGrid');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
let currentFilter = 'all';

function getHallNumber(text) {
    if (!text) return null;
    const match = text.match(/(?:صالة|hall)\s*(\d+)/i);
    return match ? match[1] : null;
}

function normalizeArabic(text) {
    if (!text) return "";
    return text.replace(/(آ|إ|أ)/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ًٌٍَُِّْ]/g, '').toLowerCase();
}

function init() {
    if (typeof CIBF_DATA === 'undefined') { grid.innerHTML = 'Error loading data'; return; }
    renderMixedGrid(CIBF_DATA.slice(0, 50));
}

function handleSearch() {
    const q = normalizeArabic(searchInput.value);
    const results = [];
    const limit = 100;

    for (const store of CIBF_DATA) {
        if (results.length >= limit) break;
        if (currentFilter !== 'all') {
            const hallNum = getHallNumber(store.location);
            if (hallNum !== currentFilter && !store.location.includes(currentFilter)) continue;
        }

        const normName = normalizeArabic(store.name);
        
        // 1. STORE MATCH (GOLD LOGIC)
        if (normName.includes(q)) {
            results.push({ type: 'store', data: store, isGold: (q.length > 0) });
            continue; 
        }

        // 2. BOOK MATCH
        if (q.length > 2) { 
            const matchingBooks = store.books.filter(b => 
                normalizeArabic(b.title).includes(q) || normalizeArabic(b.author).includes(q)
            );
            matchingBooks.slice(0, 3).forEach(book => {
                results.push({ type: 'book', data: book, store: store });
            });
        }
    }
    document.getElementById('resultsCount').innerText = results.length;
    renderMixedGrid(results);
}

searchInput.addEventListener('input', handleSearch);
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        handleSearch();
    });
});

function renderMixedGrid(results) {
    grid.innerHTML = '';
    results.forEach(item => {
        if (item.type === 'book') createBookCard(item.data, item.store);
        else {
            const store = item.data || item;
            createStoreCard(store, item.isGold);
        }
    });
}

function createStoreCard(store, isGold) {
    const el = document.createElement('div');
    el.className = `store-card ${isGold ? 'gold-match' : ''}`;
    let img = store.image && store.image.length > 10 ? store.image : 'https://cdn-icons-png.flaticon.com/512/3145/3145765.png';
    el.innerHTML = `
        <img src="${img}" class="store-img" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3145/3145765.png'">
        <div class="store-name">${store.name}</div>
        <div class="store-loc"><i class="fa-solid fa-location-dot"></i> ${store.location || 'غير محدد'}</div>
        <span class="store-badge">${store.books.length} كتاب</span>
    `;
    el.onclick = () => openStoreModal(store);
    grid.appendChild(el);
}

function createBookCard(book, store) {
    const el = document.createElement('div');
    el.className = 'book-result-card';
    el.innerHTML = `
        <img src="${book.image}" class="book-res-thumb" onerror="this.style.opacity=0">
        <div class="book-res-info">
            <h4>${book.title}</h4>
            <p>${book.author}</p>
            <div class="book-res-store"><i class="fa-solid fa-shop"></i> ${store.name}</div>
        </div>
    `;
    el.onclick = () => openStoreModal(store, book.title);
    grid.appendChild(el);
}

// --- MODALS ---
const storeModal = document.getElementById('storeModal');
const mapModal = document.getElementById('mapModal');

function openStoreModal(store, highlightBookTitle = null) {
    document.getElementById('modalStoreName').innerText = store.name;
    document.getElementById('modalLocText').innerText = store.location;
    document.getElementById('modalBookCount').innerText = store.books.length;
    document.getElementById('modalStoreLoc').dataset.loc = store.location;
    renderBooks(store.books, highlightBookTitle);
    storeModal.classList.add('show');
}

function renderBooks(books, highlightTitle) {
    const container = document.getElementById('booksGrid');
    container.innerHTML = '';
    const bookSearch = document.getElementById('bookSearchInput');
    bookSearch.value = highlightTitle || '';

    const filterAndRender = (q) => {
        const normQ = normalizeArabic(q);
        container.innerHTML = '';
        const filtered = books.filter(b => normalizeArabic(b.title).includes(normQ));
        
        filtered.forEach(book => {
            const div = document.createElement('div');
            const isTarget = highlightTitle && normalizeArabic(book.title) === normalizeArabic(highlightTitle);
            div.className = `book-item ${isTarget ? 'highlight-book' : ''}`;
            div.innerHTML = `
                <img src="${book.image}" class="book-thumb" onerror="this.style.display='none'">
                <div class="book-info">
                    <h4>${book.title}</h4><p>${book.author}</p>
                    <div class="book-details-panel">العنوان: ${book.title}<br>المؤلف: ${book.author}</div>
                </div>
            `;
            div.onclick = () => div.classList.toggle('active');
            container.appendChild(div);
            if (isTarget) setTimeout(() => div.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
        });
    };
    bookSearch.oninput = (e) => filterAndRender(e.target.value);
    filterAndRender(bookSearch.value);
}

// --- MAP SCALING LOGIC (ABSOLUTE CENTER + SCALE) ---
const mapUrls = {
    1: "https://bookfair.gebo.gov.eg/Drawingkit/HallPartitionsView.aspx?HID=73",
    2: "https://bookfair.gebo.gov.eg/Drawingkit/HallPartitionsView.aspx?HID=74",
    3: "https://bookfair.gebo.gov.eg/Drawingkit/HallPartitionsView.aspx?HID=69",
    4: "https://bookfair.gebo.gov.eg/Drawingkit/HallPartitionsView.aspx?HID=70",
    5: "https://bookfair.gebo.gov.eg/Drawingkit/HallPartitionsView.aspx?HID=71"
};

let currentScale = 1;
let baseScale = 1;

function parseLocation(locString) {
    if (!locString) return { hall: 1, section: '' };
    const hallMatch = locString.match(/(?:صالة|Hall)\s*(\d+)/i);
    const hall = hallMatch ? parseInt(hallMatch[1]) : 1;
    const secMatch = locString.match(/(?:بلوك|Block)\s*([A-Za-z0-9]+)/i);
    const section = secMatch ? secMatch[1] : '';
    return { hall, section };
}

function openMapToLocation(locText) {
    const info = parseLocation(locText);
    if(info.section) {
        showToast(`تم نسخ القسم ${info.section}.. يمكنك لصقه في الخريطة`);
        navigator.clipboard.writeText(info.section).catch(() => {});
    }
    switchMap(info.hall);
    mapModal.classList.add('show');
}

function fitMapToScreen() {
    const frame = document.getElementById('mapFrame');
    const container = document.querySelector('.map-container');
    
    // Govt map absolute fixed size
    const nativeW = 1000;
    const nativeH = 1200;
    
    frame.style.width = `${nativeW}px`;
    frame.style.height = `${nativeH}px`;

    const availW = container.clientWidth;
    const availH = container.clientHeight;

    const scaleX = availW / nativeW;
    const scaleY = availH / nativeH;
    
    // Fit strictly inside
    baseScale = Math.min(scaleX, scaleY) * 0.95; 
    currentScale = baseScale;

    applyMapTransform();
}

function zoomMap(delta) {
    currentScale += delta;
    if(currentScale < baseScale) currentScale = baseScale; 
    applyMapTransform();
}

function applyMapTransform() {
    const frame = document.getElementById('mapFrame');
    // Centering is handled by CSS (top: 50%, left: 50%) + Translate
    frame.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
}

function switchMap(hallNum) {
    document.querySelectorAll('.map-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.map-tab')[hallNum-1].classList.add('active');

    const frame = document.getElementById('mapFrame');
    
    if (navigator.onLine && mapUrls[hallNum]) {
        if(frame.src !== mapUrls[hallNum]) {
            frame.src = mapUrls[hallNum];
            frame.onload = fitMapToScreen;
        } else {
            setTimeout(fitMapToScreen, 100); 
        }
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
}

function closeMap() { mapModal.classList.remove('show'); }
window.addEventListener('resize', () => { if(mapModal.classList.contains('show')) fitMapToScreen(); });

document.getElementById('mapBtn').onclick = () => { mapModal.classList.add('show'); switchMap(1); };
document.querySelectorAll('.close-btn').forEach(btn => btn.onclick = () => { storeModal.classList.remove('show'); closeMap(); });

init();