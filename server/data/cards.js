// 三大牌庫（v2 M8）：機會卡（小生意/大買賣）、市場風雲卡、額外支出卡
// 目標貼近真實現金流並現代化（ETF / AI / 加密貨幣 / 現代商業）

// ── 機會卡：小額機會（便宜、現金少時可玩） ──
// 只放「房地產 + 事業」（股票/ETF/加密/債券改到市場自由買賣，不出現在機會卡）
// 欄位：cost 現金頭期；fullValue 帳面價值；mortgage 連動貸款；monthlyIncome 每月淨現金流（可為負）
//   realestate 另有 priceLow/priceHigh＝賣出/收購的售價範圍（增值潛力）；story 情境故事
export const SMALL_DEALS = [
  // 房地產（小）── 淨月收皆調降至年化約 40%（比市場架上房地產約 30% 略高，保留「機會卡撿到便宜」的手感，但不再誇張）
  { id: 'sd_foreclosed', name: '法拍套房 ‧ 士林', emoji: '🏠', category: 'realestate', location: '士林', roomType: '套房', cost: 50000, fullValue: 400000, mortgage: 350000, monthlyIncome: 1700, priceLow: 380000, priceHigh: 540000, story: '士林捷運站旁的法拍套房，屋況普通但地點好，租給學生穩穩收租。' },
  { id: 'sd_rooftop', name: '頂樓加蓋套房 ‧ 士林', emoji: '🏠', category: 'realestate', location: '士林', roomType: '套房', cost: 40000, fullValue: 300000, mortgage: 260000, monthlyIncome: 1300, priceLow: 270000, priceHigh: 380000, story: '頂樓加蓋分租套房，租金報酬不錯，但頂加有被報拆的風險。' },
  { id: 'sd_parking_re', name: '車位出租 ‧ 天母', emoji: '🅿️', category: 'realestate', location: '天母', roomType: '車位', cost: 80000, fullValue: 80000, monthlyIncome: 1500, priceLow: 70000, priceHigh: 120000, story: '天母精華區的產權車位，無貸款、好出租，未來也保值。' },
  { id: 'sd_oldflat', name: '老公寓分租 ‧ 士林', emoji: '🏠', category: 'realestate', location: '士林', roomType: '一房一廳', cost: 90000, fullValue: 700000, mortgage: 610000, monthlyIncome: 3000, priceLow: 650000, priceHigh: 1100000, story: '老公寓隔成雅房分租，現金流佳，且位在傳聞要都更的區域。' },
  { id: 'sd_landlot', name: '重劃區小套房 ‧ 士林（養房）', emoji: '🏚️', category: 'realestate', location: '士林', roomType: '套房', cost: 30000, fullValue: 350000, mortgage: 320000, monthlyIncome: -500, priceLow: 350000, priceHigh: 700000, renewal: true, story: '位在重劃區邊緣，現在每月還要倒貼一點，但一旦重劃通過，價格可能翻倍！' },
  // 事業（小）
  { id: 'sd_vending', name: '二手販賣機一台', emoji: '🥤', category: 'business', cost: 60000, fullValue: 60000, monthlyIncome: 2000, story: '頂讓一台二手飲料販賣機，擺在補習班樓下，幾乎被動收入。' },
  { id: 'sd_claw', name: '路邊夾娃娃機台', emoji: '🎰', category: 'business', cost: 40000, fullValue: 40000, monthlyIncome: 1300, story: '夜市旁的夾娃娃機台，補貨擺台就有收入。' },
  { id: 'sd_laundry', name: '自助洗衣店一台', emoji: '🧺', category: 'business', cost: 80000, fullValue: 80000, monthlyIncome: 2700, story: '社區自助洗衣，投幣式經營、幾乎不用顧店。' },
  { id: 'sd_bubble_share', name: '朋友手搖飲小股', emoji: '🧋', category: 'business', cost: 30000, fullValue: 30000, monthlyIncome: 1000, story: '同學開手搖飲店缺資金，找你入股分潤。' },
  { id: 'sd_podcast', name: 'Podcast 廣告分潤', emoji: '🎙️', category: 'business', cost: 25000, fullValue: 25000, monthlyIncome: 800, story: '人氣 Podcast 開放廣告分潤入股，內容紅就有錢分。' },
  { id: 'sd_petgroom', name: '寵物美容工作室小股', emoji: '✂️', category: 'business', cost: 45000, fullValue: 45000, monthlyIncome: 1500, story: '寵物商機正夯，朋友的寵物美容工作室找你合夥。' },
  { id: 'sd_ecom', name: '學弟的電商代購', emoji: '📦', category: 'business', cost: 35000, fullValue: 35000, monthlyIncome: 1200, story: '學弟做日韓代購生意，找你出資擴大進貨。' },
  { id: 'sd_solar', name: '小型太陽能板（售電）', emoji: '🔆', category: 'business', cost: 70000, fullValue: 70000, monthlyIncome: 2300, story: '在自家頂樓裝太陽能板賣電給台電，穩定領售電金。' },
  { id: 'sd_aiart', name: 'AI 繪圖接案工作室', emoji: '🎨', category: 'business', cost: 30000, fullValue: 30000, monthlyIncome: 1000, story: '用 AI 工具接設計案，投入設備後接案賺錢。' },
  { id: 'sd_breakfast', name: '早餐店頂讓 ‧ 士林', emoji: '🥪', category: 'business', cost: 100000, fullValue: 100000, monthlyIncome: 3300, story: '老闆要退休，頂讓生意穩定的社區早餐店。' },
  { id: 'sd_chicken', name: '雞排攤一攤', emoji: '🍗', category: 'business', cost: 50000, fullValue: 50000, monthlyIncome: 1700, story: '夜市排隊雞排攤要找人加盟，現金生意。' },
  { id: 'sd_charger', name: '電動車充電樁', emoji: '🔌', category: 'business', cost: 120000, fullValue: 120000, monthlyIncome: 3500, story: '電動車越來越多，設一支充電樁開始收充電費。' },
  { id: 'sd_bookstore', name: '二手書店小股', emoji: '📚', category: 'business', cost: 30000, fullValue: 30000, monthlyIncome: 1000, story: '巷弄裡的文青二手書店找你入股分潤。' },
];

