export const demoListingIds = [
  'studio-ceramics',
  'restored-desk-lamp',
  'natural-linen-set',
  'walnut-serving-board',
  'courier-tote',
  'botanical-print-set',
]

export const demoOrderIds = ['ord-1042', 'ord-1043']

export const initialListings = []

export const initialOrders = []

export const defaultAppStateByRole = {
  buyer: { favoriteIds: [], cartIds: [] },
  seller: { favoriteIds: [], cartIds: [] },
  admin: { favoriteIds: [], cartIds: [] },
}

export const initialUsers = [
  {
    id: 'usr-admin-ahmed',
    username: 'ahmed-bh91-admin',
    email: 'ahmed-bh91@live.com',
    phone: '66929266',
    password: '@khalid123Qwe',
    role: 'admin',
  },
  {
    id: 'usr-seller-ahmed',
    username: 'ahmed-bh91-seller',
    email: 'ahmed-bh91@hotmail.com',
    phone: '66663101',
    password: '@khalid123Qwe',
    role: 'seller',
  },
  {
    id: 'usr-buyer-mohd',
    username: 'mohd-bh91',
    email: 'mohd-bh91@hotmail.com',
    phone: '17681877',
    password: '@khalid123Qwe',
    role: 'buyer',
  },
]