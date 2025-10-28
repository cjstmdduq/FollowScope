// Mobile UI Functions

// Toggle mobile sidebar
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

// Toggle mobile quicklinks
function toggleMobileQuicklinks() {
    const quicklinks = document.getElementById('quickLinksPanel');
    const overlay = document.querySelector('.quicklinks-overlay');
    
    if (quicklinks && overlay) {
        quicklinks.classList.toggle('mobile-active');
        overlay.classList.toggle('active');
    }
}

// Make functions available globally
window.toggleMobileSidebar = toggleMobileSidebar;
window.toggleMobileQuicklinks = toggleMobileQuicklinks;

// Close sidebar when clicking on a menu item
document.addEventListener('DOMContentLoaded', function() {
    // Add click listeners to all sidebar buttons
    const sidebarButtons = document.querySelectorAll('.sidebar-btn');
    sidebarButtons.forEach(button => {
        button.addEventListener('click', function() {
            // On mobile, close sidebar after selection
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    const sidebar = document.getElementById('sidebar');
                    const overlay = document.querySelector('.sidebar-overlay');
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                }, 300);
            }
        });
    });

    // Handle orientation change
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            // Redraw charts on orientation change
            if (window.overviewChart && typeof window.overviewChart.resize === 'function') {
                window.overviewChart.resize();
            }
            if (window.comparisonChart && typeof window.comparisonChart.resize === 'function') {
                window.comparisonChart.resize();
            }
            if (window.reviewCountChart && typeof window.reviewCountChart.resize === 'function') {
                window.reviewCountChart.resize();
            }
            if (window.marketShareChart && typeof window.marketShareChart.resize === 'function') {
                window.marketShareChart.resize();
            }
        }, 300);
    });

    // Improve touch scrolling for tables
    const tables = document.querySelectorAll('.table-container');
    tables.forEach(table => {
        let isScrolling = false;
        let startX;
        let scrollLeft;

        table.addEventListener('touchstart', (e) => {
            isScrolling = true;
            startX = e.touches[0].pageX - table.offsetLeft;
            scrollLeft = table.scrollLeft;
        });

        table.addEventListener('touchmove', (e) => {
            if (!isScrolling) return;
            e.preventDefault();
            const x = e.touches[0].pageX - table.offsetLeft;
            const walk = (x - startX) * 2;
            table.scrollLeft = scrollLeft - walk;
        });

        table.addEventListener('touchend', () => {
            isScrolling = false;
        });
    });

    // Add swipe gestures for tab navigation
    let touchStartX = 0;
    let touchEndX = 0;
    const mainContent = document.querySelector('.main-content');
    
    if (mainContent) {
        mainContent.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);

        mainContent.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, false);
    }

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            const panes = document.querySelectorAll('.tab-pane');
            if (panes.length === 0) return; // Not a dashboard page
            const activeTabs = ['feed', 'heatmap', 'calendar', 'macros', 'review-trends'];
            const activeTab = document.querySelector('.tab-pane.active');
            if (!activeTab) return;
            const currentIndex = activeTabs.findIndex(tab => tab === activeTab.id);
            
            if (diff > 0 && currentIndex < activeTabs.length - 1) {
                // Swipe left - next tab
                showTab(activeTabs[currentIndex + 1]);
            } else if (diff < 0 && currentIndex > 0) {
                // Swipe right - previous tab
                showTab(activeTabs[currentIndex - 1]);
            }
        }
    }

    // Optimize chart options for mobile
    if (window.innerWidth <= 768) {
        Chart.defaults.font.size = 10;
        Chart.defaults.plugins.legend.labels.boxWidth = 12;
        Chart.defaults.plugins.legend.labels.padding = 10;
    }

    // Add viewport height fix for mobile browsers
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);

    // Prevent double-tap zoom on buttons
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    // Add loading indicator for mobile
    function showMobileLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    function hideMobileLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Export functions to window
    window.showMobileLoading = showMobileLoading;
    window.hideMobileLoading = hideMobileLoading;
});

// Add pull-to-refresh functionality
let pullToRefreshStartY = 0;
let isPulling = false;

document.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0) {
        pullToRefreshStartY = e.touches[0].clientY;
        isPulling = true;
    }
});

document.addEventListener('touchmove', (e) => {
    if (!isPulling) return;
    
    const currentY = e.touches[0].clientY;
    const pullDistance = currentY - pullToRefreshStartY;
    
    if (pullDistance > 100) {
        // Show refresh indicator
        document.body.style.transform = `translateY(${Math.min(pullDistance / 2, 50)}px)`;
    }
});

document.addEventListener('touchend', (e) => {
    if (!isPulling) return;
    
    const currentY = e.changedTouches[0].clientY;
    const pullDistance = currentY - pullToRefreshStartY;
    
    document.body.style.transform = '';
    
    if (pullDistance > 150) {
        // Trigger refresh
        location.reload();
    }
    
    isPulling = false;
});
