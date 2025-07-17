// Test script to check if coupon display is working
// Run this in browser console on the dashboard page

console.log("=== Coupon Display Debug ===");

// 1. Check if coupon tab exists
const couponTab = document.getElementById('coupons');
console.log("1. Coupon tab exists:", !!couponTab);

// 2. Check if coupon list container exists
const couponList = document.getElementById('couponList');
console.log("2. Coupon list container exists:", !!couponList);

// 3. Try to fetch coupon data
console.log("3. Fetching coupon data...");
fetch('/api/coupons')
    .then(response => response.json())
    .then(data => {
        console.log("   - API returned", data.length, "coupons");
        if (data.length > 0) {
            console.log("   - Sample coupon:", data[0]);
        }
    })
    .catch(error => {
        console.error("   - Error fetching coupons:", error);
    });

// 4. Check if loadCouponData function exists
console.log("4. loadCouponData function exists:", typeof loadCouponData === 'function');

// 5. Check if renderCoupons function exists
console.log("5. renderCoupons function exists:", typeof renderCoupons === 'function');

// 6. Check current tab
const activeTab = document.querySelector('.tab-pane.active');
console.log("6. Current active tab:", activeTab ? activeTab.id : 'none');

// 7. Try to manually switch to coupon tab and load data
console.log("7. Manually switching to coupon tab...");
try {
    showTab('coupons');
    console.log("   - Tab switched successfully");
} catch (error) {
    console.error("   - Error switching tab:", error);
}

// 8. Check if coupon data is loaded
setTimeout(() => {
    console.log("8. Checking coupon data after tab switch...");
    console.log("   - couponData variable:", typeof couponData !== 'undefined' ? couponData.length + " items" : "undefined");
    
    // Check if any coupons are displayed
    const couponCards = document.querySelectorAll('.coupon-card');
    console.log("   - Coupon cards displayed:", couponCards.length);
    
    if (couponCards.length === 0 && couponList) {
        console.log("   - Coupon list HTML:", couponList.innerHTML.substring(0, 200) + "...");
    }
}, 2000);

console.log("=== End Debug ===");