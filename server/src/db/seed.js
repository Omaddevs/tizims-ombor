import bcrypt from 'bcryptjs'
import { generateAssetTag, generateBadgeCode, generateProductBarcode, generateQrToken } from '../utils/codes.js'

const hash = (pw) => bcrypt.hashSync(pw, 10)

function daysAgo(n, hour = 9) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export function seedData() {
  const orgId = 'org_tizims_uni'

  const organizations = [
    { id: orgId, name: 'Tizims Universiteti', slug: 'tizims-uni', brandColor: '#1d4ed8', createdAt: daysAgo(200) },
  ]

  const users = [
    {
      id: 'usr_super',
      orgId: null,
      name: 'Tizim Egasi',
      username: 'superadmin',
      email: 'superadmin@tizims.uz',
      passwordHash: hash('SuperAdmin123!'),
      role: 'super_admin',
      phone: '+998 90 000 00 00',
      avatarColor: '#0f172a',
      blocked: false,
      createdAt: daysAgo(200),
    },
    {
      id: 'usr_admin',
      orgId,
      name: 'Aziz Norqobilov',
      username: 'admin',
      email: 'admin@tizims-uni.uz',
      passwordHash: hash('Admin123!'),
      role: 'admin',
      phone: '+998 90 111 11 11',
      avatarColor: '#1d4ed8',
      blocked: false,
      createdAt: daysAgo(190),
    },
    {
      id: 'usr_manager',
      orgId,
      name: 'Shahnoza Rustamova',
      username: 'menejer',
      email: 'menejer@tizims-uni.uz',
      passwordHash: hash('Manager123!'),
      role: 'manager',
      phone: '+998 90 222 22 22',
      avatarColor: '#0891b2',
      blocked: false,
      createdAt: daysAgo(150),
    },
    {
      id: 'usr_omadbek',
      orgId,
      name: 'Omadbek Egamberdiyev',
      username: 'omadbek',
      email: 'omadbek@tizims-uni.uz',
      passwordHash: hash('Employee123!'),
      role: 'employee',
      phone: '+998 90 333 33 33',
      avatarColor: '#7c3aed',
      blocked: false,
      createdAt: daysAgo(120),
    },
  ]

  const categories = [
    { id: 'cat_elektronika', orgId, name: 'Elektronika', icon: 'laptop', description: 'Noutbuk, monitor, printer, kartridj va proyektor', archived: false },
    { id: 'cat_mebel', orgId, name: 'Ofis mebeli', icon: 'armchair', description: 'Stol, kreslo, shkaf va boshqa ofis mebellari', archived: false },
    { id: 'cat_kant', orgId, name: 'Kantselyariya', icon: 'pencil', description: 'Qog\'oz, marker va ofis uchun kantselyariya', archived: false },
    { id: 'cat_tarmoq', orgId, name: 'Tarmoq va aksessuarlar', icon: 'cable', description: 'Router, switch, UTP kabel va aksessuarlar', archived: false },
  ]

  const products = [
    { id: 'prod_lenovo', orgId, categoryId: 'cat_elektronika', name: 'Noutbuk Lenovo ThinkPad E14', unit: 'dona', barcode: generateProductBarcode(), quantity: 5, minStock: 3, price: 9500000, supplier: '"NordTech" MChJ', photoUrl: null, createdAt: daysAgo(180) },
    { id: 'prod_monitor', orgId, categoryId: 'cat_elektronika', name: 'Monitor Dell 24" FHD', unit: 'dona', barcode: generateProductBarcode(), quantity: 3, minStock: 4, price: 1850000, supplier: '"NordTech" MChJ', photoUrl: null, createdAt: daysAgo(180) },
    { id: 'prod_printer', orgId, categoryId: 'cat_elektronika', name: 'Printer HP LaserJet M15w', unit: 'dona', barcode: generateProductBarcode(), quantity: 2, minStock: 2, price: 2100000, supplier: '"OfisMarket" MChJ', photoUrl: null, createdAt: daysAgo(170) },
    { id: 'prod_toner', orgId, categoryId: 'cat_elektronika', name: 'Toner kartridj HP 12A', unit: 'dona', barcode: generateProductBarcode(), quantity: 3, minStock: 4, price: 320000, supplier: '"OfisMarket" MChJ', photoUrl: null, createdAt: daysAgo(160) },
    { id: 'prod_proyektor', orgId, categoryId: 'cat_elektronika', name: 'Proyektor Epson EB-X41', unit: 'dona', barcode: generateProductBarcode(), quantity: 1, minStock: 2, price: 5200000, supplier: '"NordTech" MChJ', photoUrl: null, createdAt: daysAgo(150) },
    { id: 'prod_kabel', orgId, categoryId: 'cat_tarmoq', name: 'Tarmoq kabeli UTP Cat6 (metr)', unit: 'metr', barcode: generateProductBarcode(), quantity: 120, minStock: 50, price: 4500, supplier: '"NetLine" MChJ', photoUrl: null, createdAt: daysAgo(140) },
    { id: 'prod_kombo', orgId, categoryId: 'cat_tarmoq', name: 'Klaviatura + sichqoncha combo', unit: 'komplekt', barcode: generateProductBarcode(), quantity: 9, minStock: 5, price: 180000, supplier: '"NordTech" MChJ', photoUrl: null, createdAt: daysAgo(140) },
    { id: 'prod_qogoz', orgId, categoryId: 'cat_kant', name: 'A4 qog\'oz (pachka, 500 varaq)', unit: 'pachka', barcode: generateProductBarcode(), quantity: 18, minStock: 15, price: 38000, supplier: '"OfisMarket" MChJ', photoUrl: null, createdAt: daysAgo(130) },
    { id: 'prod_marker', orgId, categoryId: 'cat_kant', name: 'Doska markeri (to\'plam, 4 rang)', unit: 'to\'plam', barcode: generateProductBarcode(), quantity: 2, minStock: 6, price: 45000, supplier: '"OfisMarket" MChJ', photoUrl: null, createdAt: daysAgo(120) },
    { id: 'prod_stul', orgId, categoryId: 'cat_mebel', name: 'Ofis kreslosi', unit: 'dona', barcode: generateProductBarcode(), quantity: 5, minStock: 2, price: 890000, supplier: '"Mebel Uz" MChJ', photoUrl: null, createdAt: daysAgo(100) },
    { id: 'prod_stol', orgId, categoryId: 'cat_mebel', name: 'Ish stoli 120x60', unit: 'dona', barcode: generateProductBarcode(), quantity: 3, minStock: 2, price: 1250000, supplier: '"Mebel Uz" MChJ', photoUrl: null, createdAt: daysAgo(100) },
  ]

  const employees = [
    { id: 'emp_dilnoza', orgId, userId: null, fullName: 'Dilnoza Karimova', department: 'Kadrlar bo\'limi', position: 'Mutaxassis', phone: '+998 90 123 45 67', badgeCode: generateBadgeCode(), photoUrl: null, status: 'active', hiredAt: daysAgo(240), createdAt: daysAgo(240) },
    { id: 'emp_malika', orgId, userId: null, fullName: 'Malika Yusupova', department: 'Buxgalteriya', position: 'Bosh hisobchi', phone: '+998 91 234 56 78', badgeCode: generateBadgeCode(), photoUrl: null, status: 'active', hiredAt: daysAgo(220), createdAt: daysAgo(220) },
    { id: 'emp_omadbek', orgId, userId: 'usr_omadbek', fullName: 'Omadbek Egamberdiyev', department: 'IT bo\'limi', position: 'Tizim administratori', phone: '+998 90 987 65 43', badgeCode: generateBadgeCode(), photoUrl: null, status: 'active', hiredAt: daysAgo(210), createdAt: daysAgo(210) },
    { id: 'emp_sardor', orgId, userId: null, fullName: 'Sardor Aliyev', department: 'AXCH bo\'limi', position: 'Omborchi', phone: '+998 93 456 78 90', badgeCode: generateBadgeCode(), photoUrl: null, status: 'active', hiredAt: daysAgo(175), createdAt: daysAgo(175) },
    { id: 'emp_sitora', orgId, userId: null, fullName: 'Sitora Abdullayeva', department: 'Savdo bo\'limi', position: 'Menejer', phone: '+998 90 222 11 33', badgeCode: generateBadgeCode(), photoUrl: null, status: 'on_leave', hiredAt: daysAgo(155), createdAt: daysAgo(155) },
    { id: 'emp_islom', orgId, userId: null, fullName: 'Islom Karimov', department: 'Logistika', position: 'Haydovchi', phone: '+998 94 333 22 11', badgeCode: generateBadgeCode(), photoUrl: null, status: 'active', hiredAt: daysAgo(115), createdAt: daysAgo(115) },
    { id: 'emp_azizbek', orgId, userId: null, fullName: 'Azizbek Tursunov', department: 'Xarid bo\'limi', position: 'Mutaxassis', phone: '+998 91 666 77 88', badgeCode: generateBadgeCode(), photoUrl: null, status: 'terminated', hiredAt: daysAgo(218), createdAt: daysAgo(218) },
    { id: 'emp_gulnoza', orgId, userId: null, fullName: 'Gulnoza Hasanova', department: 'Marketing', position: 'SMM mutaxassisi', phone: '+998 90 555 44 33', badgeCode: generateBadgeCode(), photoUrl: null, status: 'active', hiredAt: daysAgo(100), createdAt: daysAgo(100) },
  ]

  const rooms = [
    { id: `room_${orgId}_101`, orgId, number: '101', name: '101-xona · Ombor', building: 'Asosiy bino', floor: '1', createdAt: daysAgo(200) },
    { id: `room_${orgId}_201`, orgId, number: '201', name: '201-xona · O\'quv xonasi', building: 'Asosiy bino', floor: '2', createdAt: daysAgo(200) },
    { id: `room_${orgId}_204`, orgId, number: '204', name: '204-xona · Kompyuter xonasi', building: 'Asosiy bino', floor: '2', createdAt: daysAgo(200) },
    { id: `room_${orgId}_305`, orgId, number: '305', name: '305-xona · Ma\'muriyat', building: 'Asosiy bino', floor: '3', createdAt: daysAgo(200) },
  ]

  const transactions = [
    { id: 'txn_1', orgId, productId: 'prod_lenovo', type: 'in', quantity: 10, employeeId: null, performedByUserId: 'usr_admin', documentUrl: null, note: 'Boshlang\'ich yetkazib berish', supplier: '"NordTech" MChJ', status: 'completed', createdAt: daysAgo(180) },
    { id: 'txn_2', orgId, productId: 'prod_monitor', type: 'in', quantity: 8, employeeId: null, performedByUserId: 'usr_admin', documentUrl: null, note: 'Boshlang\'ich yetkazib berish', supplier: '"NordTech" MChJ', status: 'completed', createdAt: daysAgo(180) },
    { id: 'txn_3', orgId, productId: 'prod_qogoz', type: 'in', quantity: 40, employeeId: null, performedByUserId: 'usr_manager', documentUrl: null, note: 'Choraklik zaxira', supplier: '"OfisMarket" MChJ', status: 'completed', createdAt: daysAgo(30) },
    { id: 'txn_4', orgId, productId: 'prod_qogoz', type: 'out', quantity: 22, employeeId: 'emp_malika', performedByUserId: 'usr_manager', documentUrl: null, note: 'Buxgalteriya uchun', reason: 'internal', createdAt: daysAgo(20) },
    { id: 'txn_5', orgId, productId: 'prod_marker', type: 'in', quantity: 8, employeeId: null, performedByUserId: 'usr_manager', documentUrl: null, note: '', supplier: '"OfisMarket" MChJ', status: 'pending', createdAt: daysAgo(25) },
    { id: 'txn_6', orgId, productId: 'prod_marker', type: 'out', quantity: 6, employeeId: 'emp_dilnoza', performedByUserId: 'usr_manager', documentUrl: null, note: 'O\'quv xonalariga', reason: 'internal', createdAt: daysAgo(10) },
    { id: 'txn_7', orgId, productId: 'prod_lenovo', type: 'out', quantity: 1, employeeId: 'emp_omadbek', performedByUserId: 'usr_admin', documentUrl: null, note: 'IT bo\'limiga biriktirildi', reason: 'assign', createdAt: daysAgo(15) },
    { id: 'txn_8', orgId, productId: 'prod_kombo', type: 'in', quantity: 12, employeeId: null, performedByUserId: 'usr_manager', documentUrl: null, note: '', supplier: '"NordTech" MChJ', status: 'completed', createdAt: daysAgo(60) },
    { id: 'txn_9', orgId, productId: 'prod_kombo', type: 'out', quantity: 3, employeeId: 'emp_omadbek', performedByUserId: 'usr_admin', documentUrl: null, note: '', reason: 'other', createdAt: daysAgo(15) },
    { id: 'txn_10', orgId, productId: 'prod_toner', type: 'out', quantity: 1, employeeId: 'emp_sardor', performedByUserId: 'usr_manager', documentUrl: null, note: '', reason: 'damaged', createdAt: daysAgo(5) },
    { id: 'txn_11', orgId, productId: 'prod_proyektor', type: 'in', quantity: 3, employeeId: null, performedByUserId: 'usr_admin', documentUrl: null, note: 'Qisman partiya — qolgani kutilmoqda', supplier: '"NordTech" MChJ', status: 'partial', createdAt: daysAgo(150) },
    { id: 'txn_12', orgId, productId: 'prod_proyektor', type: 'out', quantity: 2, employeeId: 'emp_dilnoza', performedByUserId: 'usr_admin', documentUrl: null, note: 'Kadrlar bo\'limi tadbiri uchun', reason: 'internal', createdAt: daysAgo(3) },
    { id: 'txn_13', orgId, productId: 'prod_lenovo', type: 'out', quantity: 1, employeeId: null, roomId: `room_${orgId}_201`, performedByUserId: 'usr_admin', documentUrl: null, note: '201-xonaga biriktirish', reason: 'assign', createdAt: daysAgo(8) },
    { id: 'txn_14', orgId, productId: 'prod_monitor', type: 'out', quantity: 1, employeeId: null, roomId: `room_${orgId}_204`, performedByUserId: 'usr_admin', documentUrl: null, note: '204-xonaga biriktirish', reason: 'assign', createdAt: daysAgo(6) },
  ]

  const assignments = [
    {
      id: 'asg_1',
      orgId,
      productId: 'prod_lenovo',
      employeeId: 'emp_omadbek',
      roomId: null,
      targetType: 'employee',
      quantity: 1,
      qrToken: generateQrToken(),
      assetTag: generateAssetTag(1),
      status: 'active',
      assignedAt: daysAgo(15),
      confirmedAt: daysAgo(15, 10),
      confirmMethod: 'self',
      returnedAt: null,
    },
    {
      id: 'asg_2',
      orgId,
      productId: 'prod_kombo',
      employeeId: 'emp_omadbek',
      roomId: null,
      targetType: 'employee',
      quantity: 1,
      qrToken: generateQrToken(),
      assetTag: generateAssetTag(2),
      status: 'active',
      assignedAt: daysAgo(15),
      confirmedAt: daysAgo(15, 10),
      confirmMethod: 'self',
      returnedAt: null,
    },
    {
      id: 'asg_3',
      orgId,
      productId: 'prod_proyektor',
      employeeId: 'emp_dilnoza',
      roomId: null,
      targetType: 'employee',
      quantity: 1,
      qrToken: generateQrToken(),
      assetTag: generateAssetTag(3),
      status: 'pending',
      assignedAt: daysAgo(3),
      confirmedAt: null,
      confirmMethod: null,
      returnedAt: null,
    },
    {
      id: 'asg_4',
      orgId,
      productId: 'prod_lenovo',
      employeeId: null,
      roomId: `room_${orgId}_201`,
      targetType: 'room',
      quantity: 1,
      qrToken: generateQrToken(),
      assetTag: generateAssetTag(4),
      status: 'active',
      assignedAt: daysAgo(8),
      confirmedAt: daysAgo(8, 11),
      confirmMethod: 'room',
      returnedAt: null,
    },
    {
      id: 'asg_5',
      orgId,
      productId: 'prod_monitor',
      employeeId: null,
      roomId: `room_${orgId}_204`,
      targetType: 'room',
      quantity: 1,
      qrToken: generateQrToken(),
      assetTag: generateAssetTag(5),
      status: 'active',
      assignedAt: daysAgo(6),
      confirmedAt: daysAgo(6, 11),
      confirmMethod: 'room',
      returnedAt: null,
    },
  ]

  const notifications = [
    { id: 'ntf_1', orgId, userId: 'usr_omadbek', title: 'Buyum biriktirildi', body: 'Sizga Noutbuk Lenovo ThinkPad E14 biriktirildi. Qabul qilganingizni tasdiqlang.', type: 'assignment', read: true, createdAt: daysAgo(15) },
  ]

  return { organizations, users, categories, products, employees, rooms, transactions, assignments, notifications }
}
