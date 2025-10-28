// Global variables
let allData = [];
let filteredData = [];
let charts = {};
let promotionData = [];
let currentMonth = new Date();

// Tab-specific product type states
let tabProductTypes = {
    heatmap: 'roll'
};

// Current active tab
let currentTab = 'heatmap';

// Brand colors for calendar
const brandColors = {};
const colorPalette = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#dc2626', '#ea580c', '#d97706'
];
let colorIndex = 0;

function getBrandColor(brand) {
    if (!brandColors[brand]) {
        brandColors[brand] = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
    }
    return brandColors[brand];
}

// Tab switching function
function showTab(tabName) {
    // Hide all tab panes
    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(pane => {
        pane.classList.remove('active');
    });

    // Remove active class from all sidebar buttons
    const buttons = document.querySelectorAll('.sidebar-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Show the selected tab pane
    const targetPane = document.getElementById(tabName);
    if (targetPane) {
        targetPane.classList.add('active');
    }

    // Add active class to the corresponding sidebar button
    const targetButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (targetButton) {
        targetButton.classList.add('active');
    }

    // Initialize specific tab content if needed
    if (tabName === 'feed' && typeof initializeFeed === 'function') {
        initializeFeed();
    } else if (tabName === 'macros' && typeof initializeMacros === 'function') {
        initializeMacros();
    } else if (tabName === 'heatmap') {
        updateHeatmap();
    } else if (tabName === 'review-trends') {
        updateReviewCharts();
    }
}

// Make showTab available globally
window.showTab = showTab;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize dashboard scripts if dashboard elements exist
    const hasDashboard = document.getElementById('heatmap') || document.querySelector('.tab-pane#heatmap');
    if (!hasDashboard) return;

    // Initialize with feed tab as default
    showTab('feed');
});


// Filters change handler
function onFiltersChange() {
    const productTypeSelect = document.getElementById('productTypeSelect');
    const productType = productTypeSelect.value;
    
    // Save state for current tab
    tabProductTypes.overview = productType;
    
    // Load data for this tab only
    loadData('overview', productType);
}

// Load data from API
async function loadData(tab, productType) {
    showLoading(true);
    
    try {
        // Build query string with filters
        const params = new URLSearchParams();
        if (productType) params.append('product_type', productType);
        const queryParams = params.toString() ? `?${params.toString()}` : '';
        
        // Fetch all data
        const response = await fetch('/api/data' + queryParams);
        allData = await response.json();
        filteredData = [...allData];
        
        // Fetch statistics with same filters
        const statsResponse = await fetch('/api/statistics' + queryParams);
        const stats = await statsResponse.json();
        
        // Update navbar stats
        document.getElementById('totalProducts').textContent = stats.total_products;
        document.getElementById('totalCompetitors').textContent = stats.competitors;
        
        // Update overview stats (guard if elements exist)
        const avgEl = document.getElementById('avgPricePerVolume');
        const thickEl = document.getElementById('thicknessRange');
        const priceEl = document.getElementById('priceRange');
        if (avgEl) avgEl.textContent = stats.avg_price_per_volume ? `₩${stats.avg_price_per_volume.toFixed(2)}` : '-';
        if (thickEl) thickEl.textContent = stats.thickness_range ? `${stats.thickness_range.min} - ${stats.thickness_range.max} cm` : '-';
        if (priceEl) priceEl.textContent = stats.price_range ? `₩${stats.price_range.min.toLocaleString()} - ₩${stats.price_range.max.toLocaleString()}` : '-';
        
        // Initialize view based on tab
        // No overview/comparison initialization in simplified UI
        // Heatmap is initialized separately when tab is shown
        
        // Update thickness ranges based on product type
        updateThicknessRanges(productType);
        
        // Set thickness range sliders based on product type
        if (stats.thickness_range) {
            const minThickness = stats.thickness_range.min;
            const maxThickness = stats.thickness_range.max;
            const minEl = document.getElementById('thicknessMin');
            const minValEl = document.getElementById('thicknessMinValue');
            const maxEl = document.getElementById('thicknessMax');
            const maxValEl = document.getElementById('thicknessMaxValue');
            if (minEl && minValEl && maxEl && maxValEl) {
                minEl.min = minThickness;
                minEl.max = maxThickness;
                minEl.value = minThickness;
                minValEl.textContent = minThickness;
                maxEl.min = minThickness;
                maxEl.max = maxThickness;
                maxEl.value = maxThickness;
                maxValEl.textContent = maxThickness;
            }
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            tab: tab,
            productType: productType
        });
        alert('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
        showLoading(false);
    }
}

// Initialize overview chart
function initializeOverviewChart() {
    // Check if chart already exists
    if (!document.getElementById('overviewChart')) {
        console.warn('Overview chart canvas not found');
        return;
    }
    
    // Check if data is available
    if (!allData || allData.length === 0) {
        console.warn('No data available for overview chart');
        return;
    }
    
    // Competitor color mapping
    const competitorColors = {
        '따사룸': 'rgba(255, 99, 132, 0.8)',
        '리포소홈': 'rgba(54, 162, 235, 0.8)',
        '티지오매트': 'rgba(255, 206, 86, 0.8)',
        '파크론': 'rgba(75, 192, 192, 0.8)',
        '에코폼': 'rgba(153, 102, 255, 0.8)',
        '크림하우스': 'rgba(255, 159, 64, 0.8)',
        '리코코': 'rgba(255, 20, 147, 0.8)'
    };
    
    // Check if this is pet mat data
    const productTypeSelect = document.getElementById('productTypeSelect');
    const isPetMat = productTypeSelect && productTypeSelect.value === 'pet';
    
    // Group data by competitor
    const competitorData = {};
    allData.forEach(item => {
        if (!competitorData[item.Competitor]) {
            competitorData[item.Competitor] = [];
        }
        
        // For pet mats, calculate price based on 50cm standard
        if (isPetMat && typeof calculatePetPricePerUnit === 'function') {
            const standardPrice = calculatePetPricePerUnit(
                item.Price,
                item.Width_cm || 110,
                item.Length_cm || 100,
                item.Thickness_cm
            );
            competitorData[item.Competitor].push(standardPrice);
        } else {
            competitorData[item.Competitor].push(item.Price_per_Volume);
        }
    });
    
    // Calculate average price per volume for each competitor
    const labels = Object.keys(competitorData);
    const avgPrices = labels.map(competitor => {
        const prices = competitorData[competitor];
        return prices.reduce((a, b) => a + b, 0) / prices.length;
    });
    
    // Generate colors for each competitor
    const backgroundColors = labels.map(label => 
        competitorColors[label] || 'rgba(128, 128, 128, 0.8)'
    );
    const borderColors = labels.map(label => 
        (competitorColors[label] || 'rgba(128, 128, 128, 0.8)').replace('0.8', '1')
    );
    
    // Destroy existing chart if it exists
    if (charts.overview) {
        charts.overview.destroy();
    }
    
    // Create chart
    const ctx = document.getElementById('overviewChart').getContext('2d');
    charts.overview = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '평균 가격/부피 (₩/cm³)',
                data: avgPrices,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: '경쟁사별 평균 가격 경쟁력',
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '가격/부피 (₩/cm³)'
                    }
                }
            }
        }
    });
}

// Initialize comparison chart
function initializeComparisonChart() {
    // Check if chart canvas exists
    if (!document.getElementById('comparisonChart')) {
        console.warn('Comparison chart canvas not found');
        return;
    }
    
    // Destroy existing chart if it exists
    if (charts.comparison) {
        charts.comparison.destroy();
    }
    
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    // Define colors for each competitor
    const competitorColors = {
        '따사룸': 'rgba(255, 99, 132, 0.8)',
        '리포소홈': 'rgba(54, 162, 235, 0.8)',
        '티지오매트': 'rgba(255, 206, 86, 0.8)',
        '파크론': 'rgba(75, 192, 192, 0.8)',
        '에코폼': 'rgba(153, 102, 255, 0.8)',
        '크림하우스': 'rgba(255, 159, 64, 0.8)',
        '리코코': 'rgba(255, 20, 147, 0.8)'
    };
    
    const competitorBorderColors = {
        '따사룸': 'rgba(255, 99, 132, 1)',
        '리포소홈': 'rgba(54, 162, 235, 1)',
        '티지오매트': 'rgba(255, 206, 86, 1)',
        '파크론': 'rgba(75, 192, 192, 1)',
        '에코폼': 'rgba(153, 102, 255, 1)',
        '크림하우스': 'rgba(255, 159, 64, 1)'
    };
    
    charts.comparison = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '평균 가격/부피',
                data: [],
                backgroundColor: [],
                borderColor: [],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeOutQuart',
                x: false
            },
            plugins: {
                title: {
                    display: true,
                    text: '선택한 두께 범위의 경쟁사 비교',
                    font: {
                        size: 18,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '가격/부피 (₩/cm³)'
                    }
                }
            }
        }
    });
    
    // Initial update
    updateComparison();
}

// Update comparison chart
async function updateComparison() {
    const minThickness = parseFloat(document.getElementById('thicknessMin').value);
    const maxThickness = parseFloat(document.getElementById('thicknessMax').value);
    const productTypeSelect = document.getElementById('comparisonProductTypeSelect');
    const productType = productTypeSelect ? productTypeSelect.value : 'roll';
    
    // Update thickness ranges if product type is pet
    if (typeof updateThicknessRanges === 'function') {
        updateThicknessRanges(productType);
    }
    
    // Check if product type changed for this tab
    if (productType !== tabProductTypes.comparison) {
        tabProductTypes.comparison = productType;
        // Reload data with new product type
        await loadData('comparison', productType);
    }
    
    // Update display values
    document.getElementById('thicknessMinValue').textContent = minThickness;
    document.getElementById('thicknessMaxValue').textContent = maxThickness;
    
    // Define colors for each competitor
    const competitorColors = {
        '따사룸': 'rgba(255, 99, 132, 0.8)',
        '리포소홈': 'rgba(54, 162, 235, 0.8)',
        '티지오매트': 'rgba(255, 206, 86, 0.8)',
        '파크론': 'rgba(75, 192, 192, 0.8)',
        '에코폼': 'rgba(153, 102, 255, 0.8)',
        '크림하우스': 'rgba(255, 159, 64, 0.8)',
        '리코코': 'rgba(255, 20, 147, 0.8)'
    };
    
    const competitorBorderColors = {
        '따사룸': 'rgba(255, 99, 132, 1)',
        '리포소홈': 'rgba(54, 162, 235, 1)',
        '티지오매트': 'rgba(255, 206, 86, 1)',
        '파크론': 'rgba(75, 192, 192, 1)',
        '에코폼': 'rgba(153, 102, 255, 1)',
        '크림하우스': 'rgba(255, 159, 64, 1)'
    };
    
    try {
        const params = new URLSearchParams();
        params.append('thickness_min', minThickness);
        params.append('thickness_max', maxThickness);
        if (productType) params.append('product_type', productType);
        
        const response = await fetch(`/api/price-comparison?${params.toString()}`);
        const data = await response.json();
        
        const labels = Object.keys(data);
        const values = Object.values(data);
        
        // Create color arrays based on competitor names
        const backgroundColors = labels.map(label => 
            competitorColors[label] || 'rgba(128, 128, 128, 0.8)'
        );
        const borderColors = labels.map(label => 
            competitorBorderColors[label] || 'rgba(128, 128, 128, 1)'
        );
        
        // Update chart
        charts.comparison.data.labels = labels;
        charts.comparison.data.datasets[0].data = values;
        charts.comparison.data.datasets[0].backgroundColor = backgroundColors;
        charts.comparison.data.datasets[0].borderColor = borderColors;
        charts.comparison.update();
        
    } catch (error) {
        console.error('Error updating comparison:', error);
    }
}