// ── 機會卡：大額機會（昂貴、現金多才玩得起） ──
export const BIG_DEALS = [
  // 房地產（大）── 淨月收皆調降至年化約 40%
  { id: 'bd_apartment', name: '整棟公寓 ‧ 天母', emoji: '🏢', category: 'realestate', location: '天母', roomType: '整棟公寓', cost: 150000, fullValue: 1200000, mortgage: 1050000, monthlyIncome: 5000, priceLow: 1100000, priceHigh: 1700000, story: '天母整棟 12 戶出租公寓，滿租中，金流穩、增值空間大。' },
  { id: 'bd_office', name: '辦公室 ‧ 士林', emoji: '🏬', category: 'realestate', location: '士林', roomType: '辦公室', cost: 250000, fullValue: 2000000, mortgage: 1750000, monthlyIncome: 8300, priceLow: 1800000, priceHigh: 2800000, story: '士林整層商辦，租給新創公司，景氣好時很搶手。' },
  { id: 'bd_4r_tianmu', name: '四房一廳豪宅 ‧ 天母', emoji: '🏯', category: 'realestate', location: '天母', roomType: '四房一廳', cost: 300000, fullValue: 2500000, mortgage: 2200000, monthlyIncome: 10000, priceLow: 2300000, priceHigh: 3600000, story: '天母明星學區豪宅，租金高、抗跌保值。' },
  { id: 'bd_bnb', name: '三房一廳民宿 ‧ 天母', emoji: '🏡', category: 'realestate', location: '天母', roomType: '三房一廳', cost: 200000, fullValue: 1500000, mortgage: 1300000, monthlyIncome: 6700, priceLow: 1400000, priceHigh: 2100000, story: '改成合法民宿經營，觀光旺季收入可觀。' },
  { id: 'bd_storefront', name: '店面 ‧ 士林夜市旁', emoji: '🏪', category: 'realestate', location: '士林', roomType: '店面', cost: 400000, fullValue: 3500000, mortgage: 3100000, monthlyIncome: 13300, priceLow: 3200000, priceHigh: 5200000, story: '士林夜市黃金店面，人潮就是錢潮，店面增值想像空間大。' },
  { id: 'bd_renewal', name: '都更老屋 ‧ 士林（等都更）', emoji: '🏚️', category: 'realestate', location: '士林', roomType: '三房一廳', cost: 300000, fullValue: 2600000, mortgage: 2400000, monthlyIncome: 1500, priceLow: 2600000, priceHigh: 5000000, renewal: true, story: '老屋租金不高、每月只小賺，但已納入都更計畫，一旦通過分回新屋，價值可能近翻倍！' },
  { id: 'bd_warehouse', name: '辦公室（整層）‧ 天母', emoji: '🏬', category: 'realestate', location: '天母', roomType: '辦公室', cost: 350000, fullValue: 3000000, mortgage: 2650000, monthlyIncome: 11700, priceLow: 2800000, priceHigh: 4300000, story: '天母整層辦公室，企業長約承租，金流穩定。' },
  // 事業（大）
  { id: 'bd_bubble', name: '加盟連鎖手搖飲', emoji: '🧋', category: 'business', cost: 300000, fullValue: 300000, monthlyIncome: 10000, story: '加盟知名手搖飲品牌，展店就有穩定權利金收入。' },
  { id: 'bd_youtube', name: '收購經營中的 YouTube 頻道', emoji: '🎬', category: 'business', cost: 500000, fullValue: 500000, monthlyIncome: 16700, story: '買下一個百萬訂閱頻道，接手後持續領廣告分潤。' },
  { id: 'bd_saas', name: 'AI SaaS 訂閱公司股權', emoji: '🤖', category: 'business', cost: 400000, fullValue: 400000, monthlyIncome: 13300, story: '入股一家 AI 訂閱軟體公司，每月收訂閱費分潤。' },
  { id: 'bd_cvs', name: '連鎖超商加盟店', emoji: '🏪', category: 'business', cost: 600000, fullValue: 600000, monthlyIncome: 20000, story: '加盟一間 24 小時超商，地點好、客流穩。' },
  { id: 'bd_parking_biz', name: '停車場經營權', emoji: '🅿️', category: 'business', cost: 450000, fullValue: 450000, monthlyIncome: 15000, story: '標下市區停車場經營權，車位天天有人停。' },
  { id: 'bd_gym', name: '連鎖健身房股權', emoji: '🏋️', category: 'business', cost: 350000, fullValue: 350000, monthlyIncome: 11700, story: '入股連鎖健身房，會員月費就是穩定金流。' },
  { id: 'bd_carwash', name: '連鎖洗車場', emoji: '🚗', category: 'business', cost: 400000, fullValue: 400000, monthlyIncome: 13300, story: '自動洗車連鎖店，設備投入後幾乎自動營運。' },
  { id: 'bd_kitchen', name: '餐飲品牌中央廚房', emoji: '🍱', category: 'business', cost: 700000, fullValue: 700000, monthlyIncome: 23300, story: '供應多家餐廳的中央廚房，規模化後利潤豐厚。' },
  { id: 'bd_unmanned', name: '無人商店連鎖', emoji: '🛒', category: 'business', cost: 380000, fullValue: 380000, monthlyIncome: 12700, story: '24 小時無人商店，省人力、自動結帳。' },
  { id: 'bd_livestream', name: '直播帶貨團隊', emoji: '📡', category: 'business', cost: 320000, fullValue: 320000, monthlyIncome: 10700, story: '投資一支直播帶貨團隊，銷售抽成月月入帳。' },
  { id: 'bd_pethotel', name: '寵物旅館', emoji: '🐾', category: 'business', cost: 350000, fullValue: 350000, monthlyIncome: 11700, story: '寵物寄宿旅館，連假一位難求。' },
  { id: 'bd_cowork', name: '共享辦公室', emoji: '💼', category: 'business', cost: 500000, fullValue: 500000, monthlyIncome: 16700, story: '經營共享辦公空間，收會員月租。' },
  { id: 'bd_solarfarm', name: '農地種電場', emoji: '🌾', category: 'business', cost: 600000, fullValue: 600000, monthlyIncome: 20000, story: '在農地架設大型太陽能電場，長期售電給台電。' },
];

