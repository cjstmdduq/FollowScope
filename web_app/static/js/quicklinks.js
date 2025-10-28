// Quick Links Data Structure
const quickLinksData = {
    "롤매트": {
        icon: "fa-scroll",
        links: {
            "따사룸": {
                url: "https://brand.naver.com/ddasaroom/products/6092903705",
                code: "6092903705"
            },
            "따사룸(sub)": {
                url: "https://brand.naver.com/ddasaroom/products/6626596277",
                code: "6626596277"
            },
            "파크론": {
                url: "https://brand.naver.com/parklonmall/products/4646409496",
                code: "4646409496"
            },
            "파크론(sub)": {
                url: "https://brand.naver.com/parklonmall/products/8252124473",
                code: "8252124473"
            },
            "리포소": {
                url: "https://smartstore.naver.com/riposo-home/products/6780630733",
                code: "6780630733"
            },
            "티지오": {
                url: "https://brand.naver.com/tgomat/products/6090395041",
                code: "6090395041"
            },
            "크림하우스": {
                url: "https://brand.naver.com/creamhaus/products/4832575438",
                code: "4832575438"
            },
            "에코폼": {
                url: "https://brand.naver.com/ecofoam/products/2329254496",
                code: "2329254496"
            },
            "꿈비": {
                url: "https://brand.naver.com/ggumbi/products/4076467254",
                code: "4076467254"
            }
        }
    },
    "퍼즐매트": {
        icon: "fa-puzzle-piece",
        links: {
            "따사룸": {
                url: "https://brand.naver.com/ddasaroom/products/5994906898",
                code: "5994906898"
            },
            "에코폼": {
                url: "https://brand.naver.com/ecofoam/products/424421784",
                code: "424421784"
            },
            "티지오매트": {
                url: "https://brand.naver.com/tgomat/products/2462282566",
                code: "2462282566"
            }
        }
    },
    "TPU매트": {
        icon: "fa-shield-alt",
        links: {
            // TPU 매트 링크 추가
        }
    },
    "양면매트": {
        icon: "fa-layer-group",
        links: {
            // 양면매트 링크 추가
        }
    },
    "폴더매트": {
        icon: "fa-folder",
        links: {
            // 폴더매트 링크 추가
        }
    },
    "강아지롤매트": {
        icon: "fa-paw",
        links: {
            "따사룸": {
                url: "https://brand.naver.com/ddasaroom/products/4200445704",
                code: "4200445704"
            },
            "에코폼": {
                url: "https://brand.naver.com/ecofoam/products/2008613872",
                code: "2008613872"
            },
            "리포소": {
                url: "https://brand.naver.com/riposopet/products/5151541190",
                code: "5151541190"
            },
            "로하우스": {
                url: "https://smartstore.naver.com/lohouse/products/5921166460",
                code: "5921166460"
            },
            "올웨이즈올펫": {
                url: "https://brand.naver.com/allpet/products/5311346622",
                code: "5311346622"
            },
            "티지오매트": {
                url: "https://brand.naver.com/tgomat/products/5154283552",
                code: "5154283552"
            }
        }
    }
};

// Toggle Quick Links Panel (removed - keeping function for backward compatibility)
function toggleQuickLinks() {
    // Function disabled - quick links are always collapsed by default
}