// Initialize data table (deprecated - details tab removed)
function initializeDataTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) {
        console.log('Data table not found - details tab has been removed');
        return;
    }
    
    tableBody.innerHTML = '';
    
    filteredData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.Competitor}</td>
            <td>${item.Design}</td>
            <td>${item.Thickness_cm.toFixed(1)}</td>
            <td>${item.Width_cm.toFixed(0)}</td>
            <td>${item.Length_cm.toFixed(0)}</td>
            <td>₩${item.Price.toLocaleString()}</td>
            <td>₩${item.Price_per_Volume.toFixed(2)}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Initialize filters
async function initializeFilters() {
    try {
        const response = await fetch('/api/competitors');
        const competitors = await response.json();
        
        const select = document.getElementById('competitorFilter');
        if (!select) {
            console.log('Competitor filter not found - details tab has been removed');
            return;
        }
        
        competitors.forEach(competitor => {
            const option = document.createElement('option');
            option.value = competitor;
            option.textContent = competitor;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading competitors:', error);
    }
}

// Tab switching
function showTab(tabName) {
    // Update sidebar buttons
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the clicked button
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${tabName}'`)) {
            btn.classList.add('active');
        }
    });
    
    // Update tab panes
    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(pane => pane.classList.remove('active'));
    const targetPane = document.getElementById(tabName);
    if (!targetPane) return; // Gracefully exit if pane doesn't exist on this page
    targetPane.classList.add('active');
    
    currentTab = tabName;
    
    // Load data for the selected tab with its saved product type
    if (tabName === 'heatmap') {
        const productType = tabProductTypes.heatmap;
        const select = document.getElementById('heatmapProductTypeSelect');
        if (select) select.value = productType;
        loadData('heatmap', productType).then(() => {
            createHeatmap();
        });
    }
}

// Create heatmap
function createHeatmap() {
    const container = document.getElementById('heatmapContainer');
    container.innerHTML = '';
    
    // Add controls
    const controlDiv = document.createElement('div');
    controlDiv.style.marginBottom = '20px';
    controlDiv.innerHTML = `
        <div style="margin-bottom: 15px;">
            <label style="margin-right: 10px;">보기 모드:</label>
            <select id="heatmapViewMode" style="padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; margin-right: 20px;">
                <option value="all-competitors">전체 경쟁사 가격 비교</option>
                <option value="side-by-side">경쟁사별 비교</option>
                <option value="combined">통합 평균</option>
                <option value="single">개별 경쟁사</option>
            </select>
            
            <label style="margin-right: 10px;">그리드 크기:</label>
            <select id="heatmapGridSize" style="padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;">
                <option value="all">전체 표시</option>
                <option value="5">5x5</option>
                <option value="8">8x8</option>
                <option value="10">10x10</option>
            </select>
        </div>
        
        <div id="competitorSelectDiv" style="margin-bottom: 15px; display: none;">
            <label style="margin-right: 10px;">경쟁사 선택:</label>
            <button onclick="selectAllCompetitors(true)" style="padding: 6px 12px; margin-right: 10px; border: 1px solid #e5e7eb; border-radius: 6px; background: white; cursor: pointer; font-size: 13px; transition: all 0.2s;" 
                    onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">
                <i class="fas fa-check-square"></i> 전체 선택
            </button>
            <button onclick="selectAllCompetitors(false)" style="padding: 6px 12px; margin-right: 15px; border: 1px solid #e5e7eb; border-radius: 6px; background: white; cursor: pointer; font-size: 13px; transition: all 0.2s;"
                    onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='white'">
                <i class="fas fa-square"></i> 모두 해제
            </button>
            <div id="competitorCheckboxes" style="display: inline-block;"></div>
        </div>
    `;
    container.appendChild(controlDiv);
    
    // Populate competitor checkboxes based on current data
    populateHeatmapCompetitorCheckboxes();
    
    // Add change listeners
    document.getElementById('heatmapViewMode').addEventListener('change', function() {
        const viewMode = this.value;
        const competitorSelectDiv = document.getElementById('competitorSelectDiv');
        // Show competitor selection for all modes except combined
        if (viewMode === 'combined') {
            competitorSelectDiv.style.display = 'none';
        } else {
            competitorSelectDiv.style.display = 'block';
        }
        updateHeatmap();
    });
    document.getElementById('heatmapGridSize').addEventListener('change', updateHeatmap);
    
    // Create heatmap container
    const heatmapDiv = document.createElement('div');
    heatmapDiv.id = 'heatmapContent';
    container.appendChild(heatmapDiv);
    
    // Show competitor selection for initial view
    const initialViewMode = document.getElementById('heatmapViewMode').value;
    if (initialViewMode !== 'combined') {
        document.getElementById('competitorSelectDiv').style.display = 'block';
    }
    
    // Initial heatmap
    updateHeatmap();
}

async function updateHeatmap() {
    const viewMode = document.getElementById('heatmapViewMode').value;
    const gridSize = document.getElementById('heatmapGridSize').value;
    const heatmapContent = document.getElementById('heatmapContent');
    const productTypeSelect = document.getElementById('heatmapProductTypeSelect');
    const productType = productTypeSelect ? productTypeSelect.value : 'roll';
    
    // Check if product type changed for this tab
    if (productType !== tabProductTypes.heatmap) {
        tabProductTypes.heatmap = productType;
        // Reload data with new product type
        await loadData('heatmap', productType);
        // Repopulate competitor checkboxes with new data
        populateHeatmapCompetitorCheckboxes();
        // Call updateHeatmap again with new data
        updateHeatmap();
        return;
    }
    
    heatmapContent.innerHTML = '';
    
    // Get selected competitors
    const selectedCompetitors = [];
    document.querySelectorAll('#competitorCheckboxes input:checked').forEach(cb => {
        selectedCompetitors.push(cb.value);
    });
    
    // Check if any competitors are selected
    if (selectedCompetitors.length === 0) {
        heatmapContent.innerHTML = '<p>최소 하나의 경쟁사를 선택해주세요.</p>';
        return;
    }
    
    // Filter data based on selected competitors and product type
    let displayData = allData.filter(d => selectedCompetitors.includes(d.Competitor));
    
    // Apply product type filter
    if (productType) {
        displayData = displayData.filter(d => {
            // Check if product belongs to selected type based on category
            if (productType === 'roll') {
                return d.product_category && d.product_category.includes('롤매트');
            } else if (productType === 'puzzle') {
                return d.product_category && d.product_category.includes('퍼즐매트');
            } else if (productType === 'pet') {
                return d.product_category && d.product_category.includes('강아지매트');
            }
            return true;
        });
    }
    
    if (displayData.length === 0) {
        heatmapContent.innerHTML = '<p>데이터가 없습니다.</p>';
        return;
    }
    
    // Get dimensions and apply grid size if needed
    let uniqueThicknesses = [...new Set(allData.map(d => d.Thickness_cm))].sort((a, b) => a - b);
    let uniqueWidths = [...new Set(allData.map(d => d.Width_cm))].sort((a, b) => a - b);
    
    if (gridSize !== 'all') {
        const size = parseInt(gridSize);
        const thicknessStep = Math.ceil(uniqueThicknesses.length / size);
        const widthStep = Math.ceil(uniqueWidths.length / size);
        uniqueThicknesses = uniqueThicknesses.filter((_, i) => i % thicknessStep === 0).slice(0, size);
        uniqueWidths = uniqueWidths.filter((_, i) => i % widthStep === 0).slice(0, size);
    }
    
    if (viewMode === 'all-competitors') {
        createAllCompetitorsHeatmap(displayData, uniqueThicknesses, uniqueWidths);
    } else if (viewMode === 'side-by-side') {
        createSideBySideHeatmaps(displayData, selectedCompetitors, uniqueThicknesses, uniqueWidths);
    } else if (viewMode === 'combined') {
        createCombinedHeatmap(displayData, uniqueThicknesses, uniqueWidths);
    } else {
        createSingleHeatmap(displayData, uniqueThicknesses, uniqueWidths);
    }
}