// ── 超級生意（財富自由後專屬）──
// 給已經跳出老鼠圈的玩家：報酬率極高（年化約 100~130%）、但「本金不用很大」（多在 15~50 萬），
// 讓自由玩家輕鬆以錢滾錢、快速堆高被動收入去圓夢。全歸類 business（算企業被動收入）。
export const SUPER_DEALS = [
  { id: 'su_unicorn', name: 'AI 獨角獸早期股權', emoji: '🦄', category: 'business', cost: 300000, fullValue: 300000, monthlyIncome: 32000, story: '搶進一家準上市的 AI 獨角獸早期股權，成長爆發、分潤驚人。' },
  { id: 'su_franchise', name: '連鎖品牌總部分潤', emoji: '🏢', category: 'business', cost: 400000, fullValue: 400000, monthlyIncome: 40000, story: '入股知名連鎖品牌總部，全台展店的權利金月月分你一份。' },
  { id: 'su_agency', name: '網紅經紀公司股權', emoji: '🌟', category: 'business', cost: 250000, fullValue: 250000, monthlyIncome: 27000, story: '旗下一票百萬網紅的經紀公司，接不完的業配都在抽成。' },
  { id: 'su_onsen', name: '包棟溫泉民宿（旺季爆滿）', emoji: '♨️', category: 'business', cost: 500000, fullValue: 500000, monthlyIncome: 50000, story: '整棟高檔溫泉民宿，連假一房難求，現金流強得誇張。' },
  { id: 'su_fund', name: '私募基金入股', emoji: '💼', category: 'business', cost: 200000, fullValue: 200000, monthlyIncome: 21000, story: '被邀請加入只給有錢人的私募基金，配息又高又穩。' },
  { id: 'su_concert', name: '演唱會主辦分潤', emoji: '🎤', category: 'business', cost: 300000, fullValue: 300000, monthlyIncome: 33000, story: '當大型演唱會的幕後金主，一場售罄就回本一大半。' },
  { id: 'su_ip', name: '熱門手遊 IP 授權', emoji: '🎮', category: 'business', cost: 150000, fullValue: 150000, monthlyIncome: 17000, story: '手上握著一個爆紅手遊的聯名 IP，周邊與抽卡都在替你賺。' },
  { id: 'su_charger', name: '電動車充電網加盟主', emoji: '🔌', category: 'business', cost: 350000, fullValue: 350000, monthlyIncome: 37000, story: '成為全區電動車充電網的加盟主，每一度電都在幫你數錢。' },
  { id: 'su_saas', name: 'AI SaaS 獨角獸 B 輪', emoji: '🤖', category: 'business', cost: 450000, fullValue: 450000, monthlyIncome: 46000, story: '投進一輪就翻倍的 AI 訂閱軟體，訂閱戶暴增、月月現金流。' },
  { id: 'su_michelin', name: '米其林餐廳合夥人', emoji: '🍽️', category: 'business', cost: 400000, fullValue: 400000, monthlyIncome: 42000, story: '掛名米其林餐廳的合夥人，訂位排到三個月後。' },
  { id: 'su_space', name: '太空觀光公司股權', emoji: '🚀', category: 'business', cost: 500000, fullValue: 500000, monthlyIncome: 55000, story: '投資民間太空旅遊公司，船票一開賣就被富豪秒殺，訂單排到五年後。' },
  { id: 'su_esports', name: '電競冠軍戰隊', emoji: '🏆', category: 'business', cost: 300000, fullValue: 300000, monthlyIncome: 33000, story: '旗下戰隊拿下世界冠軍，贊助商與轉播權利金一夜爆量。' },
  { id: 'su_whisky', name: '限量威士忌酒桶收藏', emoji: '🥃', category: 'business', cost: 250000, fullValue: 250000, monthlyIncome: 28000, story: '囤一批限量單桶威士忌，越陳越貴、藏家排隊搶著加價收。' },
  { id: 'su_medbeauty', name: '頂級醫美診所連鎖', emoji: '💉', category: 'business', cost: 400000, fullValue: 400000, monthlyIncome: 44000, story: '貴婦名媛都來報到的醫美連鎖，回頭客多到預約要等三個月。' },
  { id: 'su_meta', name: '元宇宙虛擬地產', emoji: '🌐', category: 'business', cost: 200000, fullValue: 200000, monthlyIncome: 22000, story: '在爆紅的元宇宙裡買下黃金地段，品牌搶著進駐、虛擬店租月月收。' },
  { id: 'su_racing', name: '賽車車隊冠名權', emoji: '🏎️', category: 'business', cost: 450000, fullValue: 450000, monthlyIncome: 49000, story: '冠名一支方程式賽車隊，全球轉播時你的品牌就是移動廣告看板。' },
  { id: 'su_artfund', name: '名畫藝術品基金', emoji: '🖼️', category: 'business', cost: 350000, fullValue: 350000, monthlyIncome: 38000, story: '入股藝術品基金，名畫增值加上出借美術館展覽，兩頭都在分潤。' },
  { id: 'su_marina', name: '頂級遊艇碼頭經營', emoji: '⚓', category: 'business', cost: 400000, fullValue: 400000, monthlyIncome: 43000, story: '經營富豪停遊艇的碼頭，光一個泊位的月租就抵人家一份薪水。' },
  { id: 'su_pharma', name: 'AI 新藥研發新創', emoji: '💊', category: 'business', cost: 300000, fullValue: 300000, monthlyIncome: 32000, story: '投資用 AI 加速新藥開發的新創，一次解盲成功估值就狂飆。' },
  { id: 'su_coffee', name: '得獎精品咖啡莊園', emoji: '☕', category: 'business', cost: 150000, fullValue: 150000, monthlyIncome: 17000, story: '買下一座國際得獎的咖啡莊園，一公斤精品豆能賣到好幾千元。' },
];

