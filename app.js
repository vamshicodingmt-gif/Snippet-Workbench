/**
 * CodeSnippet-Workbench - Core Client Engine
 * Zero-dependency, offline-ready local snippets organizer.
 */

// Application State
const state = {
    vaultName: "Developer Vault",
    lastIndexedAt: "",
    snippets: [],
    categories: [],
    selectedCategory: "all",
    selectedSnippet: null,
    searchQuery: ""
};

// DOM Cache
const dom = {
    vaultInfo: document.getElementById("vault-info"),
    statusBadge: document.getElementById("status-badge"),
    categoryList: document.getElementById("category-list"),
    statsTotalCount: document.getElementById("stats-total-count"),
    statsCatCount: document.getElementById("stats-cat-count"),
    searchInput: document.getElementById("search-input"),
    snippetList: document.getElementById("snippet-list"),
    activeTitle: document.getElementById("active-title"),
    activeCategory: document.getElementById("active-category"),
    activeExtension: document.getElementById("active-extension"),
    copyBtn: document.getElementById("copy-snippet-btn"),
    emptyState: document.getElementById("empty-state"),
    codeScroller: document.getElementById("code-scroller"),
    codeStage: document.getElementById("code-stage"),
    syncTime: document.getElementById("footer-sync-time"),
    workbenchLayout: document.querySelector(".workbench-layout")
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    setupMobileCategorySlider();
    registerEventListeners();
    loadSnippetsCatalog();
});

// Create and insert horizontal slider for categories (shown on mobile/tablet viewports)
function setupMobileCategorySlider() {
    const slider = document.createElement("div");
    slider.className = "mobile-categories-slider";
    slider.id = "mobile-categories-slider";
    dom.workbenchLayout.parentNode.insertBefore(slider, dom.workbenchLayout);
}

// Register Events
function registerEventListeners() {
    // Search Input Event
    dom.searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        renderSnippetList();
    });

    // Main Copy Button Event
    dom.copyBtn.addEventListener("click", () => {
        if (!state.selectedSnippet) return;
        copySnippetToClipboard(state.selectedSnippet.rawCode, dom.copyBtn);
    });
}