// Create heatmap showing all competitors' prices in each cell
function createAllCompetitorsHeatmap(data, thicknesses, widths) {
    const container = document.getElementById('heatmapContent');
    
    // Check product type for display title
    const productTypeSelect = document.getElementById('heatmapProductTypeSelect');
    const productType = productTypeSelect ? productTypeSelect.value : 'roll';
    const isPetMat = productType === 'pet';
    const isPuzzle = productType === 'puzzle';
    
    const title = document.createElement('h3');
    if (isPuzzle) {
        title.textContent = '전체 경쟁사 가격 비교 (100x100cm 기준)';
    } else if (isPetMat) {
        title.textContent = '전체 경쟁사 가격 비교 (110x50cm 기준)';
    } else {
        title.textContent = '전체 경쟁사 가격 비교 (50cm 기준)';
    }
    title.style.textAlign = 'center';
    title.style.marginBottom = '10px';
    container.appendChild(title);
    
    // Create product map grouped by thickness/width
    const productMap = {};
    const cellAverages = {}; // Store average price per volume for each cell
    
    data.forEach(product => {
        const key = `${product.Thickness_cm}_${product.Width_cm}`;
        if (!productMap[key]) {
            productMap[key] = [];
            cellAverages[key] = [];
        }
        // Calculate display price based on product type
        let displayPrice;
        if (isPuzzle) {
            // For puzzle mats, show price as-is (already 100x100)
            displayPrice = product.Price;
        } else if (isPetMat) {
            // For pet mats, show price for standard 110x50cm unit
            if (typeof calculatePetPricePerUnit === 'function') {
                displayPrice = product.Price; // Already normalized to unit price
            } else {
                displayPrice = (product.Price / product.Length_cm) * 50;
            }
        } else {
            // For roll mats, calculate price per 50cm
            displayPrice = (product.Price / product.Length_cm) * 50;
        }
        
        productMap[key].push({
            competitor: product.Competitor,
            displayPrice: displayPrice,
            originalPrice: product.Price,
            length: product.Length_cm,
            pricePerVolume: product.Price_per_Volume
        });
        cellAverages[key].push(product.Price_per_Volume);
    });
    
    // Calculate average price per volume for each cell
    Object.keys(cellAverages).forEach(key => {
        const prices = cellAverages[key];
        cellAverages[key] = prices.reduce((a, b) => a + b, 0) / prices.length;
    });
    
    // Sort products in each cell by price
    Object.keys(productMap).forEach(key => {
        productMap[key].sort((a, b) => a.pricePerVolume - b.pricePerVolume);
    });
    
    // Find global min/max for cell background color scale (based on cell averages)
    const allCellAverages = Object.values(cellAverages);
    const minCellAvg = Math.min(...allCellAverages);
    const maxCellAvg = Math.max(...allCellAverages);
    const cellAvgRange = maxCellAvg - minCellAvg;
    
    // Create table
    const table = document.createElement('table');
    table.className = 'heatmap-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '11px';
    table.style.tableLayout = 'fixed';
    
    // Header row
    const headerRow = document.createElement('tr');
    const cornerCell = document.createElement('th');
    cornerCell.style.padding = '8px';
    cornerCell.style.border = '1px solid #e5e7eb';
    cornerCell.style.backgroundColor = '#f9fafb';
    cornerCell.style.fontSize = '11px';
    cornerCell.innerHTML = '두께/너비';
    headerRow.appendChild(cornerCell);
    
    // Width headers
    widths.forEach(width => {
        const th = document.createElement('th');
        th.style.padding = '12px 8px';
        th.style.border = '1px solid #e5e7eb';
        th.style.backgroundColor = '#f9fafb';
        th.style.fontWeight = 'bold';
        th.style.fontSize = '11px';
        th.style.minWidth = '90px';
        th.textContent = `${width}cm`;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    // Data rows
    thicknesses.forEach(thickness => {
        const row = document.createElement('tr');
        
        // Thickness label
        const thicknessCell = document.createElement('th');
        thicknessCell.style.padding = '8px';
        thicknessCell.style.border = '1px solid #e5e7eb';
        thicknessCell.style.backgroundColor = '#f9fafb';
        thicknessCell.style.fontWeight = 'bold';
        thicknessCell.style.fontSize = '11px';
        thicknessCell.textContent = `${thickness}cm`;
        row.appendChild(thicknessCell);
        
        // Data cells
        widths.forEach(width => {
            const cell = document.createElement('td');
            cell.style.padding = '10px';
            cell.style.border = '1px solid #e5e7eb';
            cell.style.fontSize = '10px';
            cell.style.verticalAlign = 'top';
            
            const key = `${thickness}_${width}`;
            const products = productMap[key] || [];
            
            if (products.length > 0) {
                // Get cell average for background color
                const cellAvg = cellAverages[key];
                const cellIntensity = (cellAvg - minCellAvg) / cellAvgRange;
                
                // Color gradient: Green (cheap) -> Yellow -> Red (expensive)
                let r, g, b;
                if (cellIntensity < 0.5) {
                    // Green to Yellow
                    r = Math.round(255 * (cellIntensity * 2));
                    g = 255;
                    b = 0;
                } else {
                    // Yellow to Red
                    r = 255;
                    g = Math.round(255 * (2 - cellIntensity * 2));
                    b = 0;
                }
                
                cell.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
                
                // Create content showing all competitors with text color based on within-cell ranking
                let cellContent = '<div style="font-size: 11px; line-height: 1.3;">';
                
                // Get min/max price within this cell for text color scaling
                const cellPrices = products.map(p => p.pricePerVolume);
                const minCellPrice = Math.min(...cellPrices);
                const maxCellPrice = Math.max(...cellPrices);
                const cellPriceRange = maxCellPrice - minCellPrice;
                
                // Group by competitor and calculate averages
                const competitorData = {};
                products.forEach(product => {
                    if (!competitorData[product.competitor]) {
                        competitorData[product.competitor] = {
                            prices50cm: [],
                            pricesPerVolume: []
                        };
                    }
                    competitorData[product.competitor].prices50cm.push(product.displayPrice);
                    competitorData[product.competitor].pricesPerVolume.push(product.pricePerVolume);
                });
                
                // Calculate averages and prepare display data
                const competitorAvgs = Object.entries(competitorData).map(([comp, data]) => ({
                    competitor: comp,
                    avgPrice50cm: data.prices50cm.reduce((a, b) => a + b, 0) / data.prices50cm.length,
                    avgPricePerVolume: data.pricesPerVolume.reduce((a, b) => a + b, 0) / data.pricesPerVolume.length
                }));
                
                // Sort by price per volume for display order
                competitorAvgs.sort((a, b) => a.avgPricePerVolume - b.avgPricePerVolume);
                
                // Display all competitors with color coding
                competitorAvgs.forEach((item, idx) => {
                    const priceStr = Math.round(item.avgPrice50cm).toLocaleString();
                    
                    // Calculate text color based on position within cell
                    const pricePosition = (item.avgPricePerVolume - minCellPrice) / (cellPriceRange || 1);
                    let textColor;
                    if (pricePosition < 0.33) {
                        textColor = '#2563eb'; // Blue for cheap
                    } else if (pricePosition < 0.67) {
                        textColor = '#374151'; // Gray for middle
                    } else {
                        textColor = '#dc2626'; // Red for expensive
                    }
                    
                    const fontWeight = idx === 0 ? 'bold' : 'normal';
                    cellContent += `<div style="color: ${textColor}; font-weight: ${fontWeight};">`;
                    cellContent += `${item.competitor}: ₩${priceStr}`;
                    cellContent += `</div>`;
                });
                
                cellContent += '</div>';
                cell.innerHTML = cellContent;
                
                // Hover tooltip with all products
                let tooltipText = `두께: ${thickness}cm, 너비: ${width}cm\n\n`;
                tooltipText += isPuzzle ? '100x100cm 기준 가격:\n' : '50cm 기준 가격:\n';
                products.forEach((product, idx) => {
                    tooltipText += `${idx + 1}. ${product.competitor}: ₩${Math.round(product.displayPrice).toLocaleString()} `;
                    if (!isPuzzle) {
                        tooltipText += `(원래: ${product.length}cm = ₩${product.originalPrice.toLocaleString()})`;
                    }
                    tooltipText += '\n';
                });
                
                cell.title = tooltipText;
                
            } else {
                cell.style.backgroundColor = '#f9fafb';
                cell.innerHTML = '-';
            }
            
            row.appendChild(cell);
        });
        
        table.appendChild(row);
    });
    
    container.appendChild(table);
    
    // Add legend
    const legend = document.createElement('div');
    legend.style.marginTop = '20px';
    legend.innerHTML = `
        <div style="margin-bottom: 15px;">
            <strong>셀 배경색 (시장 전체 기준)</strong>
            <div style="display: flex; align-items: center; gap: 20px; margin-top: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; background: rgba(0, 255, 0, 0.3); border: 1px solid #ddd;"></div>
                    <span>저렴한 스펙</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; background: rgba(255, 255, 0, 0.3); border: 1px solid #ddd;"></div>
                    <span>중간 가격 스펙</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; background: rgba(255, 0, 0, 0.3); border: 1px solid #ddd;"></div>
                    <span>비싼 스펙</span>
                </div>
            </div>
        </div>
        <div style="margin-bottom: 15px;">
            <strong>텍스트 색상 (셀 내부 경쟁)</strong>
            <div style="display: flex; align-items: center; gap: 20px; margin-top: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #2563eb; font-weight: bold;">● 파란색</span>
                    <span>해당 스펙 내 저렴한 브랜드</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #374151; font-weight: bold;">● 회색</span>
                    <span>중간 가격 브랜드</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #dc2626; font-weight: bold;">● 빨간색</span>
                    <span>해당 스펙 내 비싼 브랜드</span>
                </div>
            </div>
        </div>
        <p style="color: #6b7280; font-size: 12px;">
            • 배경색: 해당 두께/너비 조합이 시장 전체에서 어느 가격대인지 표시<br>
            • 텍스트 색상: 같은 스펙 내에서 각 브랜드의 가격 경쟁력 표시<br>
            • 표시 가격은 50cm 기준으로 정규화된 가격입니다
        </p>
    `;
    container.appendChild(legend);
}

function createSideBySideHeatmaps(data, competitors, thicknesses, widths) {
    const container = document.getElementById('heatmapContent');
    
    // Title with VS
    const vsTitle = document.createElement('h3');
    vsTitle.style.textAlign = 'center';
    vsTitle.style.marginBottom = '20px';
    vsTitle.style.fontSize = '18px';
    
    if (competitors.length >= 2) {
        vsTitle.innerHTML = `<span style="color: #2563eb;">${competitors[0]}</span> <span style="color: #6b7280;">VS</span> <span style="color: #dc2626;">${competitors[1]}</span>`;
    } else if (competitors.length === 1) {
        vsTitle.innerHTML = `<span style="color: #2563eb;">${competitors[0]}</span> 단독 분석`;
    }
    container.appendChild(vsTitle);
    
    // Create grid container
    const gridDiv = document.createElement('div');
    gridDiv.style.display = 'grid';
    gridDiv.style.gridTemplateColumns = competitors.length >= 2 ? 'repeat(2, 1fr)' : '1fr';
    gridDiv.style.gap = '30px';
    gridDiv.style.position = 'relative';
    container.appendChild(gridDiv);
    
    // Add VS divider if comparing 2 competitors
    if (competitors.length >= 2) {
        const vsDivider = document.createElement('div');
        vsDivider.style.position = 'absolute';
        vsDivider.style.left = '50%';
        vsDivider.style.top = '50%';
        vsDivider.style.transform = 'translate(-50%, -50%)';
        vsDivider.style.width = '60px';
        vsDivider.style.height = '60px';
        vsDivider.style.backgroundColor = 'white';
        vsDivider.style.border = '3px solid #e5e7eb';
        vsDivider.style.borderRadius = '50%';
        vsDivider.style.display = 'flex';
        vsDivider.style.alignItems = 'center';
        vsDivider.style.justifyContent = 'center';
        vsDivider.style.fontSize = '20px';
        vsDivider.style.fontWeight = 'bold';
        vsDivider.style.color = '#6b7280';
        vsDivider.style.zIndex = '10';
        vsDivider.textContent = 'VS';
        gridDiv.appendChild(vsDivider);
    }
    
    // Create heatmap for each selected competitor
    competitors.slice(0, 2).forEach((competitor, index) => {
        const competitorData = data.filter(d => d.Competitor === competitor);
        const heatmapDiv = document.createElement('div');
        heatmapDiv.style.padding = '20px';
        heatmapDiv.style.backgroundColor = 'white';
        heatmapDiv.style.borderRadius = '12px';
        heatmapDiv.style.border = `2px solid ${index === 0 ? '#2563eb' : '#dc2626'}`;
        heatmapDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        
        // Title with color coding
        const title = document.createElement('h4');
        title.textContent = competitor;
        title.style.textAlign = 'center';
        title.style.marginBottom = '15px';
        title.style.color = index === 0 ? '#2563eb' : '#dc2626';
        title.style.fontSize = '16px';
        title.style.fontWeight = 'bold';
        heatmapDiv.appendChild(title);
        
        // Create heatmap table
        const table = createHeatmapTable(competitorData, thicknesses, widths, true);
        heatmapDiv.appendChild(table);
        
        // Add stats with better styling
        const avgPrice = competitorData.reduce((sum, p) => sum + p.Price_per_Volume, 0) / competitorData.length;
        const stats = document.createElement('div');
        stats.style.textAlign = 'center';
        stats.style.marginTop = '15px';
        stats.style.padding = '10px';
        stats.style.backgroundColor = '#f9fafb';
        stats.style.borderRadius = '8px';
        stats.style.fontSize = '13px';
        
        // Add winner badge if this is the cheaper one
        let winnerBadge = '';
        if (competitors.length >= 2) {
            const otherCompetitor = competitors[1 - index];
            const otherData = data.filter(d => d.Competitor === otherCompetitor);
            const otherAvgPrice = otherData.reduce((sum, p) => sum + p.Price_per_Volume, 0) / otherData.length;
            
            if (avgPrice < otherAvgPrice) {
                winnerBadge = ' <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">👑 더 저렴</span>';
            }
        }
        
        stats.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">평균 가격: ₩${avgPrice.toFixed(2)}/cm³${winnerBadge}</div>
            <div style="color: #6b7280;">제품 수: ${competitorData.length}개</div>
        `;
        heatmapDiv.appendChild(stats);
        
        gridDiv.appendChild(heatmapDiv);
    });
    
    // Add comparison legend
    if (competitors.length >= 2) {
        const comparisonNote = document.createElement('div');
        comparisonNote.style.marginTop = '20px';
        comparisonNote.style.padding = '15px';
        comparisonNote.style.backgroundColor = '#f3f4f6';
        comparisonNote.style.borderRadius = '8px';
        comparisonNote.style.textAlign = 'center';
        comparisonNote.innerHTML = `
            <p style="font-size: 13px; color: #374151;">
                💡 같은 두께/너비 스펙에서 더 밝은 색상일수록 저렴한 가격대입니다
            </p>
        `;
        container.appendChild(comparisonNote);
    }
    
    addHeatmapLegend();
}

function createCombinedHeatmap(data, thicknesses, widths) {
    const container = document.getElementById('heatmapContent');
    
    const title = document.createElement('h3');
    title.textContent = '전체 평균 가격';
    title.style.textAlign = 'center';
    title.style.marginBottom = '10px';
    container.appendChild(title);
    
    const table = createHeatmapTable(data, thicknesses, widths, false);
    container.appendChild(table);
    
    addHeatmapLegend();
}

function createSingleHeatmap(data, thicknesses, widths) {
    const container = document.getElementById('heatmapContent');
    const table = createHeatmapTable(data, thicknesses, widths, false);
    container.appendChild(table);
    
    addHeatmapLegend();
}

function createHeatmapTable(data, thicknesses, widths, showCompetitorInfo) {
    // Calculate min/max for consistent color scale
    const allPrices = data.map(d => d.Price_per_Volume);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    
    // Create product map
    const productMap = {};
    data.forEach(product => {
        const key = `${product.Thickness_cm}_${product.Width_cm}`;
        if (!productMap[key]) {
            productMap[key] = [];
        }
        productMap[key].push(product);
    });
    
    // Create table
    const table = document.createElement('table');
    table.className = 'heatmap-table';
    table.style.width = 'auto';
    table.style.minWidth = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';
    
    // Header row
    const headerRow = document.createElement('tr');
    const cornerCell = document.createElement('th');
    cornerCell.style.padding = '8px';
    cornerCell.style.border = '1px solid #e5e7eb';
    cornerCell.style.backgroundColor = '#f9fafb';
    cornerCell.style.fontSize = '11px';
    cornerCell.innerHTML = '두께/너비';
    headerRow.appendChild(cornerCell);
    
    // Width headers
    widths.forEach(width => {
        const th = document.createElement('th');
        th.style.padding = '12px 8px';
        th.style.border = '1px solid #e5e7eb';
        th.style.backgroundColor = '#f9fafb';
        th.style.fontWeight = 'bold';
        th.style.fontSize = '11px';
        th.style.minWidth = '90px';
        th.textContent = `${width}cm`;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    // Data rows
    thicknesses.forEach(thickness => {
        const row = document.createElement('tr');
        
        // Thickness label
        const thicknessCell = document.createElement('th');
        thicknessCell.style.padding = '8px';
        thicknessCell.style.border = '1px solid #e5e7eb';
        thicknessCell.style.backgroundColor = '#f9fafb';
        thicknessCell.style.fontWeight = 'bold';
        thicknessCell.style.fontSize = '11px';
        thicknessCell.textContent = `${thickness}cm`;
        row.appendChild(thicknessCell);
        
        // Data cells
        widths.forEach(width => {
            const cell = document.createElement('td');
            cell.style.padding = '12px 8px';
            cell.style.border = '1px solid #e5e7eb';
            cell.style.textAlign = 'center';
            cell.style.fontSize = '11px';
            cell.style.minWidth = '90px';
            cell.style.whiteSpace = 'nowrap';
            
            const key = `${thickness}_${width}`;
            const products = productMap[key] || [];
            
            if (products.length > 0) {
                // Calculate average price per volume
                const avgPricePerVolume = products.reduce((sum, p) => sum + p.Price_per_Volume, 0) / products.length;
                
                // Calculate color intensity (0-1)
                const intensity = (avgPricePerVolume - minPrice) / priceRange;
                
                // Color gradient: Green (cheap) -> Yellow -> Red (expensive)
                let r, g, b;
                if (intensity < 0.5) {
                    // Green to Yellow
                    r = Math.round(255 * (intensity * 2));
                    g = 255;
                    b = 0;
                } else {
                    // Yellow to Red
                    r = 255;
                    g = Math.round(255 * (2 - intensity * 2));
                    b = 0;
                }
                
                cell.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
                
                // Show content based on mode
                // Show content based on mode
                if (showCompetitorInfo && products.length === 1) {
                    // Single competitor mode - show price
                    cell.innerHTML = `
                        <div>₩${avgPricePerVolume.toFixed(1)}</div>
                        <div style="font-size: 9px; color: #6b7280;">${products.length}개</div>
                    `;
                } else {
                    // Combined mode - show average and count
                    cell.innerHTML = `
                        <div>₩${avgPricePerVolume.toFixed(1)}</div>
                        <div style="font-size: 9px; color: #6b7280;">${products.length}개</div>
                    `;
                }
                
                // Hover tooltip
                const competitorCounts = {};
                products.forEach(p => {
                    competitorCounts[p.Competitor] = (competitorCounts[p.Competitor] || 0) + 1;
                });
                
                cell.title = `평균: ₩${avgPricePerVolume.toFixed(2)}/cm³\n` +
                           `제품 수: ${products.length}개\n` +
                           Object.entries(competitorCounts).map(([comp, count]) => 
                               `${comp}: ${count}개`).join('\n');
                
            } else {
                cell.style.backgroundColor = '#f9fafb';
                cell.innerHTML = '-';
            }
            
            row.appendChild(cell);
        });
        
        table.appendChild(row);
    });
    
    return table;
}

// Add color legend below heatmaps
function addHeatmapLegend() {
    const container = document.getElementById('heatmapContent');
    const legend = document.createElement('div');
    legend.style.marginTop = '20px';
    legend.innerHTML = `
        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 20px; height: 20px; background: rgba(0, 255, 0, 0.3); border: 1px solid #ddd;"></div>
                <span>낮은 가격</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 20px; height: 20px; background: rgba(255, 255, 0, 0.3); border: 1px solid #ddd;"></div>
                <span>중간 가격</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 20px; height: 20px; background: rgba(255, 0, 0, 0.3); border: 1px solid #ddd;"></div>
                <span>높은 가격</span>
            </div>
        </div>
        <p style="color: #6b7280; font-size: 12px;">
            • 각 셀의 숫자는 cm³당 평균 가격(₩)을 나타냅니다<br>
            • 셀 색상은 해당 스펙의 시장 평균 가격을 나타냅니다<br>
            • 마우스를 올리면 상세 정보를 볼 수 있습니다
        </p>
    `;
    container.appendChild(legend);
}


// Filter table
document.getElementById('searchInput')?.addEventListener('input', filterTable);
document.getElementById('competitorFilter')?.addEventListener('change', filterTable);

function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedCompetitor = document.getElementById('competitorFilter').value;
    
    filteredData = allData.filter(item => {
        const matchesSearch = Object.values(item).some(value => 
            value.toString().toLowerCase().includes(searchTerm)
        );
        const matchesCompetitor = !selectedCompetitor || item.Competitor === selectedCompetitor;
        
        return matchesSearch && matchesCompetitor;
    });
    
    initializeDataTable();
}

// Sort table
let sortColumn = '';
let sortDirection = 'asc';

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    filteredData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    initializeDataTable();
}

// Export data
function exportData() {
    const csv = [
        ['경쟁사', '디자인', '두께(cm)', '너비(cm)', '길이(cm)', '가격', '가격/부피'],
        ...filteredData.map(item => [
            item.Competitor,
            item.Design,
            item.Thickness_cm,
            item.Width_cm,
            item.Length_cm,
            item.Price,
            item.Price_per_Volume
        ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'followscope_data.csv';
    link.click();
}

// Show/hide loading
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.toggle('active', show);
}

// Update thickness range display
document.getElementById('thicknessMin')?.addEventListener('input', function() {
    document.getElementById('thicknessMinValue').textContent = this.value;
});

document.getElementById('thicknessMax')?.addEventListener('input', function() {
    document.getElementById('thicknessMaxValue').textContent = this.value;
});

// Heatmap helper functions
function selectAllCompetitors(selectAll) {
    document.querySelectorAll('#competitorCheckboxes input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = selectAll;
    });
    updateHeatmap();
}

function populateHeatmapCompetitorCheckboxes() {
    const checkboxContainer = document.getElementById('competitorCheckboxes');
    if (!checkboxContainer) return;
    
    checkboxContainer.innerHTML = ''; // Clear existing checkboxes
    
    // Get unique competitors from current data (already filtered by product type)
    const uniqueCompetitors = [...new Set(allData.map(d => d.Competitor))].sort();
    uniqueCompetitors.forEach((comp, idx) => {
        const label = document.createElement('label');
        label.style.marginRight = '15px';
        label.innerHTML = `
            <input type="checkbox" value="${comp}" checked 
                   onchange="updateHeatmap()" style="margin-right: 5px;">
            ${comp}
        `;
        checkboxContainer.appendChild(label);
    });
}

// Quick Links Functions
function openCompetitorLink(competitor) {
    const competitorUrls = {
        '따사룸': 'https://brand.naver.com/ddasaroom/products/6092903705',
        '리포소홈': 'https://smartstore.naver.com/riposo-home/products/6780630733',
        '티지오매트': 'https://brand.naver.com/tgomat/products/6090395041',
        '파크론': 'https://brand.naver.com/parklonmall/products/4646409496',
        '크림하우스': 'https://brand.naver.com/creamhaus/products/4832575438',
        '에코폼': 'https://brand.naver.com/ecofoam/products/2329254496',
        '리코코': 'https://brand.naver.com/ggumbi/products/4076467254'
    };
    
    // Additional URLs for sub-brands
    const additionalUrls = {
        '따사룸(sub)': 'https://brand.naver.com/ddasaroom/products/6626596277',
        '파크론(sub)': 'https://brand.naver.com/parklonmall/products/8252124473'
    };
    
    if (competitorUrls[competitor]) {
        window.open(competitorUrls[competitor], '_blank');
    } else if (additionalUrls[competitor]) {
        window.open(additionalUrls[competitor], '_blank');
    } else {
        alert(`${competitor}의 링크가 설정되지 않았습니다.`);
    }
}

// Live Calendar Functions
function initializeCalendar() {
    renderCalendar();
    loadPromotionData();
}

function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });
    
    // Get first day of month and number of days
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    // Update month display
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    document.getElementById('currentMonth').textContent = `${year}년 ${monthNames[month]}`;
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        calendarGrid.appendChild(emptyDay);
    }
    
    // Get today's date
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const currentDay = today.getDate();
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        // Check if this is today
        if (isCurrentMonth && day === currentDay) {
            dayCell.classList.add('today');
        }
        
        dayCell.innerHTML = `<div class="calendar-day-number">${day}</div>`;
        
        // Check if this day has promotions
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayPromotions = promotionData.filter(p => p.date === dateStr);
        
        if (dayPromotions.length > 0) {
            dayCell.classList.add('has-promotion');
            
            // Sort promotions by time
            const sortedPromotions = dayPromotions.sort((a, b) => {
                const timeA = a.time || '00:00';
                const timeB = b.time || '00:00';
                return timeA.localeCompare(timeB);
            });
            
            // Show up to 8 promotions
            const maxDisplay = 8;
            const promotionsToShow = sortedPromotions.slice(0, maxDisplay);
            
            const promotionsHtml = promotionsToShow.map(p => {
                const time = p.time ? p.time.substring(0, 5) : '';
                // Remove brackets and clean up title
                let cleanTitle = p.title.replace(/^\[.*?\]\s*/, ''); // Remove [tags] at beginning
                // Truncate if too long
                if (cleanTitle.length > 25) {
                    cleanTitle = cleanTitle.substring(0, 25) + '...';
                }
                
                return `<div class="calendar-promotion-item">
                    <div class="promotion-line">
                        <span class="promotion-time">${time}</span>
                        <span class="promotion-brand"> ${p.competitor}</span>
                        <span class="promotion-title"> ${cleanTitle}</span>
                    </div>
                </div>`;
            }).join('');
            
            dayCell.innerHTML += promotionsHtml;
            
            // Add "more" indicator if there are more than 8 promotions
            if (dayPromotions.length > maxDisplay) {
                dayCell.innerHTML += `<div class="calendar-promotion-more">+${dayPromotions.length - maxDisplay}</div>`;
            }
            
            dayCell.title = dayPromotions.map(p => `${p.time || ''} ${p.competitor}: ${p.title}`).join('\n');
        }
        
        dayCell.onclick = () => showDayPromotions(dateStr);
        calendarGrid.appendChild(dayCell);
    }
}

function changeMonth(direction) {
    currentMonth.setMonth(currentMonth.getMonth() + direction);
    renderCalendar();
}

function showDayPromotions(date) {
    const dayPromotions = promotionData.filter(p => p.date === date);
    if (dayPromotions.length === 0) {
        alert('이 날짜에는 프로모션이 없습니다.');
        return;
    }
    
    let message = `${date} 프로모션:\n\n`;
    dayPromotions.forEach(p => {
        message += `${p.competitor}: ${p.title}\n`;
        if (p.description) message += `  ${p.description}\n`;
        message += '\n';
    });
    
    alert(message);
}

async function loadPromotionData() {
    try {
        const response = await fetch('/api/promotions');
        const rawData = await response.json();
        
        // Remove duplicates based on date, time, and competitor
        const seen = new Set();
        promotionData = rawData.filter(promotion => {
            const key = `${promotion.date}_${promotion.time}_${promotion.competitor}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
        
        console.log(`Loaded ${promotionData.length} unique promotions (${rawData.length - promotionData.length} duplicates removed)`);
        renderCalendar();
        analyzePatterns(); // Add pattern analysis
    } catch (error) {
        console.error('Error loading promotion data:', error);
    }
}

// Analyze live patterns
function analyzePatterns() {
    const patternContainer = document.getElementById('patternAnalysis');
    if (!patternContainer) return;
    
    // Analyze patterns by competitor
    const competitorPatterns = {};
    
    promotionData.forEach(promo => {
        if (!competitorPatterns[promo.competitor]) {
            competitorPatterns[promo.competitor] = {
                times: [],
                days: [],
                dates: [],
                totalCount: 0
            };
        }
        
        const pattern = competitorPatterns[promo.competitor];
        pattern.totalCount++;
        
        // Extract time
        if (promo.time) {
            pattern.times.push(promo.time);
        }
        
        // Extract day of week and date
        const date = new Date(promo.date);
        const dayOfWeek = date.getDay();
        pattern.days.push(dayOfWeek);
        pattern.dates.push(promo.date);
    });
    
    // Generate pattern cards
    let html = '';
    
    // Sort by total count (descending)
    const sortedCompetitors = Object.entries(competitorPatterns)
        .sort((a, b) => b[1].totalCount - a[1].totalCount);
    
    sortedCompetitors.forEach(([competitor, pattern]) => {
        // Find most common time slot
        const timeSlots = {};
        pattern.times.forEach(time => {
            const hour = parseInt(time.split(':')[0]);
            const slot = getTimeSlot(hour);
            timeSlots[slot] = (timeSlots[slot] || 0) + 1;
        });
        
        const mostCommonSlot = Object.entries(timeSlots)
            .sort((a, b) => b[1] - a[1])[0];
        
        // Find most common day
        const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
        pattern.days.forEach(day => dayCounts[day]++);
        const mostCommonDay = dayCounts.indexOf(Math.max(...dayCounts));
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        
        // Calculate average interval between lives
        let avgInterval = '분석 중';
        if (pattern.dates.length > 1) {
            // Sort dates
            const sortedDates = [...new Set(pattern.dates)].sort();
            const intervals = [];
            
            for (let i = 1; i < sortedDates.length; i++) {
                const date1 = new Date(sortedDates[i-1]);
                const date2 = new Date(sortedDates[i]);
                const diffDays = Math.floor((date2 - date1) / (1000 * 60 * 60 * 24));
                // Ignore consecutive days (likely multi-day events)
                if (diffDays > 2) intervals.push(diffDays);
            }
            
            if (intervals.length > 0) {
                const avgDays = Math.round(intervals.reduce((a, b) => a + b) / intervals.length);
                if (avgDays <= 7) {
                    avgInterval = `주 ${Math.round(7/avgDays)}회`;
                } else if (avgDays <= 10) {
                    avgInterval = '주 1회';
                } else if (avgDays <= 17) {
                    avgInterval = '격주';
                } else if (avgDays <= 35) {
                    avgInterval = '월 1회';
                } else {
                    avgInterval = '월 1회 미만';
                }
            } else if (sortedDates.length >= 2) {
                // All events are consecutive
                avgInterval = '집중 이벤트';
            }
        }
        
        html += `
            <div class="pattern-card">
                <h4>${competitor}</h4>
                <div class="pattern-stat">
                    <span class="pattern-label">총 라이브 횟수</span>
                    <span class="pattern-value">${pattern.totalCount}회</span>
                </div>
                <div class="pattern-stat">
                    <span class="pattern-label">선호 시간대</span>
                    <span class="pattern-value">${mostCommonSlot ? mostCommonSlot[0] : '패턴 없음'}</span>
                </div>
                <div class="pattern-stat">
                    <span class="pattern-label">선호 요일</span>
                    <span class="pattern-value">${dayNames[mostCommonDay]}요일</span>
                </div>
                <div class="pattern-stat">
                    <span class="pattern-label">평균 주기</span>
                    <span class="pattern-value">${avgInterval}</span>
                </div>
            </div>
        `;
    });
    
    patternContainer.innerHTML = html;
}

function getTimeSlot(hour) {
    if (hour >= 9 && hour < 12) return '오전 (9-12시)';
    if (hour >= 12 && hour < 15) return '점심 (12-15시)';
    if (hour >= 15 && hour < 18) return '오후 (15-18시)';
    if (hour >= 18 && hour < 21) return '저녁 (18-21시)';
    if (hour >= 21) return '밤 (21시 이후)';
    return '새벽/아침';
}

// Handle promotion file upload
document.getElementById('promotionFile')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('promotionUploadForm').submit();
    }
});

