// New purchase simulation logic for realistic scenarios
async function simulatePurchase() {
    console.log('Starting realistic purchase simulation...');
    
    // Check product type first
    const productType = document.getElementById('couponProductTypeSelect')?.value || 'roll';
    
    // If not roll mat, show no data message
    if (productType === 'pet' || productType === 'puzzle') {
        const container = document.getElementById('priceComparisonChart');
        if (container) {
            container.innerHTML = '<div class="no-simulation-data"><p>해당 제품 타입의 시뮬레이션 데이터가 없습니다.</p></div>';
        }
        return;
    }
    
    // Debug data availability
    console.log('Data check:', {
        allData: allData ? allData.length : 'not loaded',
        couponData: couponData ? couponData.length : 'not loaded'
    });
    
    if (!allData || allData.length === 0) {
        console.error('Product data not loaded');
        return;
    }
    
    if (!couponData || couponData.length === 0) {
        console.error('Coupon data not loaded');
        return;
    }
    
    const thickness = parseFloat(document.getElementById('thicknessSelect').value);
    const quantity = parseInt(document.getElementById('purchaseQuantity')?.value || 3);
    
    console.log(`Simulation params - Quantity: ${quantity}, Thickness: ${thickness}`);
    
    // Find 110cm width products that match the selected thickness
    const matchingProducts = allData.filter(p => 
        p.Width_cm === 110 && 
        Math.abs(p.Thickness_cm - thickness) <= 0.1
    );
    
    console.log(`Found ${matchingProducts.length} products with 110cm width and ${thickness}cm thickness`);
    
    if (matchingProducts.length === 0) {
        console.log('No 110cm width products found for selected thickness');
        return;
    }
    
    const competitors = [...new Set(matchingProducts.map(p => p.Competitor))];
    const simulations = [];
    
    // Target: 400cm × quantity장 = total length needed
    const targetTotalLength = 400 * quantity;
    
    // For each competitor
    for (const competitor of competitors) {
        // Find best product for this competitor with matching thickness and 110cm width
        const competitorProducts = matchingProducts.filter(p => p.Competitor === competitor);
        
        if (competitorProducts.length === 0) continue;
        
        // Use the first product (or could find optimal length)
        const product = competitorProducts[0];
        
        // Calculate how many units needed to get 1200cm total length
        const unitsNeeded = Math.ceil(targetTotalLength / product.Length_cm);
        const actualTotalLength = unitsNeeded * product.Length_cm;
        
        console.log(`${competitor}: ${product.Length_cm}cm length, need ${unitsNeeded} units for ${actualTotalLength}cm total`);
        
        const totalOriginalPrice = product.Price * unitsNeeded;
        
        // Get applicable coupons
        const allCoupons = couponData.filter(c => 
            c.competitor === competitor && 
            c.status === 'active'
        );
        
        // Separate regular coupons and card discounts
        const regularCoupons = allCoupons.filter(c => c.type !== '카드사 할인');
        const cardCoupons = allCoupons.filter(c => c.type === '카드사 할인');
        
        console.log(`${competitor} coupons:`, {
            total: allCoupons.length,
            regular: regularCoupons.length,
            card: cardCoupons.length,
            totalPrice: totalOriginalPrice,
            regularCoupons: regularCoupons.map(c => ({
                name: c.coupon_name,
                rate: c.discount_rate,
                amount: c.discount_amount,
                min: c.min_purchase,
                max: c.max_discount
            })),
            cardCoupons: cardCoupons.map(c => ({
                name: c.coupon_name,
                rate: c.discount_rate,
                description: c.description
            }))
        });
        
        // Calculate simple discount without complex conditions
        let totalDiscount = 0;
        let appliedCoupons = [];
        
        // Apply best regular coupon (simple calculation with max limit)
        let bestRegularDiscount = 0;
        let bestRegularCoupon = null;
        
        for (const coupon of regularCoupons) {
            let discount = 0;
            
            // Simple percentage discount
            if (coupon.discount_rate && coupon.discount_rate.includes('%')) {
                const rate = parseFloat(coupon.discount_rate.replace('%', '')) / 100;
                discount = totalOriginalPrice * rate;
                
                // Apply max discount limit if exists
                if (coupon.max_discount && coupon.max_discount !== '') {
                    const maxLimit = parseFloat(coupon.max_discount.toString().replace(/[^0-9.]/g, ''));
                    if (maxLimit > 0) {
                        discount = Math.min(discount, maxLimit);
                    }
                }
            }
            
            // Simple fixed amount discount
            if (coupon.discount_amount && coupon.discount_amount.includes('원')) {
                const amount = parseFloat(coupon.discount_amount.replace(/[^0-9]/g, ''));
                discount = Math.max(discount, amount);
            }
            
            if (discount > bestRegularDiscount) {
                bestRegularDiscount = discount;
                bestRegularCoupon = coupon;
            }
        }
        
        if (bestRegularCoupon) {
            totalDiscount += bestRegularDiscount;
            appliedCoupons.push({
                name: bestRegularCoupon.coupon_name,
                discount: bestRegularDiscount,
                type: 'regular',
                rate: bestRegularCoupon.discount_rate,
                maxLimit: bestRegularCoupon.max_discount
            });
        }
        
        // Apply best card coupon (simple calculation with max limit)
        let bestCardDiscount = 0;
        let bestCardCoupon = null;
        
        for (const coupon of cardCoupons) {
            let discount = 0;
            
            // Simple percentage discount for card
            if (coupon.discount_rate && coupon.discount_rate.includes('%')) {
                const rate = parseFloat(coupon.discount_rate.replace('%', '')) / 100;
                discount = totalOriginalPrice * rate;
                
                // Check max discount from description for card coupons
                if (coupon.description && coupon.description.includes('최대')) {
                    const maxMatch = coupon.description.match(/최대\s*([0-9]+)만원/);
                    if (maxMatch) {
                        const maxLimit = parseInt(maxMatch[1]) * 10000;
                        discount = Math.min(discount, maxLimit);
                    }
                }
                
                // Also check max_discount field if exists
                if (coupon.max_discount && coupon.max_discount !== '') {
                    const maxLimit = parseFloat(coupon.max_discount.toString().replace(/[^0-9.]/g, ''));
                    if (maxLimit > 0) {
                        discount = Math.min(discount, maxLimit);
                    }
                }
            }
            
            if (discount > bestCardDiscount) {
                bestCardDiscount = discount;
                bestCardCoupon = coupon;
            }
        }
        
        if (bestCardCoupon) {
            totalDiscount += bestCardDiscount;
            
            // Extract max limit from description if not in max_discount field
            let maxLimitText = '';
            if (bestCardCoupon.description && bestCardCoupon.description.includes('최대')) {
                const maxMatch = bestCardCoupon.description.match(/최대\s*([0-9]+)만원/);
                if (maxMatch) {
                    maxLimitText = `${maxMatch[1]}만원`;
                }
            }
            
            appliedCoupons.push({
                name: bestCardCoupon.coupon_name,
                discount: bestCardDiscount,
                type: 'card',
                rate: bestCardCoupon.discount_rate,
                maxLimit: bestCardCoupon.max_discount || maxLimitText
            });
        }
        
        const finalPrice = totalOriginalPrice - totalDiscount;
        
        simulations.push({
            competitor: competitor,
            product: product,
            unitsNeeded: unitsNeeded,
            totalOriginalPrice: totalOriginalPrice,
            appliedCoupons: appliedCoupons,
            finalPrice: finalPrice,
            totalSavings: totalDiscount,
            totalDiscount: totalDiscount
        });
    }
    
    // Sort by final price
    simulations.sort((a, b) => a.finalPrice - b.finalPrice);
    
    // Display results
    displaySimpleSimulation(simulations, thickness, quantity);
}