// ── 市場風雲卡（影響全班） ──
// kind='price'：把符合 targetCategory 或 targetTag 的資產價值 ×factor
// kind='windfall'：全班每人現金 +amount（可負）
export const MARKET_CARDS = [
  { id: 'mk_ai_boom', kind: 'price', name: 'AI 浪潮來襲', emoji: '🚀', desc: '所有 AI 相關資產 +40%', targetTag: 'ai', factor: 1.4 },
  { id: 'mk_ai_bust', kind: 'price', name: 'AI 泡沫破裂', emoji: '💥', desc: '所有 AI 相關資產 -35%', targetTag: 'ai', factor: 0.65 },
  { id: 'mk_ai_acq', kind: 'price', name: '某 AI 新創被天價收購', emoji: '🤝', desc: 'AI 相關資產 +25%', targetTag: 'ai', factor: 1.25 },
  { id: 'mk_btc_halving', kind: 'price', name: '比特幣減半行情', emoji: '🪙', desc: '加密貨幣 +60%', targetCategory: 'crypto', factor: 1.6 },
  { id: 'mk_crypto_crash', kind: 'price', name: '幣圈大崩盤', emoji: '📉', desc: '加密貨幣 -50%', targetCategory: 'crypto', factor: 0.5 },
  { id: 'mk_meme_viral', kind: 'price', name: '迷因幣爆紅', emoji: '🐶', desc: '加密貨幣 +80%', targetCategory: 'crypto', factor: 1.8 },
  { id: 'mk_stock_high', kind: 'price', name: '台股創新高', emoji: '📈', desc: '股票 / ETF +10%', targetCategory: 'dividend', factor: 1.1 },
  { id: 'mk_stock_crash', kind: 'price', name: '股市拉回', emoji: '🔻', desc: '股票 / ETF -12%', targetCategory: 'dividend', factor: 0.88 },
  { id: 'mk_gold_surge', kind: 'price', name: '黃金價格飆升', emoji: '🥇', desc: '原物料 +30%', targetCategory: 'commodity', factor: 1.3 },
  { id: 'mk_oil_shock', kind: 'price', name: '石油危機', emoji: '🛢️', desc: '原物料 +25%', targetCategory: 'commodity', factor: 1.25 },
  { id: 'mk_re_boom', kind: 'price', name: '房市多頭', emoji: '🏠', desc: '房地產 +12%', targetCategory: 'realestate', factor: 1.12 },
  { id: 'mk_re_curb', kind: 'price', name: '政府打房', emoji: '🏚️', desc: '房地產 -10%', targetCategory: 'realestate', factor: 0.9 },
  { id: 'mk_biz_up', kind: 'price', name: '企業景氣回升', emoji: '📊', desc: '企業資產價值 +10%', targetCategory: 'business', factor: 1.1 },
  { id: 'mk_voucher', kind: 'windfall', name: '政府發消費券', emoji: '🎁', desc: '每人 +6,000', amount: 6000 },
  { id: 'mk_cash', kind: 'windfall', name: '全民普發現金', emoji: '🧧', desc: '每人 +10,000', amount: 10000 },
  { id: 'mk_taxback', kind: 'windfall', name: '報稅退稅', emoji: '📋', desc: '每人 +5,000', amount: 5000 },
  { id: 'mk_pandemic', kind: 'windfall', name: '疫情衝擊', emoji: '🦠', desc: '每人 -8,000', amount: -8000 },
  { id: 'mk_oil', kind: 'windfall', name: '油價大漲', emoji: '⛽', desc: '每人 -5,000', amount: -5000 },
  { id: 'mk_power', kind: 'windfall', name: '電費調漲', emoji: '💡', desc: '每人 -3,000', amount: -3000 },
  { id: 'mk_scratch', kind: 'windfall', name: '刮刮樂大放送', emoji: '🎟️', desc: '每人 +8,000', amount: 8000 },
  { id: 'mk_yearend', kind: 'windfall', name: '尾牙抽中大獎', emoji: '🎉', desc: '每人 +5,000', amount: 5000 },
  { id: 'mk_wedding', kind: 'windfall', name: '朋友結婚包紅包', emoji: '💒', desc: '每人 -3,600', amount: -3600 },
  { id: 'mk_scam', kind: 'windfall', name: '網購被詐騙', emoji: '🚨', desc: '每人 -6,000', amount: -6000 },
];