// Coupon Functions
let couponData = [];
let currentCouponFilter = 'all';
let currentCouponProductType = 'roll';

async function loadCouponData() {
    try {
        const response = await fetch('/api/coupons');
        couponData = await response.json();
        renderCoupons();
    } catch (error) {
        console.error('Error loading coupon data:', error);
    }
}

function renderCoupons() {
    const couponList = document.getElementById('couponList');
    if (!couponList) return;
    
    couponList.innerHTML = '';
    
    // Group coupons by competitor
    const couponsByCompetitor = {};
    const today = new Date().toISOString().split('T')[0];
    
    couponData.forEach(coupon => {
        // Check coupon status
        let status = 'active';
        if (coupon.start_date && coupon.start_date > today) {
            status = 'upcoming';
        } else if (coupon.end_date && coupon.end_date < today) {
            status = 'expired';
        }
        coupon.status = status;
        
        // Filter based on current filter
        if (currentCouponFilter !== 'all' && status !== currentCouponFilter) {
            return;
        }
        
        // Filter based on product type
        if (currentCouponProductType !== 'all') {
            // Determine product type from competitor name and coupon name
            let productType = 'roll'; // default
            
            // Check competitor name for specific product types
            if (coupon.competitor) {
                const competitorLower = coupon.competitor.toLowerCase();
                if (competitorLower.includes('펫') || 
                    competitorLower.includes('리포소펫') || 
                    competitorLower.includes('딩굴') ||
                    competitorLower.includes('로하우스')) {
                    productType = 'pet';
                }
            }
            
            // Check coupon name for specific product types
            if (coupon.coupon_name) {
                const couponLower = coupon.coupon_name.toLowerCase();
                if (couponLower.includes('퍼즐') || couponLower.includes('puzzle')) {
                    productType = 'puzzle';
                } else if (couponLower.includes('애견') || couponLower.includes('강아지') || couponLower.includes('펫') || couponLower.includes('도그')) {
                    productType = 'pet';
                }
            }
            
            // Override with product_category if specifically set and different from default
            if (coupon.product_category && coupon.product_category !== 'roll') {
                productType = coupon.product_category;
            }
            
            if (productType !== currentCouponProductType) {
                return;
            }
        }
        
        if (!couponsByCompetitor[coupon.competitor]) {
            couponsByCompetitor[coupon.competitor] = [];
        }
        couponsByCompetitor[coupon.competitor].push(coupon);
    });
    
    // Render coupons by competitor
    Object.entries(couponsByCompetitor).forEach(([competitor, coupons]) => {
        const section = document.createElement('div');
        section.className = 'competitor-coupon-section';
        
        // Separate regular coupons and card promotions
        const regularCoupons = coupons.filter(c => !c.type || c.type === '쿠폰');
        const cardPromotions = coupons.filter(c => c.type === '카드사 할인');
        
        const header = document.createElement('div');
        header.className = 'competitor-coupon-header';
        header.innerHTML = `
            <h3>${competitor}</h3>
            <span class="coupon-count">${coupons.length}개</span>
        `;
        section.appendChild(header);
        
        // Function to render a coupon card
        function renderCouponCard(coupon) {
            const card = document.createElement('div');
            card.className = 'coupon-card';
            
            const statusClass = coupon.status;
            const statusText = {
                'active': '진행중',
                'upcoming': '예정',
                'expired': '종료'
            }[coupon.status];
            
            // Different display for card promotions
            if (coupon.type === '카드사 할인') {
                card.innerHTML = `
                    <div class="coupon-header">
                        <h4 class="coupon-name">${coupon.coupon_name}</h4>
                        <span class="card-badge">카드사</span>
                    </div>
                    <p class="card-info"><i class="fas fa-credit-card"></i> 카드사 프로모션 진행중</p>
                `;
            } else {
                // Format min purchase amount
                let minPurchaseText = '';
                if (coupon.min_purchase) {
                    const minAmount = parseFloat(coupon.min_purchase.toString().replace(/[^0-9.]/g, ''));
                    if (minAmount > 0) {
                        minPurchaseText = `<p class="coupon-requirement"><i class="fas fa-check-circle"></i> ${minAmount.toLocaleString()}원 이상 구매시</p>`;
                    }
                }
                
                // Format max discount amount
                let maxDiscountText = '';
                if (coupon.max_discount) {
                    const maxAmount = parseFloat(coupon.max_discount.toString().replace(/[^0-9.]/g, ''));
                    if (maxAmount > 0) {
                        maxDiscountText = `<p class="coupon-limit"><i class="fas fa-exclamation-circle"></i> 최대 ${maxAmount.toLocaleString()}원 할인</p>`;
                    }
                }
                
                card.innerHTML = `
                    <div class="coupon-header">
                        <h4 class="coupon-name">${coupon.coupon_name}</h4>
                        <span class="discount-badge">${coupon.discount_rate || coupon.discount_amount || ''}</span>
                    </div>
                    ${minPurchaseText}
                    ${maxDiscountText}
                    <span class="coupon-status ${statusClass}">${statusText}</span>
                `;
            }
            
            return card;
        }
        
        // Regular coupons first
        if (regularCoupons.length > 0) {
            const regularGroup = document.createElement('div');
            regularGroup.className = 'coupon-group';
            regularGroup.innerHTML = '<h5 class="coupon-group-title">일반 쿠폰</h5>';
            
            regularCoupons.forEach(coupon => {
                regularGroup.appendChild(renderCouponCard(coupon));
            });
            
            section.appendChild(regularGroup);
        }
        
        // Card promotions with separator
        if (cardPromotions.length > 0) {
            if (regularCoupons.length > 0) {
                const separator = document.createElement('hr');
                separator.className = 'coupon-separator';
                section.appendChild(separator);
            }
            
            const cardGroup = document.createElement('div');
            cardGroup.className = 'coupon-group';
            cardGroup.innerHTML = '<h5 class="coupon-group-title card-promotion-title">카드사 프로모션</h5>';
            
            cardPromotions.forEach(coupon => {
                cardGroup.appendChild(renderCouponCard(coupon));
            });
            
            section.appendChild(cardGroup);
        }
        
        couponList.appendChild(section);
    });
    
    if (Object.keys(couponsByCompetitor).length === 0) {
        couponList.innerHTML = '<p>표시할 쿠폰이 없습니다.</p>';
    }
}