function findBestProduct(products, targetWidth, targetLength) {
    // For 110cm requirement, only consider 110cm width products
    // For 140cm requirement, only consider 140cm width products
    // For 280cm requirement (거실 140cm 조합), only consider 140cm width products
    // For 330cm requirement (거실), only consider 110cm width products (3장)
    
    let candidates = [];
    
    if (targetWidth === 110) {
        candidates = products.filter(p => p.Width_cm === 110);
    } else if (targetWidth === 140) {
        candidates = products.filter(p => p.Width_cm === 140);
    } else if (targetWidth === 280) {
        // 140cm 제품 2장으로 280cm 구성
        candidates = products.filter(p => p.Width_cm === 140);
    } else if (targetWidth === 330) {
        // 110cm 제품 3장으로 330cm 구성
        candidates = products.filter(p => p.Width_cm === 110);
    }
    
    if (candidates.length === 0) {
        return null;
    }
    
    // Find product with best length match
    let bestProduct = null;
    let bestScore = Infinity;
    
    for (const product of candidates) {
        const lengthNeeded = Math.ceil(targetLength / product.Length_cm);
        let widthNeeded = 1;
        
        // Calculate width units based on target
        if (targetWidth === 280 && product.Width_cm === 140) {
            widthNeeded = 2;  // 140cm * 2 = 280cm
        } else if (targetWidth === 330 && product.Width_cm === 110) {
            widthNeeded = 3;  // 110cm * 3 = 330cm
        }
        
        const totalUnits = lengthNeeded * widthNeeded;
        const actualWidth = product.Width_cm * widthNeeded;
        const actualLength = product.Length_cm * lengthNeeded;
        const waste = (actualWidth * actualLength) - (targetWidth * targetLength);
        
        if (waste < bestScore) {
            bestScore = waste;
            bestProduct = {
                product: product,
                widthUnits: widthNeeded,
                lengthUnits: lengthNeeded
            };
        }
    }
    
    return bestProduct;
}