// ── 額外支出卡（強制消費，不得違抗） ──
// recurring=true 代表變成每月固定支出（加到 expenses.other）
// requires='realestate'（要有出租房）或 'child'（要有小孩）才會發生，否則「幸好沒有，免了」
export const DOODAD_CARDS = [
  // 連動型：有出租房才會遇到
  { id: 'dd_tenant', name: '房客落跑、屋況受損', emoji: '🏚️', amount: 10000, requires: 'realestate', story: '房客兩個月沒付租金又搞壞房子，保險理賠後你還要自掏腰包。' },
  { id: 'dd_repair', name: '出租屋漏水大修', emoji: '🔧', amount: 18000, requires: 'realestate', story: '你的出租房半夜漏水，得馬上找師傅來修。' },
  { id: 'dd_vacancy', name: '出租屋空租一個月', emoji: '🪧', amount: 8000, requires: 'realestate', story: '舊房客搬走、新房客還沒來，這個月少收了租金。' },
  // 連動型：有小孩才會遇到
  { id: 'dd_childclass', name: '小孩才藝補習費', emoji: '🎒', amount: 8000, requires: 'child', story: '孩子吵著要學鋼琴和畫畫，報名費一次繳。' },
  { id: 'dd_childsick', name: '小孩生病住院', emoji: '🤒', amount: 12000, requires: 'child', story: '孩子半夜發高燒送急診，住院觀察了幾天。' },
  { id: 'dd_childbike', name: '幫小孩買新腳踏車', emoji: '🚲', amount: 4000, requires: 'child', story: '孩子的舊腳踏車壞了，買台新的給他。' },
  // 一般（人人都可能）
  { id: 'dd_phone', name: '換最新手機', emoji: '📱', amount: 16000 },
  { id: 'dd_console', name: '買電競主機', emoji: '🎮', amount: 10000 },
  { id: 'dd_flight', name: '衝動訂出國機票', emoji: '✈️', amount: 22000 },
  { id: 'dd_concert', name: '搶到演唱會搖滾區', emoji: '🎤', amount: 5000 },
  { id: 'dd_carfix', name: '愛車進廠大修', emoji: '🔧', amount: 14000 },
  { id: 'dd_shopping', name: '週年慶失心瘋', emoji: '🛍️', amount: 7000 },
  { id: 'dd_laptop', name: '買新筆電', emoji: '💻', amount: 18000 },
  { id: 'dd_tour', name: '跟團出國玩', emoji: '🏝️', amount: 24000 },
  { id: 'dd_dinner', name: '朋友聚餐請客', emoji: '🍽️', amount: 4000 },
  { id: 'dd_gift', name: '送禮物給情人', emoji: '💍', amount: 8000 },
  { id: 'dd_party', name: '辦生日派對', emoji: '🎂', amount: 6000 },
  { id: 'dd_dental', name: '牙齒矯正', emoji: '🦷', amount: 28000 },
  { id: 'dd_tv', name: '買大電視', emoji: '📺', amount: 15000 },
  { id: 'dd_idol', name: '追星買周邊', emoji: '🎟️', amount: 4000 },
  { id: 'dd_dog', name: '養了一隻狗', emoji: '🐶', amount: 2000, recurring: true },
  { id: 'dd_cat', name: '認養貓咪', emoji: '🐱', amount: 1500, recurring: true },
  { id: 'dd_gym', name: '辦健身房會員', emoji: '🏋️', amount: 1800, recurring: true },
  // 一般（搞笑款）
  { id: 'dd_gacha', name: '手遊課金抽不到', emoji: '🎰', amount: 5000, story: '為了抽限定角色課金了一整晚，結果還是沒中，錢包哭哭。' },
  { id: 'dd_return', name: '網購踩雷退貨運費', emoji: '📮', amount: 2500, story: '一次買了十件衣服全部不合身，退貨運費自己吸收。' },
  { id: 'dd_merch', name: '演唱會周邊噴錢', emoji: '🎀', amount: 5000, story: '應援手燈、毛巾、寫真集全包，理智線當場斷掉。' },
  { id: 'dd_snacks', name: '追劇囤零食飲料', emoji: '🍿', amount: 3000, story: '為了追新番囤了一整櫃零食跟手搖飲，體重與帳單一起上升。' },
  { id: 'dd_scooter', name: '機車拋錨大修', emoji: '🛵', amount: 9000, story: '通勤機車半路熄火，牽去保養廠一次噴掉一筆。' },
];