function filterCoupons(filter) {
    currentCouponFilter = filter;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderCoupons();
}

function updateCouponDisplay() {
    const productTypeSelect = document.getElementById('couponProductTypeSelect');
    if (productTypeSelect) {
        currentCouponProductType = productTypeSelect.value;
        renderCoupons();
        
        // Hide simulation if no data available for selected product type
        const priceComparisonChart = document.getElementById('priceComparisonChart');
        if (priceComparisonChart && (currentCouponProductType === 'pet' || currentCouponProductType === 'puzzle')) {
            priceComparisonChart.innerHTML = '<div class="no-simulation-data"><p>해당 제품 타입의 시뮬레이션 데이터가 없습니다.</p></div>';
        } else if (priceComparisonChart && currentCouponProductType === 'roll') {
            // Re-run simulation for roll mat if data is available
            if (typeof simulatePurchase === 'function') {
                simulatePurchase();
            }
        }
    }
}

// Handle coupon file upload
document.getElementById('couponFile')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('couponUploadForm').submit();
    }
});

// Simulate actual purchase with coupon application
async function simulatePurchase() {
    console.log('Starting purchase simulation...');
    
    // Check if data is loaded
    if (!allData || allData.length === 0) {
        console.log('No product data available');
        return;
    }
    
    if (!couponData || couponData.length === 0) {
        console.log('No coupon data available');
        return;
    }
    
    const quantity = parseInt(document.getElementById('purchaseQuantity')?.value || 3);
    const thickness = parseFloat(document.getElementById('thicknessSelect').value);
    const productType = document.getElementById('couponProductTypeSelect')?.value || 'roll';
    
    console.log(`Simulation params - Quantity: ${quantity}, Thickness: ${thickness}, Product Type: ${productType}`);
    
    // Calculate required meters based on quantity (110×400cm = 4.4m² per piece)
    const targetMeters = quantity * 4.4;
    const requirement = { 
        meters: targetMeters, 
        description: `110×400cm ${quantity}장` 
    };
    
    // Get products matching thickness (with more tolerance)
    const matchingProducts = allData.filter(p => Math.abs(p.Thickness_cm - thickness) <= 0.3);
    
    console.log(`Found ${matchingProducts.length} products matching thickness ${thickness}cm`);
    
    // If no exact matches, find closest thickness
    if (matchingProducts.length === 0) {
        const closestThickness = allData.reduce((prev, curr) => 
            Math.abs(curr.Thickness_cm - thickness) < Math.abs(prev.Thickness_cm - thickness) ? curr : prev
        ).Thickness_cm;
        
        matchingProducts.push(...allData.filter(p => p.Thickness_cm === closestThickness));
        console.log(`No exact matches, using closest thickness: ${closestThickness}cm`);
    }
    
    // Group by competitor and calculate purchase options
    const purchaseSimulations = [];
    
    const competitors = [...new Set(matchingProducts.map(p => p.Competitor))];
    console.log(`Processing ${competitors.length} competitors:`, competitors);
    
    for (const competitor of competitors) {
        const competitorProducts = matchingProducts.filter(p => p.Competitor === competitor);
        
        // Find best product match for preferred width
        let bestProduct = null;
        let widthConversionFactor = 1;
        
        // First, try to find exact width match
        bestProduct = competitorProducts.find(p => p.Width_cm === preferredWidth);
        
        if (!bestProduct) {
            // Find closest width and calculate conversion
            bestProduct = competitorProducts.reduce((best, current) => {
                const bestDiff = Math.abs(best.Width_cm - preferredWidth);
                const currentDiff = Math.abs(current.Width_cm - preferredWidth);
                return currentDiff < bestDiff ? current : best;
            });
            
            // Calculate how much extra we need due to width difference
            widthConversionFactor = preferredWidth / bestProduct.Width_cm;
        }
        
        if (!bestProduct) continue;
        
        // Calculate how many units needed
        const metersPerUnit = (bestProduct.Width_cm * bestProduct.Length_cm) / 10000; // Convert to m²
        const unitsNeeded = Math.ceil((targetMeters * widthConversionFactor) / metersPerUnit);
        const actualMeters = unitsNeeded * metersPerUnit;
        const totalPrice = bestProduct.Price * unitsNeeded;
        
        // Find applicable coupons
        const applicableCoupons = couponData.filter(c => 
            c.competitor === competitor && 
            c.status === 'active'
        );
        
        // Calculate best price with coupons
        let bestFinalPrice = totalPrice;
        let bestCoupon = null;
        let bestDiscount = 0;
        
        for (const coupon of applicableCoupons) {
            let discountedPrice = totalPrice;
            let discountAmount = 0;
            
            // Check minimum purchase requirement
            if (coupon.min_purchase) {
                const minPurchase = parseFloat(coupon.min_purchase.replace(/[^0-9]/g, ''));
                if (totalPrice < minPurchase) continue;
            }
            
            // Apply percentage discount
            if (coupon.discount_rate && coupon.discount_rate !== '0%') {
                const rate = parseFloat(coupon.discount_rate.replace('%', '')) / 100;
                discountAmount = totalPrice * rate;
                
                // Check max discount
                if (coupon.max_discount) {
                    const maxDiscount = parseFloat(coupon.max_discount.replace(/[^0-9]/g, ''));
                    discountAmount = Math.min(discountAmount, maxDiscount);
                }
                
                discountedPrice = totalPrice - discountAmount;
            }
            
            // Apply fixed discount amount
            if (coupon.discount_amount && coupon.discount_amount !== '') {
                const fixedAmount = parseFloat(coupon.discount_amount.replace(/[^0-9]/g, ''));
                discountedPrice = totalPrice - fixedAmount;
                discountAmount = fixedAmount;
            }
            
            if (discountedPrice < bestFinalPrice) {
                bestFinalPrice = discountedPrice;
                bestCoupon = coupon;
                bestDiscount = discountAmount;
            }
        }
        
        purchaseSimulations.push({
            competitor: competitor,
            product: bestProduct,
            unitsNeeded: unitsNeeded,
            actualMeters: actualMeters,
            totalPrice: totalPrice,
            bestFinalPrice: bestFinalPrice,
            bestCoupon: bestCoupon,
            discount: bestDiscount,
            pricePerMeter: bestFinalPrice / actualMeters,
            widthAdjustment: widthConversionFactor !== 1 ? 
                `${bestProduct.Width_cm}cm 제품 (${preferredWidth}cm 환산)` : null
        });
    }
    
    // Sort by best final price
    purchaseSimulations.sort((a, b) => a.bestFinalPrice - b.bestFinalPrice);
    
    console.log(`Simulation complete. Found ${purchaseSimulations.length} options`);
    
    // Display results
    displayPurchaseSimulation(purchaseSimulations, requirement);
}