function calculateUnitsNeeded(bestProduct, targetWidth, targetLength) {
    return bestProduct.widthUnits * bestProduct.lengthUnits;
}

// Legacy function - not used anymore
/*
function findBestRegularCoupon(totalPrice, regularCoupons) {
    console.log(`Finding best regular coupon for price: ${totalPrice}`);
    
    let bestCoupon = {
        coupon: null,
        discount: 0,
        finalPrice: totalPrice
    };
    
    // Try each regular coupon
    for (const coupon of regularCoupons) {
        const discount = calculateCouponDiscount(coupon, totalPrice);
        console.log(`${coupon.coupon_name}: discount = ${discount}`);
        if (discount > bestCoupon.discount) {
            bestCoupon.coupon = coupon;
            bestCoupon.discount = discount;
        }
    }
    
    console.log(`Best regular coupon: ${bestCoupon.coupon?.coupon_name || 'none'} with discount: ${bestCoupon.discount}`);
    
    // Calculate final price
    bestCoupon.finalPrice = totalPrice - bestCoupon.discount;
    
    return bestCoupon;
}
*/

function findBestCardCoupon(totalPrice, cardCoupons) {
    let bestCoupon = {
        coupon: null,
        discount: 0
    };
    
    // Try each card coupon and pick the best one
    for (const coupon of cardCoupons) {
        const discount = calculateCouponDiscount(coupon, totalPrice);
        if (discount > bestCoupon.discount) {
            bestCoupon.coupon = coupon;
            bestCoupon.discount = discount;
        }
    }
    
    return bestCoupon;
}