// Initialize Quick Links
function initializeQuickLinks() {
    const categoriesContainer = document.getElementById('quickLinksCategories');
    categoriesContainer.innerHTML = '';
    
    // Keep panel open by default
    const panel = document.getElementById('quickLinksPanel');
    if (panel) {
        panel.classList.remove('collapsed');
    }
    
    // Add Naver Shopping Search at the top
    const searchDiv = document.createElement('div');
    searchDiv.className = 'naver-search-container';
    searchDiv.innerHTML = `
        <div class="search-input-wrapper">
            <input type="text" id="naverSearchInput" class="search-input" placeholder="검색어" value="층간소음매트">
            <div class="search-buttons">
                <a href="#" id="priceCompareLink" class="search-btn-icon price-compare" target="_blank" title="가격비교">N</a>
                <a href="#" id="plusStoreLink" class="search-btn-icon plus-store" target="_blank" title="플러스스토어">+</a>
                <a href="#" id="shoppingLiveLink" class="search-btn-icon shopping-live" target="_blank" title="쇼핑라이브"><i class="fas fa-video"></i></a>
            </div>
        </div>
    `;
    categoriesContainer.appendChild(searchDiv);
    
    // Set up search functionality
    setupNaverSearch();
    
    // Add separator
    const separator = document.createElement('div');
    separator.className = 'quicklinks-separator';
    categoriesContainer.appendChild(separator);
    
    for (const [category, data] of Object.entries(quickLinksData)) {
        if (Object.keys(data.links).length === 0) continue; // Skip empty categories
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'sidebar-submenu collapsed'; // Start collapsed
        
        // Category Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'sidebar-submenu-header';
        headerDiv.onclick = () => toggleCategory(categoryDiv);
        headerDiv.innerHTML = `
            <span class="submenu-title"><i class="fas ${data.icon}"></i> ${category}</span>
            <i class="fas fa-chevron-down submenu-arrow"></i>
        `;
        
        // Category Items
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'submenu-items';
        
        for (const [name, linkData] of Object.entries(data.links)) {
            const linkElement = document.createElement('a');
            linkElement.className = 'submenu-link';
            
            // Handle both old format (string) and new format (object)
            if (typeof linkData === 'string') {
                linkElement.href = linkData;
                linkElement.innerHTML = `<span>${name}</span>`;
            } else {
                linkElement.href = linkData.url;
                linkElement.innerHTML = `
                    <span>${name}</span>
                    <span class="quick-link-code">(${linkData.code})</span>
                `;
            }
            
            linkElement.target = '_blank';
            linkElement.setAttribute('data-category', category);
            linkElement.setAttribute('data-name', name);
            itemsDiv.appendChild(linkElement);
        }
        
        categoryDiv.appendChild(headerDiv);
        categoryDiv.appendChild(itemsDiv);
        categoriesContainer.appendChild(categoryDiv);
    }
}

// Setup Naver Search functionality
function setupNaverSearch() {
    const searchInput = document.getElementById('naverSearchInput');
    const priceCompareLink = document.getElementById('priceCompareLink');
    const plusStoreLink = document.getElementById('plusStoreLink');
    const shoppingLiveLink = document.getElementById('shoppingLiveLink');
    
    // Update links when input changes
    function updateLinks() {
        const query = encodeURIComponent(searchInput.value);
        priceCompareLink.href = `https://search.shopping.naver.com/search/all?query=${query}&frm=NVSCPRO&nl-ts-pid=jc8Hqdqo1SossD58I6CssssstJ0-084716&bt=-1`;
        plusStoreLink.href = `https://search.shopping.naver.com/ns/search?query=${query}`;
        shoppingLiveLink.href = `https://shoppinglive.naver.com/search/lives?query=${query}`;
    }
    
    // Update links when input changes
    searchInput.addEventListener('input', updateLinks);
    
    // Initialize links
    updateLinks();
}


// Toggle Category Collapse
function toggleCategory(categoryDiv) {
    categoryDiv.classList.toggle('collapsed');
    const arrow = categoryDiv.querySelector('.submenu-arrow');
    if (arrow) {
        if (categoryDiv.classList.contains('collapsed')) {
            arrow.classList.remove('fa-chevron-up');
            arrow.classList.add('fa-chevron-down');
        } else {
            arrow.classList.remove('fa-chevron-down');
            arrow.classList.add('fa-chevron-up');
        }
    }
}


// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('quickLinksCategories')) {
        initializeQuickLinks();
    }
});