function displayPurchaseSimulation(simulations, requirement) {
    const container = document.getElementById('priceComparisonChart');
    
    let html = `
        <div class="simulation-header">
            <h4>${requirement.meters}M ${requirement.description} 시뮬레이션</h4>
            <p class="simulation-note">실제 구매 가능한 최소 단위로 계산됨</p>
        </div>
        <div class="simulation-grid">
    `;
    
    simulations.forEach((sim, index) => {
        const rankClass = index === 0 ? 'best-deal' : '';
        const savings = sim.totalPrice - sim.bestFinalPrice;
        const savingsPercent = (savings / sim.totalPrice * 100).toFixed(1);
        
        html += `
            <div class="simulation-item ${rankClass}">
                <div class="sim-rank">${index + 1}위</div>
                <h4>${sim.competitor}</h4>
                
                <div class="product-info">
                    <div class="product-spec">
                        ${sim.product.Width_cm} × ${sim.product.Length_cm}cm
                        ${sim.widthAdjustment ? `<br><small>${sim.widthAdjustment}</small>` : ''}
                    </div>
                    <div class="purchase-info">
                        <span class="units">${sim.unitsNeeded}개 구매</span>
                        <span class="actual-meters">(${sim.actualMeters.toFixed(1)}M)</span>
                    </div>
                </div>
                
                <div class="price-breakdown">
                    <div class="original-total">
                        <span>정가 합계:</span>
                        <span>₩${sim.totalPrice.toLocaleString()}</span>
                    </div>
                    
                    ${sim.bestCoupon ? `
                        <div class="coupon-info">
                            <div class="coupon-name">${sim.bestCoupon.coupon_name}</div>
                            <div class="discount-amount">-₩${Math.round(sim.discount).toLocaleString()} (${savingsPercent}%)</div>
                        </div>
                    ` : ''}
                    
                    <div class="final-total">
                        <span>최종 가격:</span>
                        <span class="final-price">₩${Math.round(sim.bestFinalPrice).toLocaleString()}</span>
                    </div>
                    
                    <div class="price-per-meter">
                        <span>M당 단가:</span>
                        <span>₩${Math.round(sim.pricePerMeter).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Add summary table
    html += `
        <div class="simulation-summary">
            <h4>구매 요약</h4>
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>순위</th>
                        <th>브랜드</th>
                        <th>제품 규격</th>
                        <th>구매 수량</th>
                        <th>최종 가격</th>
                        <th>M당 단가</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    simulations.slice(0, 5).forEach((sim, index) => {
        html += `
            <tr ${index === 0 ? 'class="best-row"' : ''}>
                <td>${index + 1}</td>
                <td>${sim.competitor}</td>
                <td>${sim.product.Width_cm}×${sim.product.Length_cm}cm</td>
                <td>${sim.unitsNeeded}개</td>
                <td>₩${Math.round(sim.bestFinalPrice).toLocaleString()}</td>
                <td>₩${Math.round(sim.pricePerMeter).toLocaleString()}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// Update simulation when parameters change
function updatePurchaseSimulation() {
    // Auto-trigger simulation if we have data
    if (allData.length > 0 && couponData.length > 0) {
        simulatePurchase();
    }
}

// Keep the old function for compatibility but redirect to new one
async function calculateRealPrices() {
    simulatePurchase();
}

// Review Analysis Functions
let reviewData = [];
let reviewCharts = {};

async function loadReviewData() {
    try {
        const period = document.getElementById('reviewPeriod').value;
        const response = await fetch(`/api/review-trends?period=${period}`);
        const trends = await response.json();
        
        renderReviewCharts(trends);
        updateReviewSummary(trends);
    } catch (error) {
        console.error('Error loading review data:', error);
    }
}

function renderReviewCharts(trends) {
    const showCount = document.getElementById('showReviewCount').checked;
    const showRating = document.getElementById('showRating').checked;
    
    // Prepare data for charts
    const competitors = Object.keys(trends);
    const dates = [...new Set(Object.values(trends).flatMap(t => t.dates))].sort();
    
    // Review Count Chart
    if (showCount) {
        const ctx = document.getElementById('reviewCountChart').getContext('2d');
        
        if (reviewCharts.count) {
            reviewCharts.count.destroy();
        }
        
        const datasets = competitors.map((comp, idx) => {
            const color = getCompetitorColor(comp, idx);
            return {
                label: comp,
                data: dates.map(date => {
                    const index = trends[comp].dates.indexOf(date);
                    return index >= 0 ? trends[comp].review_counts[index] : null;
                }),
                borderColor: color,
                backgroundColor: color.replace('1)', '0.1)'),
                tension: 0.4
            };
        });
        
        reviewCharts.count = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '리뷰 수'
                        }
                    }
                }
            }
        });
    }
    
    // Average Rating Chart
    if (showRating) {
        const ctx = document.getElementById('ratingTrendChart').getContext('2d');
        
        if (reviewCharts.rating) {
            reviewCharts.rating.destroy();
        }
        
        const datasets = competitors.map((comp, idx) => {
            const color = getCompetitorColor(comp, idx);
            return {
                label: comp,
                data: dates.map(date => {
                    const index = trends[comp].dates.indexOf(date);
                    return index >= 0 ? trends[comp].ratings[index] : null;
                }),
                borderColor: color,
                backgroundColor: color.replace('1)', '0.1)'),
                tension: 0.4
            };
        });
        
        reviewCharts.rating = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 5,
                        title: {
                            display: true,
                            text: '평균 평점'
                        }
                    }
                }
            }
        });
    }
}

function updateReviewSummary(trends) {
    const summaryContainer = document.getElementById('reviewSummaryStats');
    summaryContainer.innerHTML = '';
    
    Object.entries(trends).forEach(([competitor, data]) => {
        const totalReviews = data.review_counts.reduce((a, b) => a + b, 0);
        const avgRating = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
        
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <h4>${competitor}</h4>
            <p><strong>총 리뷰 수:</strong> ${totalReviews.toLocaleString()}개</p>
            <p><strong>평균 평점:</strong> ${avgRating.toFixed(1)} / 5.0</p>
        `;
        summaryContainer.appendChild(card);
    });
}

function updateReviewCharts() {
    // 모든 경우에 차트 업데이트 (특정 기간도 포함)
    loadReviewTrends();
}

function toggleCustomDateRange() {
    const period = document.getElementById('reviewPeriod')?.value;
    const customDateRange = document.getElementById('customDateRange');
    
    if (period === 'custom') {
        customDateRange.style.display = 'flex';
        
        // 기본값 설정 (종료일: 오늘, 시작일: 30일 전)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (!startDateInput.value) {
            startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        }
        if (!endDateInput.value) {
            endDateInput.value = today.toISOString().split('T')[0];
        }
    } else {
        customDateRange.style.display = 'none';
    }
    
    // 모든 경우에 차트 업데이트 (커스텀 선택 시에도 즉시 반영)
    console.log('Period changed to:', period, '- updating charts');
    loadReviewTrends();
}

function applyCustomDateRange() {
    console.log('applyCustomDateRange called');
    
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    console.log('Start date:', startDate, 'End date:', endDate);
    
    if (!startDate || !endDate) {
        alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('시작 날짜는 종료 날짜보다 빨라야 합니다.');
        return;
    }
    
    console.log('Applying custom date range:', startDate, 'to', endDate);
    
    // 직접 loadReviewTrends 호출해보기
    loadReviewTrends();
}

// Review trends charts globals
let reviewCountChart = null;
let marketShareChart = null;

function loadReviewTrends() {
    console.log('loadReviewTrends called');
    
    const productType = document.getElementById('reviewProductTypeSelect')?.value || 'roll';
    const period = document.getElementById('reviewPeriod')?.value || '30';
    
    console.log('Product type:', productType, 'Period:', period);
    
    // API URL 구성
    let apiUrl = `/api/review-trends?category=${productType}&period=${period}`;
    
    // 특정 기간 조회인 경우 날짜 파라미터 추가
    if (period === 'custom') {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        
        console.log('Custom period - Start:', startDate, 'End:', endDate);
        
        if (!startDate || !endDate) {
            console.error('Missing dates for custom period');
            alert('시작 날짜와 종료 날짜를 모두 선택해주세요.');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            console.error('Invalid date range');
            alert('시작 날짜는 종료 날짜보다 빨라야 합니다.');
            return;
        }
        
        apiUrl += `&start_date=${startDate}&end_date=${endDate}`;
    }
    
    console.log('API URL:', apiUrl);
    
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            console.log('Review trends data:', data);
            
            if (data.error) {
                console.error('Error loading review trends:', data.error);
                return;
            }
            
            // 원본 데이터 저장
            originalReviewData = data;
            
            // Update competitor checkboxes
            updateReviewCompetitorCheckboxes(data.summary);
            
            // Update charts
            updateReviewCountChart(data.chart_data);
            updateMarketShareChart(data.summary);
            updateReviewSummaryStats(data.summary);
        })
        .catch(error => {
            console.error('Error loading review trends:', error);
        });
}