function calculateCouponDiscount(coupon, price) {
    console.log(`Calculating discount for ${coupon.coupon_name}:`, {
        price: price,
        discount_rate: coupon.discount_rate,
        min_purchase: coupon.min_purchase,
        max_discount: coupon.max_discount,
        discount_amount: coupon.discount_amount
    });
    
    // Check minimum purchase
    let minPurchase = 0;
    if (coupon.min_purchase) {
        const minPurchaseStr = coupon.min_purchase.toString().replace(/[^0-9.]/g, '');
        minPurchase = parseFloat(minPurchaseStr) || 0;
        console.log(`Min purchase parsing: "${coupon.min_purchase}" → "${minPurchaseStr}" → ${minPurchase}`);
    }
    
    // For card discounts, try to extract min purchase from description
    if (coupon.type === '카드사 할인' && coupon.description && !minPurchase) {
        const descMatch = coupon.description.match(/([0-9]+)만원\s*이상/);
        if (descMatch) {
            minPurchase = parseInt(descMatch[1]) * 10000; // Convert to won
        }
    }
    
    console.log(`Min purchase requirement: ${minPurchase}`);
    if (price < minPurchase) {
        console.log('Price below minimum purchase requirement');
        return 0;
    }
    
    let discount = 0;
    
    // Calculate percentage discount
    if (coupon.discount_rate && coupon.discount_rate !== '0%' && coupon.discount_rate !== '') {
        console.log(`Parsing discount rate: "${coupon.discount_rate}"`);
        const rateStr = coupon.discount_rate.toString().replace('%', '');
        const rate = parseFloat(rateStr) / 100;
        discount = price * rate;
        console.log(`Rate string: "${rateStr}", parsed rate: ${rate}, calculated discount: ${discount}`);
        
        // Apply max discount limit
        if (coupon.max_discount && coupon.max_discount !== '') {
            console.log(`Max discount field: "${coupon.max_discount}"`);
            const maxDiscount = parseFloat(coupon.max_discount.toString().replace(/[^0-9]/g, '')) || Infinity;
            const originalDiscount = discount;
            discount = Math.min(discount, maxDiscount);
            console.log(`Max discount parsed: ${maxDiscount}, original: ${originalDiscount}, final: ${discount}`);
        }
        
        // For card discounts, try to extract max from description if not in data
        if (coupon.type === '카드사 할인' && coupon.description && (!coupon.max_discount || coupon.max_discount === '')) {
            console.log(`Checking card description: "${coupon.description}"`);
            const maxMatch = coupon.description.match(/최대\s*([0-9]+)만원/);
            if (maxMatch) {
                const maxFromDesc = parseInt(maxMatch[1]) * 10000;
                const originalDiscount = discount;
                discount = Math.min(discount, maxFromDesc);
                console.log(`Card discount max from description: ${maxFromDesc}, original: ${originalDiscount}, final: ${discount}`);
            }
        }
    }
    
    // Fixed discount amount
    if (coupon.discount_amount && coupon.discount_amount !== '') {
        console.log(`Parsing discount amount: "${coupon.discount_amount}"`);
        const amountStr = coupon.discount_amount.toString().replace(/[^0-9-]/g, '');
        const fixedAmount = parseFloat(amountStr) || 0;
        const absFixedAmount = Math.abs(fixedAmount);
        console.log(`Amount string: "${amountStr}", parsed: ${fixedAmount}, abs: ${absFixedAmount}`);
        discount = Math.max(discount, absFixedAmount);
        console.log(`Fixed amount discount applied: ${absFixedAmount}, total discount: ${discount}`);
    }
    
    console.log(`Final discount for ${coupon.coupon_name}: ${discount}`);
    return discount;
}

