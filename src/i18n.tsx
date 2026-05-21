import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Language = 'en' | 'zh';

const translations: Record<Language, Record<string, string>> = {
  en: {
    // App
    'app.title': 'ReOrder Pro',
    'app.loggedInAs': 'Logged in as',
    'app.signOut': 'Sign Out',

    // Nav
    'nav.lists': 'Lists',
    'nav.products': 'Products',
    'nav.vendors': 'Vendors',
    'nav.units': 'Units',
    'nav.users': 'Users',

    // Dashboard
    'dashboard.activeLists': 'Active Lists',
    'dashboard.products': 'Products',

    // Auth
    'auth.title': 'ReOrder Pro',
    'auth.subtitle': 'Restaurant Purchase Management',
    'auth.login': 'Sign In',
    'auth.signup': 'Create Account',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.switchToSignup': "Don't have an account? Create one",
    'auth.switchToLogin': 'Already have an account? Sign in',

    // Lists
    'lists.title': 'Purchase Lists',
    'lists.newList': 'New List',
    'lists.active': 'Active',
    'lists.archived': 'Archived',
    'lists.noLists': 'No {tab} lists',
    'lists.items': 'items',
    'lists.createTitle': 'Create Purchase List',
    'lists.listName': 'List Name',
    'lists.listNamePlaceholder': 'e.g. Friday Delivery',
    'lists.createList': 'Create List',
    'lists.deleteTitle': 'Delete List',
    'lists.deleteMessage': 'Are you sure?',
    'lists.ordered': 'Ordered',
    'lists.created': 'Created',

    // List Edit
    'listEdit.itemQuantity': 'Item Quantity',
    'listEdit.quantity': 'Quantity',
    'listEdit.unit': 'Unit',
    'listEdit.saveItem': 'Save Item',
    'listEdit.order': 'Order',
    'listEdit.searchPlaceholder': 'Search or type UPC...',
    'listEdit.scan': 'Scan',
    'listEdit.cancel': 'Cancel',
    'listEdit.itemsInList': 'Items in List',
    'listEdit.noItems': 'No items added yet',
    'listEdit.noItemsHint': 'Search or scan a barcode to add products',
    'listEdit.matchingProducts': 'Matching Products',
    'listEdit.unknownBarcode': 'Unknown Barcode',
    'listEdit.barcodeNotRegistered': 'is not registered.',
    'listEdit.createNew': 'Create New',
    'listEdit.linkToExisting': 'Link to Existing',
    'listEdit.productName': 'Name',
    'listEdit.vendor': 'Vendor',
    'listEdit.noVendor': 'No Vendor',
    'listEdit.createAndAdd': 'Create & Add to List',
    'listEdit.searchExisting': 'Search for existing product...',
    'listEdit.currentUpc': 'Current UPC',
    'listEdit.orderDetails': 'Order Details',
    'listEdit.orderDate': 'Order Date',
    'listEdit.orderNumber': 'Order Number (Optional)',
    'listEdit.orderNumberPlaceholder': 'e.g. #ORD-12345',
    'listEdit.confirmOrder': 'Confirm Order',
    'listEdit.archiveTitle': 'Archive List?',
    'listEdit.archiveMessage': 'This will hide the list from your active lists. Are you sure?',
    'listEdit.deleteTitle': 'Delete List?',
    'listEdit.deleteMessage': 'Are you sure you want to delete this purchase list? This cannot be undone.',
    'listEdit.removeItemTitle': 'Remove Item?',
    'listEdit.removeItemMessage': 'Are you sure you want to remove this item from the list?',

    // Products
    'products.title': 'Products',
    'products.addProduct': 'Add Product',
    'products.bulkCreate': 'Bulk Create',
    'products.filterPlaceholder': 'Filter products...',
    'products.noProducts': 'No products found',
    'products.editProduct': 'Edit Product',
    'products.productName': 'Product Name',
    'products.description': 'Description',
    'products.upcBarcodes': 'UPC / Barcodes',
    'products.scanOrTypeUpc': 'Scan or type UPC',
    'products.addAnotherUpc': 'Add another UPC',
    'products.vendors': 'Vendors',
    'products.saveProduct': 'Save Product',
    'products.deleteTitle': 'Delete Product',
    'products.deleteMessage': 'Are you sure you want to delete this product?',
    'products.noUpc': 'No UPC',
    'products.allVendors': 'All Vendors',
    'products.unassigned': 'Unassigned',
    'products.viewAll': 'All',
    'products.viewByVendor': 'By Vendor',
    'products.sortAZ': 'A→Z',
    'products.sortZA': 'Z→A',
    'products.sortNewest': 'Newest',
    'products.sortOldest': 'Oldest',
    // Bulk create
    'products.bulkCreateTitle': 'Bulk Create Products',
    'products.bulkVendorLabel': 'Vendor for all products',
    'products.bulkNamePlaceholder': 'Product name',
    'products.bulkUpcPlaceholder': 'UPC (optional)',
    'products.bulkCreated': 'Created products',
    'products.bulkDone': 'Done',

    // Vendors
    'vendors.title': 'Vendors',
    'vendors.addVendor': 'Add Vendor',
    'vendors.noVendors': 'No vendors registered',
    'vendors.editVendor': 'Edit Vendor',
    'vendors.name': 'Name',
    'vendors.description': 'Description',
    'vendors.save': 'Save',
    'vendors.deleteTitle': 'Delete Vendor',
    'vendors.deleteMessage': 'Are you sure?',
    'vendors.createNewVendor': 'New Vendor',
    'vendors.createVendor': 'Create Vendor',
    'vendors.creating': 'Creating...',
    'vendors.vendorName': 'Vendor name',
    'vendors.descriptionOptional': 'Description (optional)',
    'vendors.selectVendor': 'Select Vendor',
    'vendors.createNewOption': '＋ Create New Vendor...',

    // Units
    'units.title': 'Units',
    'units.addUnit': 'Add Unit',
    'units.noUnits': 'No units registered',
    'units.editUnit': 'Edit Unit',
    'units.name': 'Name',
    'units.abbreviation': 'Abbreviation',
    'units.save': 'Save',
    'units.deleteTitle': 'Delete Unit',
    'units.deleteMessage': 'Are you sure?',

    // Users
    'users.title': 'User Management',
    'users.addUser': 'Add User',
    'users.noUsers': 'No users found',
    'users.editUser': 'Edit User',
    'users.username': 'Username',
    'users.password': 'Password',
    'users.passwordHint': 'Leave blank to keep current',
    'users.role': 'Role',
    'users.admin': 'Admin',
    'users.standard': 'Standard',
    'users.save': 'Save',
    'users.deleteTitle': 'Delete User',
    'users.deleteMessage': 'Are you sure you want to delete this user?',
    'users.joined': 'Joined',

    // Scanner
    'scanner.title': 'Scan Barcode',
    'scanner.hint': 'Position the barcode inside the camera frame to scan it automatically.',
    'scanner.switchCamera': 'Switch Camera',

    // Confirm dialog
    'confirm.cancel': 'Cancel',
    'confirm.confirm': 'Confirm',

    // Toasts
    'toast.productCreated': 'Product created',
    'toast.productUpdated': 'Product updated',
    'toast.productDeleted': 'Product deleted',
    'toast.listCreated': 'List created',
    'toast.listDeleted': 'List deleted',
    'toast.listOrdered': 'List marked as ordered',
    'toast.listArchived': 'List archived',
    'toast.vendorCreated': 'Vendor created',
    'toast.vendorUpdated': 'Vendor updated',
    'toast.vendorDeleted': 'Vendor deleted',
    'toast.unitCreated': 'Unit created',
    'toast.unitUpdated': 'Unit updated',
    'toast.unitDeleted': 'Unit deleted',
    'toast.itemAdded': 'Item added to list',
    'toast.itemUpdated': 'Updated item quantity',
    'toast.upcLinked': 'UPC linked successfully',
    'toast.failedSave': 'Failed to save',
    'toast.failedDelete': 'Failed to delete',
    'toast.cameraPermissionDenied': 'Camera permission denied',
    'toast.scannerFailed': 'Failed to start scanner',
    'toast.networkError': 'Network error',
    'toast.duplicateUpc': 'A product with this UPC already exists',

    // Status
    'status.draft': 'DRAFT',
    'status.ordered': 'ORDERED',
    'lists.statusActive': 'ACTIVE',
    'lists.statusFinalized': 'FINALIZED',
  },
  zh: {
    // App
    'app.title': 'ReOrder Pro',
    'app.loggedInAs': '当前用户',
    'app.signOut': '退出登录',

    // Nav
    'nav.lists': '清单',
    'nav.products': '产品',
    'nav.vendors': '供应商',
    'nav.units': '单位',
    'nav.users': '用户',

    // Dashboard
    'dashboard.activeLists': '活跃清单',
    'dashboard.products': '产品',

    // Auth
    'auth.title': 'ReOrder Pro',
    'auth.subtitle': '餐厅采购管理系统',
    'auth.login': '登录',
    'auth.signup': '注册账号',
    'auth.username': '用户名',
    'auth.password': '密码',
    'auth.switchToSignup': '没有账号？立即注册',
    'auth.switchToLogin': '已有账号？立即登录',

    // Lists
    'lists.title': '采购清单',
    'lists.newList': '新建清单',
    'lists.active': '进行中',
    'lists.archived': '已归档',
    'lists.noLists': '没有{tab}清单',
    'lists.items': '项',
    'lists.createTitle': '创建采购清单',
    'lists.listName': '清单名称',
    'lists.listNamePlaceholder': '例如：周五配送',
    'lists.createList': '创建清单',
    'lists.deleteTitle': '删除清单',
    'lists.deleteMessage': '确定要删除吗？',
    'lists.ordered': '已下单',
    'lists.created': '创建于',

    // List Edit
    'listEdit.itemQuantity': '商品数量',
    'listEdit.quantity': '数量',
    'listEdit.unit': '单位',
    'listEdit.saveItem': '保存',
    'listEdit.order': '下单',
    'listEdit.searchPlaceholder': '搜索或输入条码...',
    'listEdit.scan': '扫码',
    'listEdit.cancel': '取消',
    'listEdit.itemsInList': '清单项目',
    'listEdit.noItems': '尚未添加项目',
    'listEdit.noItemsHint': '搜索或扫描条码以添加产品',
    'listEdit.matchingProducts': '匹配的产品',
    'listEdit.unknownBarcode': '未知条码',
    'listEdit.barcodeNotRegistered': '尚未注册。',
    'listEdit.createNew': '新建产品',
    'listEdit.linkToExisting': '关联已有产品',
    'listEdit.productName': '名称',
    'listEdit.vendor': '供应商',
    'listEdit.noVendor': '无供应商',
    'listEdit.createAndAdd': '创建并添加到清单',
    'listEdit.searchExisting': '搜索已有产品...',
    'listEdit.currentUpc': '当前条码',
    'listEdit.orderDetails': '下单详情',
    'listEdit.orderDate': '下单日期',
    'listEdit.orderNumber': '订单号（可选）',
    'listEdit.orderNumberPlaceholder': '例如：#ORD-12345',
    'listEdit.confirmOrder': '确认下单',
    'listEdit.archiveTitle': '归档清单？',
    'listEdit.archiveMessage': '此操作将从活跃清单中隐藏该清单，确定吗？',
    'listEdit.deleteTitle': '删除清单？',
    'listEdit.deleteMessage': '确定要删除此采购清单吗？此操作不可撤销。',
    'listEdit.removeItemTitle': '移除项目？',
    'listEdit.removeItemMessage': '确定要从清单中移除此项目吗？',

    // Products
    'products.title': '产品',
    'products.addProduct': '添加产品',
    'products.bulkCreate': '批量创建',
    'products.filterPlaceholder': '筛选产品...',
    'products.noProducts': '未找到产品',
    'products.editProduct': '编辑产品',
    'products.productName': '产品名称',
    'products.description': '描述',
    'products.upcBarcodes': '条码',
    'products.scanOrTypeUpc': '扫描或输入条码',
    'products.addAnotherUpc': '添加更多条码',
    'products.vendors': '供应商',
    'products.saveProduct': '保存产品',
    'products.deleteTitle': '删除产品',
    'products.deleteMessage': '确定要删除此产品吗？',
    'products.noUpc': '无条码',
    'products.allVendors': '全部供应商',
    'products.unassigned': '未分配',
    'products.viewAll': '全部',
    'products.viewByVendor': '按供应商',
    'products.sortAZ': 'A→Z',
    'products.sortZA': 'Z→A',
    'products.sortNewest': '最新',
    'products.sortOldest': '最早',
    // Bulk create
    'products.bulkCreateTitle': '批量创建产品',
    'products.bulkVendorLabel': '所有产品的供应商',
    'products.bulkNamePlaceholder': '产品名称',
    'products.bulkUpcPlaceholder': '条码（可选）',
    'products.bulkCreated': '已创建的产品',
    'products.bulkDone': '完成',

    // Vendors
    'vendors.title': '供应商',
    'vendors.addVendor': '添加供应商',
    'vendors.noVendors': '暂无供应商',
    'vendors.editVendor': '编辑供应商',
    'vendors.name': '名称',
    'vendors.description': '描述',
    'vendors.save': '保存',
    'vendors.deleteTitle': '删除供应商',
    'vendors.deleteMessage': '确定要删除吗？',
    'vendors.createNewVendor': '新建供应商',
    'vendors.createVendor': '创建供应商',
    'vendors.creating': '创建中...',
    'vendors.vendorName': '供应商名称',
    'vendors.descriptionOptional': '描述（可选）',
    'vendors.selectVendor': '选择供应商',
    'vendors.createNewOption': '＋ 新建供应商...',

    // Units
    'units.title': '单位',
    'units.addUnit': '添加单位',
    'units.noUnits': '暂无单位',
    'units.editUnit': '编辑单位',
    'units.name': '名称',
    'units.abbreviation': '缩写',
    'units.save': '保存',
    'units.deleteTitle': '删除单位',
    'units.deleteMessage': '确定要删除吗？',

    // Users
    'users.title': '用户管理',
    'users.addUser': '添加用户',
    'users.noUsers': '未找到用户',
    'users.editUser': '编辑用户',
    'users.username': '用户名',
    'users.password': '密码',
    'users.passwordHint': '留空则保持不变',
    'users.role': '角色',
    'users.admin': '管理员',
    'users.standard': '普通用户',
    'users.save': '保存',
    'users.deleteTitle': '删除用户',
    'users.deleteMessage': '确定要删除此用户吗？',
    'users.joined': '注册于',

    // Scanner
    'scanner.title': '扫描条码',
    'scanner.hint': '将条码对准相机框架即可自动扫描。',
    'scanner.switchCamera': '切换摄像头',

    // Confirm dialog
    'confirm.cancel': '取消',
    'confirm.confirm': '确认',

    // Toasts
    'toast.productCreated': '产品已创建',
    'toast.productUpdated': '产品已更新',
    'toast.productDeleted': '产品已删除',
    'toast.listCreated': '清单已创建',
    'toast.listDeleted': '清单已删除',
    'toast.listOrdered': '清单已标记为已下单',
    'toast.listArchived': '清单已归档',
    'toast.vendorCreated': '供应商已创建',
    'toast.vendorUpdated': '供应商已更新',
    'toast.vendorDeleted': '供应商已删除',
    'toast.unitCreated': '单位已创建',
    'toast.unitUpdated': '单位已更新',
    'toast.unitDeleted': '单位已删除',
    'toast.itemAdded': '已添加到清单',
    'toast.itemUpdated': '已更新数量',
    'toast.upcLinked': '条码关联成功',
    'toast.failedSave': '保存失败',
    'toast.failedDelete': '删除失败',
    'toast.cameraPermissionDenied': '摄像头权限被拒绝',
    'toast.scannerFailed': '启动扫描器失败',
    'toast.networkError': '网络错误',
    'toast.duplicateUpc': '此条码已被其他产品使用',

    // Status
    'status.draft': '草稿',
    'status.ordered': '已下单',
    'lists.statusActive': '进行中',
    'lists.statusFinalized': '已完成',
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('reorder-lang');
    return (saved === 'zh' ? 'zh' : 'en') as Language;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('reorder-lang', lang);
  }, []);

  const t = useCallback((key: string, replacements?: Record<string, string>): string => {
    let text = translations[language][key] || translations.en[key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  }, [language]);

  return React.createElement(LanguageContext.Provider, { value: { language, setLanguage, t } }, children);
}

export function useTranslation() {
  return useContext(LanguageContext);
}

export function LanguageToggle() {
  const { language, setLanguage } = useTranslation();
  return (
    <button 
      onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
      className="px-3 min-touch-target py-1.5 rounded-xl bg-gray-800 text-teal-400 font-bold text-xs uppercase tracking-wider border border-teal-500/20 hover:bg-teal-500/10 transition-all-200"
    >
      {language === 'en' ? '中文' : 'EN'}
    </button>
  );
}