function updateReviewCountChart(chartData) {
    const ctx = document.getElementById('reviewCountChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (reviewCountChart) {
        reviewCountChart.destroy();
    }
    
    reviewCountChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: chartData.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '리뷰 수 추이 (기간별 자동 그룹화)'
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '리뷰 수'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '날짜'
                    }
                }
            }
        }
    });
}


function updateReviewSummaryStats(summaryData) {
    const container = document.getElementById('reviewSummaryStats');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(summaryData).forEach(([competitor, stats]) => {
        const statCard = document.createElement('div');
        statCard.className = 'stat-card';
        statCard.innerHTML = `
            <div class="stat-header">
                <h4>${competitor}</h4>
                <span class="stat-trend ${stats.recent_growth_rate > 0 ? 'positive' : 'negative'}">
                    ${stats.recent_growth_rate > 0 ? '↗' : '↘'} ${stats.recent_growth_rate}%
                </span>
            </div>
            <div class="stat-content">
                <div class="stat-item">
                    <span class="stat-label">전체 리뷰</span>
                    <span class="stat-value">${stats.total_reviews}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">평균 평점</span>
                    <span class="stat-value">${stats.avg_rating}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">최근 7일</span>
                    <span class="stat-value">${stats.recent_7d_reviews}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">최근 30일</span>
                    <span class="stat-value">${stats.recent_30d_reviews}</span>
                </div>
            </div>
        `;
        container.appendChild(statCard);
    });
}

