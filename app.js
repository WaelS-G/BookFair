// --- INIT & PWA ---
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; document.getElementById('installBtn').style.display = 'inline-block'; });
document.getElementById('installBtn').addEventListener('click', async () => { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; document.getElementById('installBtn').style.display = 'none'; } });

function updateStatus() {
    const stat = document.getElementById('connectionStatus');
    const mapMsg = document.getElementById('offlineMapMsg');
    const mapFrame = document.getElementById('mapFrame');
    const mapImg = document.getElementById('mapImage');
    
    if (navigator.onLine) {
        stat.innerText = "متصل"; stat.className = "online";
        if(mapMsg) mapMsg.style.display = 'none';
        mapFrame.style.display = 'block'; mapImg.style.display = 'none';
    } else {
        stat.innerText = "غير متصل"; stat.className = "offline";
        // Offline Logic: Try to load local image
        mapFrame.style.display = 'none';
        mapImg.style.display = 'block';
        if(mapMsg) mapMsg.style.display = 'none'; // Hide text if image loads
    }
}
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
updateStatus();

// --- SEARCH ---
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
        
        if (normName.includes(q)) {
            results.push({ type: 'store', data: store, isGold: (q.length > 0) });
            continue; 
        }

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

// --- NEW PHYSICS-BASED MAP ENGINE ---
const mapUrls = {
    1: "https://bookfair.gebo.gov.eg/Drawingkit/HallPartitionsView.aspx?HID=73",
    2: "https://bookfair.gebo.gov.eg/Drawingkit/HallPartitionsView.aspx?HID=74",
    3: "https://bookfair.gebo.gov.eg/Drawingkit/HallPartitionsView.aspx?HID=69",
    4: "https://bookfair.gebo.gov.eg/Drawingkit/HallPartitionsView.aspx?HID=70",
    5: "https://bookfair.gebo.gov.eg/Drawingkit/HallPartitionsView.aspx?HID=71"
};

// Physics State
let state = {
    x: 0, y: 0, scale: 1,
    isDragging: false,
    startX: 0, startY: 0,
    pointers: [] // For multi-touch
};

const viewport = document.getElementById('mapViewport');
const content = document.getElementById('mapContent');
const frame = document.getElementById('mapFrame');
const img = document.getElementById('mapImage');

// Helper to get distance between two touch points
function getDist(p1, p2) {
    return Math.sqrt(Math.pow(p1.clientX - p2.clientX, 2) + Math.pow(p1.clientY - p2.clientY, 2));
}

// Pointer Events (Unified Mouse/Touch)
viewport.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    state.pointers.push(e);
    
    if (state.pointers.length === 1) {
        // Start Drag
        state.isDragging = true;
        state.startX = e.clientX - state.x;
        state.startY = e.clientY - state.y;
    } else if (state.pointers.length === 2) {
        // Start Pinch
        state.isDragging = false; // Disable drag during pinch
        state.startDist = getDist(state.pointers[0], state.pointers[1]);
        state.startScale = state.scale;
    }
});

viewport.addEventListener('pointermove', (e) => {
    e.preventDefault();
    
    // Update pointer cache
    const idx = state.pointers.findIndex(p => p.pointerId === e.pointerId);
    if (idx !== -1) state.pointers[idx] = e;

    if (state.pointers.length === 2) {
        // Pinch Zoom
        const currDist = getDist(state.pointers[0], state.pointers[1]);
        const scaleDiff = currDist / state.startDist;
        state.scale = Math.max(0.5, Math.min(state.startScale * scaleDiff, 4));
        updateTransform();
    } else if (state.pointers.length === 1 && state.isDragging) {
        // Drag Pan
        state.x = e.clientX - state.startX;
        state.y = e.clientY - state.startY;
        updateTransform();
    }
});

function removePointer(e) {
    const idx = state.pointers.findIndex(p => p.pointerId === e.pointerId);
    if (idx !== -1) state.pointers.splice(idx, 1);
    
    if (state.pointers.length === 0) state.isDragging = false;
    if (state.pointers.length === 1) {
        // Resume dragging if one finger left
        state.isDragging = true;
        state.startX = state.pointers[0].clientX - state.x;
        state.startY = state.pointers[0].clientY - state.y;
    }
}

viewport.addEventListener('pointerup', removePointer);
viewport.addEventListener('pointercancel', removePointer);
viewport.addEventListener('pointerleave', removePointer);

// Mouse Wheel Zoom
viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomMap(delta);
}, { passive: false });

function updateTransform() {
    content.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
}

function resetMap() {
    // Reset to "Fit Screen" logic
    const nativeW = 1000;
    const nativeH = 1200;
    
    // Set content size
    content.style.width = `${nativeW}px`;
    content.style.height = `${nativeH}px`;
    frame.style.width = '100%'; frame.style.height = '100%';
    img.style.width = '100%'; img.style.height = '100%';

    // Calculate Fit Scale
    const availW = viewport.clientWidth;
    const availH = viewport.clientHeight;
    const scaleX = availW / nativeW;
    const scaleY = availH / nativeH;
    
    state.scale = Math.min(scaleX, scaleY) * 0.95; // 95% fit
    
    // Center it
    state.x = (availW - (nativeW * state.scale)) / 2;
    state.y = (availH - (nativeH * state.scale)) / 2;
    
    updateTransform();
}

function zoomMap(delta) {
    state.scale += delta;
    if (state.scale < 0.2) state.scale = 0.2;
    updateTransform();
}

// Map Switching
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
        showToast(`تم نسخ القسم ${info.section}`);
        navigator.clipboard.writeText(info.section).catch(() => {});
    }
    switchMap(info.hall);
    mapModal.classList.add('show');
}

function switchMap(hallNum) {
    document.querySelectorAll('.map-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.map-tab')[hallNum-1].classList.add('active');

    // Offline Handling
    if (navigator.onLine) {
        img.style.display = 'none';
        frame.style.display = 'block';
        if(frame.src !== mapUrls[hallNum]) {
            frame.src = mapUrls[hallNum];
            frame.onload = resetMap;
        } else {
            setTimeout(resetMap, 100);
        }
    } else {
        // OFFLINE: Try to load local image
        frame.style.display = 'none';
        img.style.display = 'block';
        img.src = `maps/hall${hallNum}.jpg`; // User must save images here
        img.onload = resetMap;
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
}

function closeMap() { mapModal.classList.remove('show'); }
window.addEventListener('resize', () => { if(mapModal.classList.contains('show')) resetMap(); });

document.getElementById('mapBtn').onclick = () => { mapModal.classList.add('show'); switchMap(1); };
document.querySelectorAll('.close-btn').forEach(btn => btn.onclick = () => { storeModal.classList.remove('show'); closeMap(); });

init();