function displaySimpleSimulation(simulations, thickness, quantity = 3) {
    const container = document.getElementById('priceComparisonChart');
    
    if (simulations.length === 0) {
        container.innerHTML = '<p>선택한 두께에 대한 시뮬레이션 데이터가 없습니다.</p>';
        return;
    }
    
    const totalLength = 400 * quantity;
    
    let html = `
        <div class="simulation-header">
            <h4>가격 비교 시뮬레이션 (110cm 폭 기준)</h4>
            <p>${thickness}cm 두께 - 400cm×${quantity}장 상당 (총 ${totalLength}cm) 구매시</p>
        </div>
        <div class="simulation-results">
    `;
    
    simulations.forEach((sim, index) => {
        const rankClass = index === 0 ? 'best-deal' : '';
        const savingsPercent = ((sim.totalSavings / sim.totalOriginalPrice) * 100).toFixed(1);
        
        html += `
            <div class="simulation-card ${rankClass}">
                <div class="sim-header">
                    <h3>${sim.competitor}</h3>
                    <span class="sim-rank">${index + 1}위</span>
                </div>
                
                <div class="product-details">
                    <p class="product-info">
                        ${sim.product.Design || sim.competitor} 
                        <span class="product-spec">(${sim.product.Width_cm}×${sim.product.Length_cm}×${sim.product.Thickness_cm}cm)</span>
                    </p>
                    <p class="purchase-details">
                        ${sim.unitsNeeded}장 구매 = ${(sim.unitsNeeded * sim.product.Length_cm)}cm 총 길이
                        <span class="target-equivalent">(목표: 400cm×${quantity}장 = ${totalLength}cm)</span>
                    </p>
                </div>
                
                <div class="price-summary">
                    <div class="original-price">
                        <span>정가:</span>
                        <span>₩${sim.totalOriginalPrice.toLocaleString()}</span>
                    </div>
        `;
        
        // Show applied discounts
        if (sim.appliedCoupons.length > 0) {
            html += '<div class="discount-details">';
            
            sim.appliedCoupons.forEach(coupon => {
                const typeLabel = coupon.type === 'card' ? '카드사 할인' : '쿠폰 할인';
                let maxLimitText = '';
                
                // Format max limit nicely
                if (coupon.maxLimit) {
                    // If it's already formatted (e.g., "5만원"), use as is
                    if (coupon.maxLimit.includes('만원')) {
                        maxLimitText = ` (최대 ${coupon.maxLimit})`;
                    } else {
                        // If it's a number like "100000", format it
                        const maxAmount = parseFloat(coupon.maxLimit.toString().replace(/[^0-9.]/g, ''));
                        if (maxAmount > 0) {
                            maxLimitText = ` (최대 ${maxAmount.toLocaleString()}원)`;
                        }
                    }
                }
                
                html += `
                    <div class="discount-item">
                        <span class="discount-name">${typeLabel}: ${coupon.name}${maxLimitText}</span>
                        <span class="discount-amount">-₩${Math.round(coupon.discount).toLocaleString()}</span>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        html += `
                    <div class="final-price">
                        <span>최종 가격:</span>
                        <span class="price-value">₩${Math.round(sim.finalPrice).toLocaleString()}</span>
                    </div>
                    ${sim.totalSavings > 0 ? `
                    <div class="savings-info">
                        총 ₩${Math.round(sim.totalSavings).toLocaleString()} 할인 (${((sim.totalSavings / sim.totalOriginalPrice) * 100).toFixed(1)}% 절약)
                    </div>` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function displayRealisticSimulation(simulations, rooms, scenario) {
    const container = document.getElementById('priceComparisonChart');
    
    let html = `
        <div class="simulation-header">
            <h4>${rooms.map(r => r.name).join(' + ')} 구매 시뮬레이션</h4>
            <p>${scenario.includes('110') ? '110cm 폭 제품으로 구성' : '140cm 폭 제품으로 구성'}</p>
        </div>
        <div class="simulation-results">
    `;
    
    simulations.forEach((sim, index) => {
        const rankClass = index === 0 ? 'best-deal' : '';
        const savingsPercent = ((sim.totalSavings / sim.totalOriginalPrice) * 100).toFixed(1);
        
        html += `
            <div class="simulation-card ${rankClass}">
                <div class="sim-header">
                    <div class="sim-rank">${index + 1}위</div>
                    <h3>${sim.competitor}</h3>
                </div>
                
                <div class="room-details">
        `;
        
        // Show each room's purchase details
        sim.roomPurchases.forEach(room => {
            html += `
                <div class="room-purchase">
                    <div class="room-info">
                        <strong>${room.room}:</strong> 
                        <span class="product-spec">${room.coverage}</span>
                        ${room.widthConfig ? `<span class="width-config">${room.widthConfig}</span>` : ''}
                    </div>
                    <span class="room-price">₩${room.totalPrice.toLocaleString()}</span>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div class="price-summary">
                    <div class="original-price">
                        <span>정가 합계:</span>
                        <span>₩${sim.totalOriginalPrice.toLocaleString()}</span>
                    </div>
        `;
        
        // Show applied discounts
        if (sim.bestCombination.details.length > 0) {
            html += '<div class="discount-details">';
            sim.bestCombination.details.forEach(detail => {
                html += `
                    <div class="discount-item">
                        <span class="discount-name">${detail.name}</span>
                        <span class="discount-amount">-₩${detail.discount.toLocaleString()}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += `
                    <div class="final-price">
                        <span>최종 가격:</span>
                        <span class="price-value">₩${Math.round(sim.finalPrice).toLocaleString()}</span>
                    </div>
                    <div class="savings-info">
                        총 ${savingsPercent}% 할인 (₩${Math.round(sim.totalSavings).toLocaleString()} 절약)
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Update existing functions to use new logic
function updatePurchaseSimulation() {
    if (allData.length > 0 && couponData.length > 0) {
        simulatePurchase();
    }
}

// Remove unused functions
function findBestProduct() { return null; }
function calculateUnitsNeeded() { return 0; }