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
    
    for (const [category, data] of Object.entries(quickLinksData)) {
        if (Object.keys(data.links).length === 0) continue; // Skip empty categories
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'sidebar-submenu';
        
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

// Toggle Category Collapse
function toggleCategory(categoryDiv) {
    categoryDiv.classList.toggle('collapsed');
    const arrow = categoryDiv.querySelector('.submenu-arrow');
    if (arrow) {
        arrow.classList.toggle('fa-chevron-down');
        arrow.classList.toggle('fa-chevron-up');
    }
}


// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('quickLinksCategories')) {
        initializeQuickLinks();
    }
});