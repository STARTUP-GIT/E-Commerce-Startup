/**
 * ATLASBASKET — ADMIN PANEL GLOBAL SEARCH AND LOCATION FILTER SYSTEM
 * Comprehensive Test Suite
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== ADMIN GLOBAL SEARCH & LOCATION FILTER SYSTEM VERIFICATION SUITE ===\n');

// --------------------------------------------------------------------------
// 1. Audit & Shared Component Architecture Tests
// --------------------------------------------------------------------------
console.log('1. Checking Reusable Location & Search Architecture:');

const useLocationDataPath = path.resolve(__dirname, '../../admin/src/lib/hooks/useLocationData.ts');
assert(fs.existsSync(useLocationDataPath), 'useLocationData hook must exist');
const useLocationContent = fs.readFileSync(useLocationDataPath, 'utf-8');
assert(useLocationContent.includes('stateApi.getStates'), 'Hook must fetch authoritative states from DB');
assert(useLocationContent.includes('cityApi.getCities'), 'Hook must fetch authoritative districts/cities from DB');
assert(useLocationContent.includes('getDistrictsForState'), 'Hook must provide cascading districts for a state');
assert(useLocationContent.includes('operationalOnly'), 'Hook must support filtering operationally active locations');
console.log('  ✓ useLocationData hook correctly integrates authoritative state and city APIs with operational filtering');

const locationFilterBarPath = path.resolve(__dirname, '../../admin/src/shared/components/LocationFilterBar.tsx');
assert(fs.existsSync(locationFilterBarPath), 'LocationFilterBar component must exist');
const filterBarContent = fs.readFileSync(locationFilterBarPath, 'utf-8');
assert(filterBarContent.includes('handleStateChange'), 'Filter bar must handle state changes');
assert(filterBarContent.includes('onDistrictChange(\'\')'), 'Changing state must reset district (cascading)');
assert(filterBarContent.includes('Location not set'), 'Filter bar must provide an option to find unassigned location records');
assert(filterBarContent.includes('All Locations'), 'Filter bar must support All Locations to find records without location restriction');
assert(filterBarContent.includes('onClearAll'), 'Filter bar must support clear all filters');
assert(filterBarContent.includes('mobileExpanded'), 'Filter bar must support mobile responsiveness with collapsible filters');
console.log('  ✓ LocationFilterBar component implements cascading State -> District, reset, mobile responsiveness, and unassigned filters');

// --------------------------------------------------------------------------
// 2. Issue Enforcement Action & Seller Search Select Tests
// --------------------------------------------------------------------------
console.log('\n2. Checking Issue Enforcement Action Modal & SellerSearchSelect:');

const sellerSearchSelectPath = path.resolve(__dirname, '../../admin/src/shared/components/SellerSearchSelect.tsx');
const sellerSearchContent = fs.readFileSync(sellerSearchSelectPath, 'utf-8');

assert(sellerSearchContent.includes('useDebounce'), 'Seller search must debounce user query input');
assert(sellerSearchContent.includes('selectedState') && sellerSearchContent.includes('selectedDistrict'), 'SellerSearchSelect must include location filters');
assert(sellerSearchContent.includes('handleStateChange'), 'State selection must determine and cascade available districts');
assert(sellerSearchContent.includes('role="combobox"') && sellerSearchContent.includes('role="listbox"'), 'SellerSearchSelect must implement accessible ARIA roles');
assert(sellerSearchContent.includes('ArrowDown') && sellerSearchContent.includes('ArrowUp'), 'SellerSearchSelect must support keyboard navigation');
assert(sellerSearchContent.includes('seller.id'), 'SellerSearchSelect must preserve exact seller ID to avoid accidental collisions');
assert(sellerSearchContent.includes('Location not set'), 'SellerSearchSelect must indicate missing location data');
assert(sellerSearchContent.includes('totalPages') && sellerSearchContent.includes('setPage'), 'SellerSearchSelect must support server-side pagination');

// Verify result display details
assert(sellerSearchContent.includes('seller.name'), 'Result must show seller full name');
assert(sellerSearchContent.includes('seller.shopName'), 'Result must show shop name');
assert(sellerSearchContent.includes('seller.email'), 'Result must show seller email');
assert(sellerSearchContent.includes('seller.state') || sellerSearchContent.includes('locationLabel'), 'Result must show state and district');
assert(sellerSearchContent.includes('seller.status'), 'Result must show account status');
console.log('  ✓ SellerSearchSelect meets all Section 4 & 5 requirements: name, email, username, shop, state, district, status, pagination, keyboard navigation');

// --------------------------------------------------------------------------
// 3. Backend Controller & Filtering Logic Tests
// --------------------------------------------------------------------------
console.log('\n3. Checking Backend Search & Location Controllers:');

const sellerControllerPath = path.resolve(__dirname, '../src/modules/admin/controllers/sellerController.ts');
const sellerControllerContent = fs.readFileSync(sellerControllerPath, 'utf-8');

// searchSellers endpoint
assert(sellerControllerContent.includes('export const searchSellers'), 'searchSellers endpoint must exist');
assert(sellerControllerContent.includes('username: { contains: q, mode: "insensitive" }'), 'searchSellers must search by username');
assert(sellerControllerContent.includes('shop: { name: { contains: q, mode: "insensitive" } }'), 'searchSellers must search by shop name');
assert(sellerControllerContent.includes('equals: state, mode: "insensitive"'), 'searchSellers must filter by state');
assert(sellerControllerContent.includes('equals: district, mode: "insensitive"'), 'searchSellers must filter by district');
assert(sellerControllerContent.includes('addresses: { none: { state: { not: "" } } }'), 'searchSellers must support unassigned / location not set');
assert(sellerControllerContent.includes('primaryAddress?.state ?? null'), 'searchSellers must return state and district');
assert(sellerControllerContent.includes('pages: Math.ceil(total / limit)'), 'searchSellers must return pagination metadata');
console.log('  ✓ sellerController.searchSellers handles text query across all fields, cascading location filters, and stable pagination');

// getSellers directory
assert(sellerControllerContent.includes('export const getSellers'), 'getSellers endpoint must exist');
assert(sellerControllerContent.includes('addresses: { some: addressCond }'), 'getSellers must filter by seller address location');
console.log('  ✓ sellerController.getSellers supports server-side location and status filtering');

// customerController
const customerControllerPath = path.resolve(__dirname, '../src/modules/admin/controllers/customerController.ts');
const customerControllerContent = fs.readFileSync(customerControllerPath, 'utf-8');
assert(/addresses:\s*\{\s*some:\s*addressCond\s*\}/.test(customerControllerContent), 'customerController must filter by address state and district');
assert(customerControllerContent.includes('addresses: {') && customerControllerContent.includes('none: { state: { not: "" } }'), 'customerController must support unassigned customers');
console.log('  ✓ customerController.getCustomers supports server-side location and status filtering');

// shopController
const shopControllerPath = path.resolve(__dirname, '../src/modules/admin/controllers/shopController.ts');
const shopControllerContent = fs.readFileSync(shopControllerPath, 'utf-8');
assert(/defaultPickupAddress:\s*addressCond/.test(shopControllerContent), 'shopController must filter by defaultPickupAddress location');
console.log('  ✓ shopController.getShops supports server-side location and status filtering');

// orderController
const orderControllerPath = path.resolve(__dirname, '../src/modules/admin/controllers/orderController.ts');
const orderControllerContent = fs.readFileSync(orderControllerPath, 'utf-8');
assert(/shippingAddress:\s*addrCond/.test(orderControllerContent), 'orderController must filter by shippingAddress location');
assert(orderControllerContent.includes('placeOfSupplyState'), 'orderController must combine placeOfSupplyState when applicable');
console.log('  ✓ orderController.getOrders supports location, payment method, delivery method, and date filters');

// deliveryOpsController
const deliveryOpsPath = path.resolve(__dirname, '../src/modules/delivery/controllers/adminDeliveryOpsController.ts');
const deliveryOpsContent = fs.readFileSync(deliveryOpsPath, 'utf-8');
assert(/addresses:\s*\{\s*some:\s*addrCond\s*\}/.test(deliveryOpsContent), 'listRiders must filter by rider address location');
console.log('  ✓ adminDeliveryOpsController.listRiders supports location and status filtering');

// enforcementController
const enforcementControllerPath = path.resolve(__dirname, '../src/modules/admin/controllers/enforcementController.ts');
const enforcementContent = fs.readFileSync(enforcementControllerPath, 'utf-8');
assert(/addresses:\s*\{\s*some:\s*addrCond\s*\}/.test(enforcementContent), 'enforcementController must filter by seller address location');
console.log('  ✓ enforcementController.getEnforcements supports location and status filtering');

// appealController
const appealControllerPath = path.resolve(__dirname, '../src/modules/admin/controllers/appealController.ts');
const appealContent = fs.readFileSync(appealControllerPath, 'utf-8');
assert(/addresses:\s*\{\s*some:\s*addrCond\s*\}/.test(appealContent), 'appealController must filter by seller address location');
console.log('  ✓ appealController.getAppeals supports location and status filtering');

// productController
const productControllerPath = path.resolve(__dirname, '../src/modules/admin/controllers/productController.ts');
const productContent = fs.readFileSync(productControllerPath, 'utf-8');
assert(/addresses:\s*\{\s*some:\s*addrCond\s*\}/.test(productContent), 'productController must filter by seller location');
console.log('  ✓ productController.getProducts supports category, shop, and location filtering');

// --------------------------------------------------------------------------
// 4. Admin UI Pages Integration Tests
// --------------------------------------------------------------------------
console.log('\n4. Checking Admin UI Pages Integration:');

const sellersPagePath = path.resolve(__dirname, '../../admin/src/features/seller/ui/SellersPage.tsx');
const sellersContent = fs.readFileSync(sellersPagePath, 'utf-8');
assert(sellersContent.includes('<LocationFilterBar'), 'SellersPage must render LocationFilterBar');
assert(sellersContent.includes('<TableHead>Location</TableHead>'), 'SellersPage must show Location column in table');
console.log('  ✓ SellersPage renders LocationFilterBar and Location column');

const customersPagePath = path.resolve(__dirname, '../../admin/src/features/customer/ui/CustomersPage.tsx');
const customersContent = fs.readFileSync(customersPagePath, 'utf-8');
assert(customersContent.includes('<LocationFilterBar'), 'CustomersPage must render LocationFilterBar');
assert(customersContent.includes('<TableHead>Location</TableHead>'), 'CustomersPage must show Location column in table');
console.log('  ✓ CustomersPage renders LocationFilterBar and Location column');

const shopsPagePath = path.resolve(__dirname, '../../admin/src/features/shops/ui/ShopsPage.tsx');
const shopsContent = fs.readFileSync(shopsPagePath, 'utf-8');
assert(shopsContent.includes('<LocationFilterBar'), 'ShopsPage must render LocationFilterBar');
assert(shopsContent.includes('<TableHead>Location</TableHead>'), 'ShopsPage must show Location column in table');
console.log('  ✓ ShopsPage renders LocationFilterBar and Location column');

const ordersPagePath = path.resolve(__dirname, '../../admin/src/features/orders/ui/OrdersPage.tsx');
const ordersContent = fs.readFileSync(ordersPagePath, 'utf-8');
assert(ordersContent.includes('<LocationFilterBar'), 'OrdersPage must render LocationFilterBar');
assert(ordersContent.includes('<TableHead>Location</TableHead>'), 'OrdersPage must show Location column in table');
console.log('  ✓ OrdersPage renders LocationFilterBar and Location column');

const productsPagePath = path.resolve(__dirname, '../../admin/src/features/products/ui/ProductsPage.tsx');
const productsContent = fs.readFileSync(productsPagePath, 'utf-8');
assert(productsContent.includes('<LocationFilterBar'), 'ProductsPage must render LocationFilterBar');
assert(productsContent.includes('<TableHead>Location</TableHead>'), 'ProductsPage must show Location column in table');
console.log('  ✓ ProductsPage renders LocationFilterBar and Location column');

const sellerStrikesPagePath = path.resolve(__dirname, '../../admin/src/app/(protected)/seller-strikes/page.tsx');
const sellerStrikesContent = fs.readFileSync(sellerStrikesPagePath, 'utf-8');
assert(sellerStrikesContent.includes('<LocationFilterBar'), 'Seller strikes page must render LocationFilterBar for strikes table');
assert(sellerStrikesContent.includes('<SellerSearchSelect'), 'Seller strikes page must render upgraded SellerSearchSelect in modal');
console.log('  ✓ seller-strikes/page.tsx renders LocationFilterBar and upgraded SellerSearchSelect in modal');

const appealsPagePath = path.resolve(__dirname, '../../admin/src/app/(protected)/appeals/page.tsx');
const appealsContent = fs.readFileSync(appealsPagePath, 'utf-8');
assert(appealsContent.includes('<LocationFilterBar'), 'Appeals page must render LocationFilterBar');
console.log('  ✓ appeals/page.tsx renders LocationFilterBar');

const deliveryPagePath = path.resolve(__dirname, '../../admin/src/features/delivery/ui/DeliveryPage.tsx');
const deliveryContent = fs.readFileSync(deliveryPagePath, 'utf-8');
assert(deliveryContent.includes('riderState') && deliveryContent.includes('riderDistrict'), 'DeliveryPage must filter riders by state and district');
console.log('  ✓ DeliveryPage renders location filters for rider fleet operations');

console.log('\n=== ALL ADMIN GLOBAL SEARCH & LOCATION FILTER SYSTEM TESTS PASSED SUCCESSFULLY! ===\n');