// ── 好運卡（停「🍀 好運」格：小賺一筆）──
export const BONUS_CARDS = [
  { id: 'bn_wallet', name: '撿到錢包物歸原主', emoji: '👛', amount: 3000, story: '路上撿到錢包送去警局，失主包了個謝禮給你。' },
  { id: 'bn_lottery', name: '刮刮樂小中獎', emoji: '🎟️', amount: 5000, story: '順手買張刮刮樂，居然刮中了！' },
  { id: 'bn_invoice', name: '統一發票中獎', emoji: '🧾', amount: 4000, story: '對中了這期的統一發票，開心！' },
  { id: 'bn_redenvelope', name: '長輩包紅包', emoji: '🧧', amount: 6000, story: '長輩心情好，突然塞了個紅包給你。' },
  { id: 'bn_resell', name: '二手拍賣賣掉閒置品', emoji: '📦', amount: 4000, story: '把家裡用不到的東西上網賣掉，秒殺成交。' },
  { id: 'bn_cashback', name: '刷卡回饋入帳', emoji: '💳', amount: 2500, story: '信用卡的現金回饋這個月一次入帳。' },
  { id: 'bn_bonus', name: '公司發小獎金', emoji: '💰', amount: 8000, story: '表現不錯，主管給了一筆小獎金。' },
  { id: 'bn_refund', name: '報稅退稅', emoji: '📋', amount: 5000, story: '今年報稅退了一筆稅款回來。' },
  { id: 'bn_repay', name: '朋友還你欠款', emoji: '🤝', amount: 3500, story: '之前借朋友的錢，他終於還你了。' },
  { id: 'bn_prize', name: '活動抽獎中獎', emoji: '🎁', amount: 4500, story: '參加活動抽獎，居然被抽中！' },
];

const DECKS = { small: SMALL_DEALS, big: BIG_DEALS, super: SUPER_DEALS, market: MARKET_CARDS, doodad: DOODAD_CARDS, bonus: BONUS_CARDS };

// 從指定牌庫隨機抽一張（抽完放回，等同無限牌庫，適合課堂）
export function drawCard(deck) {
  const pool = DECKS[deck];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