function updateReviewCompetitorCheckboxes(summaryData) {
    const container = document.getElementById('reviewCompetitorCheckboxes');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(summaryData).forEach(competitor => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'competitor-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `review-${competitor}`;
        checkbox.checked = true;
        checkbox.addEventListener('change', filterReviewCharts);
        
        const label = document.createElement('label');
        label.htmlFor = `review-${competitor}`;
        label.textContent = competitor;
        
        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        container.appendChild(checkboxDiv);
    });
}

function filterReviewCharts() {
    // Get selected competitors
    const selectedCompetitors = [];
    const checkboxes = document.querySelectorAll('#reviewCompetitorCheckboxes input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        const competitor = checkbox.id.replace('review-', '');
        selectedCompetitors.push(competitor);
    });
    
    // Filter chart data and update
    filterChartDataByCompetitors(selectedCompetitors);
}

// 글로벌 변수로 원본 데이터 저장
let originalReviewData = null;

function filterChartDataByCompetitors(selectedCompetitors) {
    if (!originalReviewData) return;
    
    // 선택된 경쟁사만 필터링
    const filteredChartData = {
        labels: originalReviewData.chart_data.labels,
        datasets: originalReviewData.chart_data.datasets.filter(dataset => 
            selectedCompetitors.includes(dataset.label)
        )
    };
    
    const filteredSummary = {};
    selectedCompetitors.forEach(competitor => {
        if (originalReviewData.summary[competitor]) {
            filteredSummary[competitor] = originalReviewData.summary[competitor];
        }
    });
    
    // 차트 업데이트
    updateReviewCountChart(filteredChartData);
    updateMarketShareChart(filteredSummary);
    updateReviewSummaryStats(filteredSummary);
}

function updateMarketShareChart(summaryData) {
    const ctx = document.getElementById('marketShareChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (marketShareChart) {
        marketShareChart.destroy();
    }
    
    // Calculate market share based on selected period
    const periodElement = document.getElementById('reviewPeriod');
    const period = periodElement ? periodElement.value : '30';
    let reviewsField = 'total_reviews';
    
    // Determine which review count to use based on period
    if (period === '7') {
        reviewsField = 'recent_7d_reviews';
    } else if (period === '14') {
        reviewsField = 'recent_14d_reviews';
    } else if (period === '30') {
        reviewsField = 'recent_30d_reviews';
    } else if (period === '90') {
        reviewsField = 'recent_90d_reviews';
    } else if (period === '180') {
        reviewsField = 'recent_180d_reviews';
    } else if (period === '365') {
        reviewsField = 'recent_365d_reviews';
    } else if (period === 'all') {
        reviewsField = 'total_reviews';
    }
    
    // Calculate total reviews for the selected period
    const totalReviews = Object.values(summaryData).reduce((sum, data) => sum + data[reviewsField], 0);
    
    const marketShareData = [];
    const labels = [];
    const backgroundColors = [
        '#4f46e5', '#ef4444', '#10b981', '#f59e0b',
        '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
    ];
    
    Object.entries(summaryData).forEach(([competitor, data], index) => {
        const reviews = data[reviewsField];
        const share = totalReviews > 0 ? ((reviews / totalReviews) * 100).toFixed(1) : 0;
        labels.push(`${competitor} (${share}%)`);
        marketShareData.push(parseFloat(share));
    });
    
    marketShareChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: marketShareData,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: period === '7' ? '시장점유율 (최근 7일 리뷰 기준)' : 
                          period === '14' ? '시장점유율 (최근 14일 리뷰 기준)' :
                          period === '30' ? '시장점유율 (최근 30일 리뷰 기준)' :
                          period === '90' ? '시장점유율 (최근 90일 리뷰 기준)' :
                          period === '180' ? '시장점유율 (최근 6개월 리뷰 기준)' :
                          period === '365' ? '시장점유율 (최근 1년 리뷰 기준)' :
                          period === 'all' ? '시장점유율 (전체기간 리뷰 기준)' :
                          '시장점유율 (전체 리뷰 기준)'
                },
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const competitor = context.label.split(' (')[0];
                            const percentage = context.parsed;
                            const reviews = summaryData[competitor][reviewsField];
                            return `${competitor}: ${percentage}% (${reviews}개 리뷰)`;
                        }
                    }
                }
            }
        }
    });
}

function getCompetitorColor(competitor, index) {
    const colors = {
        '따사룸': 'rgba(255, 99, 132, 1)',
        '리포소홈': 'rgba(54, 162, 235, 1)',
        '티지오매트': 'rgba(255, 206, 86, 1)',
        '파크론': 'rgba(75, 192, 192, 1)'
    };
    
    const defaultColors = [
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(199, 199, 199, 1)',
        'rgba(83, 102, 255, 1)'
    ];
    
    return colors[competitor] || defaultColors[index % defaultColors.length];
}

// Chart expansion functionality
let modalChart = null;
let currentChartData = null;

function expandChart(chartType) {
    const modal = document.getElementById('chartModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalCanvas = document.getElementById('modalChart');
    
    // Set title based on chart type
    if (chartType === 'reviewCount') {
        modalTitle.textContent = '리뷰 수 추이 - 확대 보기';
        // Clone the review count chart data
        if (reviewCountChart) {
            currentChartData = {
                type: 'line',
                data: JSON.parse(JSON.stringify(reviewCountChart.data)),
                options: JSON.parse(JSON.stringify(reviewCountChart.options))
            };
        }
    } else if (chartType === 'marketShare') {
        modalTitle.textContent = '시장점유율 (리뷰 수 기준) - 확대 보기';
        // Clone the market share chart data
        if (marketShareChart) {
            currentChartData = {
                type: 'doughnut',
                data: JSON.parse(JSON.stringify(marketShareChart.data)),
                options: JSON.parse(JSON.stringify(marketShareChart.options))
            };
        }
    }
    
    // Show modal
    modal.style.display = 'block';
    
    // Destroy existing modal chart if any
    if (modalChart) {
        modalChart.destroy();
    }
    
    // Create new chart in modal
    if (currentChartData) {
        // Adjust options for modal view
        currentChartData.options.responsive = true;
        currentChartData.options.maintainAspectRatio = false;
        
        modalChart = new Chart(modalCanvas, currentChartData);
    }
}

function closeChartModal() {
    const modal = document.getElementById('chartModal');
    modal.style.display = 'none';
    
    // Destroy modal chart
    if (modalChart) {
        modalChart.destroy();
        modalChart = null;
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('chartModal');
    if (event.target === modal) {
        closeChartModal();
    }
}

// Handle review file upload
document.getElementById('reviewFile')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('reviewUploadForm').submit();
    }
});

// Update tab switching to include calendar, coupon, and review initialization
const originalShowTab = window.showTab;
window.showTab = function(tabName) {
    originalShowTab(tabName);
    
    if (tabName === 'calendar') {
        initializeCalendar();
    } else if (tabName === 'feed') {
        if (typeof initializeFeed === 'function') {
            initializeFeed();
        }
    } else if (tabName === 'review-trends') {
        loadReviewTrends();
    } else if (tabName === 'macros') {
        if (typeof initializeMacros === 'function') {
            initializeMacros();
        }
    }
};