// Fetch database payload
async function loadSnippetsCatalog() {
    try {
        const response = await fetch("snippets-db.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.ok ? await response.json() : null;
        
        if (data) {
            state.vaultName = data.vaultName || "Developer Vault";
            state.lastIndexedAt = data.lastIndexedAt || "";
            state.snippets = data.snippets || [];
            
            // Extract unique categories, sorted alphabetically
            const uniqueCats = [...new Set(state.snippets.map(s => s.category).filter(Boolean))];
            state.categories = uniqueCats.sort((a, b) => a.localeCompare(b));
            
            updateHeaderAndStats();
            renderCategories();
            renderSnippetList();
            
            // Success status
            dom.statusBadge.className = "status-badge online";
            dom.statusBadge.querySelector(".badge-text").textContent = "Local Engine";
        }
    } catch (error) {
        console.error("Failed to load snippets-db.json:", error);
        
        // Show Offline / Indexing warning in UI
        dom.vaultInfo.textContent = "Catalog database empty or offline";
        dom.statusBadge.className = "status-badge offline";
        dom.statusBadge.querySelector(".badge-text").textContent = "Disconnected";
        
        dom.categoryList.innerHTML = `<li class="category-item-error" style="color: var(--text-muted); padding: 8px 12px; font-size: 12px;">Run python indexer/index-snippets.py to generate snippet DB</li>`;
        dom.snippetList.innerHTML = `
            <div class="empty-state">
                <p style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary)">No database found</p>
                <p class="empty-text" style="font-size: 12px;">Please execute the local compiler script under <code>indexer/index-snippets.py</code> to initialize the code snippet catalog.</p>
            </div>
        `;
    }
}

// Update App stats and header
function updateHeaderAndStats() {
    dom.vaultInfo.textContent = `Offline vault: ${state.vaultName}`;
    dom.statsTotalCount.textContent = state.snippets.length;
    dom.statsCatCount.textContent = state.categories.length;
    
    if (state.lastIndexedAt) {
        const date = new Date(state.lastIndexedAt);
        dom.syncTime.textContent = `Database static: Indexed ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    } else {
        dom.syncTime.textContent = "Database static: Ready";
    }
}

// Render left categories list & mobile slider pills
function renderCategories() {
    // 1. Sidebar Category Rail
    dom.categoryList.innerHTML = "";
    
    // Add "All" Category Option
    const allCount = state.snippets.length;
    const allItem = createCategoryListItem("all", "All Snippets", allCount);
    dom.categoryList.appendChild(allItem);

    state.categories.forEach(cat => {
        const count = state.snippets.filter(s => s.category === cat).length;
        const item = createCategoryListItem(cat, cat, count);
        dom.categoryList.appendChild(item);
    });

    // 2. Mobile Pills Slider
    const mobileSlider = document.getElementById("mobile-categories-slider");
    if (mobileSlider) {
        mobileSlider.innerHTML = "";
        
        const allPill = createCategoryPillItem("all", "All");
        mobileSlider.appendChild(allPill);

        state.categories.forEach(cat => {
            const pill = createCategoryPillItem(cat, cat);
            mobileSlider.appendChild(pill);
        });
    }
}

// Helper to create Sidebar category DOM node
function createCategoryListItem(id, displayName, count) {
    const li = document.createElement("li");
    li.className = `category-item ${state.selectedCategory === id ? 'active' : ''}`;
    li.dataset.category = id;
    
    // Capitalize category name
    const titleText = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    
    li.innerHTML = `
        <span class="category-name">
            <svg style="width: 14px; height: 14px; opacity: 0.7;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            ${titleText}
        </span>
        <span class="category-count">${count}</span>
    `;

    li.addEventListener("click", () => {
        selectCategory(id);
    });
    return li;
}

// Helper to create Mobile Category Pill
function createCategoryPillItem(id, displayName) {
    const div = document.createElement("div");
    div.className = `mobile-cat-pill ${state.selectedCategory === id ? 'active' : ''}`;
    div.dataset.category = id;
    
    const titleText = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    div.textContent = titleText;
    
    div.addEventListener("click", () => {
        selectCategory(id);
    });
    return div;
}

// Select category handler
function selectCategory(catId) {
    state.selectedCategory = catId;
    
    // Update Sidebar active state
    document.querySelectorAll(".category-item").forEach(item => {
        item.classList.toggle("active", item.dataset.category === catId);
    });

    // Update Mobile Slider pills
    document.querySelectorAll(".mobile-cat-pill").forEach(pill => {
        pill.classList.toggle("active", pill.dataset.category === catId);
    });

    renderSnippetList();
}

// Fuzzy Search Engine
function computeSearchScore(snippet, query) {
    if (!query) return 1.0;
    query = query.trim().toLowerCase();
    
    const title = snippet.title.toLowerCase();
    const fileName = snippet.fileName.toLowerCase();
    const ext = snippet.extension.toLowerCase();
    const category = snippet.category.toLowerCase();
    const code = snippet.rawCode.toLowerCase();
    
    // Exact or starting matches (High priority)
    if (title === query) return 1000;
    if (fileName === query) return 900;
    
    let score = 0;
    
    // Substring matches
    if (title.includes(query)) score += 500 + (title.indexOf(query) === 0 ? 100 : 0);
    if (fileName.includes(query)) score += 400;
    if (ext === query) score += 300;
    if (category === query) score += 200;
    if (code.includes(query)) score += 100;
    
    if (score > 0) return score;
    
    // Sequential character match fallback
    function matchSequence(target, queryStr, baseWeight) {
        let qIdx = 0;
        let tIdx = 0;
        let matchCount = 0;
        let consecutiveCount = 0;
        let seqScore = 0;
        let lastMatchIdx = -1;
        
        while (tIdx < target.length && qIdx < queryStr.length) {
            if (target[tIdx] === queryStr[qIdx]) {
                matchCount++;
                seqScore += baseWeight;
                
                // Consecutive matching bonus
                if (lastMatchIdx === tIdx - 1) {
                    consecutiveCount++;
                    seqScore += baseWeight * 0.5 * consecutiveCount;
                } else {
                    consecutiveCount = 0;
                }
                
                // Boundary matching bonus
                if (tIdx === 0 || target[tIdx - 1] === ' ' || target[tIdx - 1] === '-' || target[tIdx - 1] === '_') {
                    seqScore += baseWeight * 0.8;
                }
                
                lastMatchIdx = tIdx;
                qIdx++;
            }
            tIdx++;
        }
        
        if (qIdx === queryStr.length) {
            const distancePenalty = (target.length - queryStr.length) * 0.05;
            return Math.max(1, seqScore - distancePenalty);
        }
        return 0;
    }
    
    const titleSeqScore = matchSequence(title, query, 50);
    const fileSeqScore = matchSequence(fileName, query, 40);
    
    return Math.max(titleSeqScore, fileSeqScore);
}

// Render snippet cards
function renderSnippetList() {
    dom.snippetList.innerHTML = "";
    
    // 1. Filter by category
    let list = state.snippets;
    if (state.selectedCategory !== "all") {
        list = list.filter(s => s.category === state.selectedCategory);
    }
    
    // 2. Score search matches
    let scoredList = [];
    if (state.searchQuery) {
        list.forEach(s => {
            const score = computeSearchScore(s, state.searchQuery);
            if (score > 0) {
                scoredList.push({ snippet: s, score });
            }
        });
        // Sort by search relevance score descending
        scoredList.sort((a, b) => b.score - a.score);
        list = scoredList.map(item => item.snippet);
    }

    // 3. Render cards
    if (list.length === 0) {
        dom.snippetList.innerHTML = `
            <div class="empty-state">
                <svg style="width:36px; height:36px; stroke:var(--text-muted); opacity: 0.5; margin-bottom:8px;" fill="none" viewBox="0 0 24 24" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <p class="empty-text">No matching snippets found</p>
            </div>
        `;
        return;
    }

    list.forEach(s => {
        const card = document.createElement("div");
        card.className = `snippet-card ${state.selectedSnippet && state.selectedSnippet.id === s.id ? 'active' : ''}`;
        card.dataset.id = s.id;
        
        card.innerHTML = `
            <div class="card-header">
                <h3 class="card-title">${escapeHtml(s.title)}</h3>
                <span class="extension-badge ${escapeHtml(s.extension)}">${escapeHtml(s.extension)}</span>
            </div>
            <div class="card-meta">
                <span class="card-category">${escapeHtml(s.category)}</span>
            </div>
            <button class="card-copy-btn" aria-label="Copy snippet" title="Copy snippet code">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height:14px;">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
        `;

        // Card select handler
        card.addEventListener("click", (e) => {
            // If user clicked copy inside card, only fire copy logic
            if (e.target.closest(".card-copy-btn")) {
                const btn = card.querySelector(".card-copy-btn");
                copySnippetToClipboard(s.rawCode, btn);
                return;
            }
            selectSnippet(s);
        });

        dom.snippetList.appendChild(card);
    });
}

// Select a snippet & update preview panel
function selectSnippet(snippet) {
    state.selectedSnippet = snippet;
    
    // Toggle active classes on cards
    document.querySelectorAll(".snippet-card").forEach(card => {
        card.classList.toggle("active", card.dataset.id === snippet.id);
    });
    
    // Update right Preview Area
    dom.activeTitle.textContent = snippet.title;
    
    dom.activeCategory.textContent = snippet.category;
    dom.activeCategory.style.display = "inline-block";
    
    dom.activeExtension.textContent = snippet.extension;
    dom.activeExtension.className = `preview-badge ext ${snippet.extension}`;
    dom.activeExtension.style.display = "inline-block";
    
    dom.copyBtn.disabled = false;
    dom.copyBtn.className = "action-btn copy-btn";
    dom.copyBtn.querySelector(".btn-text").textContent = "Copy Code";
    
    // Hide empty state and show scroller
    dom.emptyState.style.display = "none";
    dom.codeScroller.style.display = "block";
    
    // Set raw text
    dom.codeStage.textContent = snippet.rawCode;
    dom.codeStage.className = "";
    dom.codeStage.classList.add(`language-${snippet.extension}`);
    
    // Apply Highlight.js syntax formatting
    if (typeof hljs !== "undefined") {
        try {
            hljs.highlightElement(dom.codeStage);
        } catch (e) {
            console.warn("Highlight.js styling failed, fallback to plain text:", e);
        }
    }
}

// Clipboard Action Utility
function copySnippetToClipboard(text, btnElement) {
    const isMainBtn = btnElement === dom.copyBtn;
    
    // Success Indicator Mutation
    function showSuccessState() {
        if (isMainBtn) {
            btnElement.classList.add("success");
            btnElement.querySelector(".btn-text").textContent = "Copied!";
        } else {
            btnElement.style.backgroundColor = "var(--success)";
            btnElement.style.borderColor = "var(--success)";
            btnElement.style.color = "#fff";
            btnElement.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height:14px;">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
        }
        
        setTimeout(() => {
            if (isMainBtn) {
                btnElement.classList.remove("success");
                btnElement.querySelector(".btn-text").textContent = "Copy Code";
            } else {
                btnElement.style.backgroundColor = "";
                btnElement.style.borderColor = "";
                btnElement.style.color = "";
                btnElement.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height:14px;">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                `;
            }
        }, 1500);
    }

    // Try modern asynchronous Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(showSuccessState)
            .catch(err => {
                console.warn("Async clipboard API failed, trying fallback:", err);
                fallbackCopyToClipboard(text) ? showSuccessState() : alert("Copy failed.");
            });
    } else {
        // Fallback executing legacy selection API
        fallbackCopyToClipboard(text) ? showSuccessState() : alert("Copy failed.");
    }
}

// Fallback legacy browser copy mechanism (for local file:// execution contexts)
function fallbackCopyToClipboard(text) {
    let textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Avoid scrolling window bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    let successful = false;
    try {
        successful = document.execCommand("copy");
    } catch (err) {
        console.error("Fallback clipboard mechanism failed:", err);
    }
    
    document.body.removeChild(textArea);
    return successful;
}

// Helper to sanitize HTML strings
function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
