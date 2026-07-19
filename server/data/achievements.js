// 人生成就（跳出老鼠圈＝財富自由後，用現金「買下」的人生夢想）
// 玩家達成財富自由後，選一個成就當目標；現金存夠就能買下、完成，換下一個。
// cost＝購買所需現金；stars＝星等（依價格分級，最後比誰星星多，每顆星各 5 種選擇）；
// upkeep（可選）＝完成後每月新增的生活開銷（會提高總支出 → 可能動搖財富自由；買前會檢查）。
// 內容盡量具體、真實（實際的東西／地點／體驗）。金額為第一版平衡，之後依課堂手感再調。
export const ACHIEVEMENTS = [
  // ⭐（入門夢想，約一桶金；一次性、無每月開銷）
  { id: 'ac_bag', name: '入手 Hermès 精品包', emoji: '👜', cost: 1000000, stars: 1, story: '走進精品店，把夢想中的柏金包直接帶回家。' },
  { id: 'ac_harley', name: '哈雷重機環島之旅', emoji: '🏍️', cost: 1200000, stars: 1, story: '騎上哈雷，沿著台 11 線一路奔向太平洋。' },
  { id: 'ac_gaming', name: '打造頂級電競房', emoji: '🎮', cost: 1000000, stars: 1, story: '頂規電腦、曲面大螢幕、電競椅，夢幻電競房完成。' },
  { id: 'ac_ski', name: '北海道頭等艙滑雪假期', emoji: '🎿', cost: 1300000, stars: 1, story: '訂下頭等艙，飛北海道二世谷滑一整週的粉雪。' },
  { id: 'ac_album', name: '錄一張個人音樂專輯', emoji: '🎸', cost: 1100000, stars: 1, story: '進錄音室，把自己的創作錄成一張正式專輯。' },

  // ⭐⭐（中階夢想，名車／長途旅行）
  { id: 'ac_worldtour', name: '環遊世界一整年', emoji: '🌍', cost: 2500000, stars: 2, story: '辭掉一切，花一整年踏遍七大洲、環遊世界。' },
  { id: 'ac_tesla', name: '入手一台 Tesla Model S', emoji: '🚗', cost: 3000000, stars: 2, upkeep: 2000, story: '把夢想中的特斯拉電動車開回家（保養充電要顧）。' },
  { id: 'ac_everest', name: '喜馬拉雅 EBC 基地營探險', emoji: '🏔️', cost: 2500000, stars: 2, story: '挑戰健行到聖母峰基地營，站上世界屋脊的門口。' },
  { id: 'ac_disney', name: '玩遍全球迪士尼樂園', emoji: '🎡', cost: 2800000, stars: 2, story: '東京、加州、巴黎、上海，把全世界迪士尼玩透透。' },
  { id: 'ac_sailing', name: '帆船執照＋地中海跳島', emoji: '⛵', cost: 3200000, stars: 2, story: '考到帆船駕照，租船在希臘愛琴海跳島航行。' },

  // ⭐⭐⭐（大夢想，多帶每月開銷）
  { id: 'ac_beachhouse', name: '墾丁海景第二個家', emoji: '🏡', cost: 5000000, stars: 3, upkeep: 8000, story: '在墾丁買一間面海的度假宅（房產稅與管理費要付）。' },
  { id: 'ac_yacht', name: '擁有一艘私人遊艇', emoji: '🛥️', cost: 6000000, stars: 3, upkeep: 10000, story: '週末開著自己的遊艇出海（維護與停泊費不便宜）。' },
  { id: 'ac_porsche', name: '入手保時捷 911', emoji: '🚘', cost: 6500000, stars: 3, upkeep: 6000, story: '車庫裡多了一台經典的保時捷 911（養車費不低）。' },
  { id: 'ac_safari', name: '非洲肯亞 Safari 之旅', emoji: '🦁', cost: 5000000, stars: 3, story: '飛到肯亞馬賽馬拉，親眼看動物大遷徙。' },
  { id: 'ac_paris', name: '巴黎香榭大道長住半年', emoji: '🗼', cost: 5500000, stars: 3, upkeep: 5000, story: '在巴黎租下香榭麗舍旁的公寓，住上半年當巴黎人。' },

  // ⭐⭐⭐⭐（頂級夢想）
  { id: 'ac_startup', name: '創立自己的夢想品牌', emoji: '🏢', cost: 9000000, stars: 4, story: '拿出資金創業，打造一個屬於自己的品牌。' },
  { id: 'ac_jet', name: '買一架私人小飛機', emoji: '🛩️', cost: 11000000, stars: 4, upkeep: 25000, story: '擁有一架私人小飛機，想飛就飛（養機超燒錢）。' },
  { id: 'ac_castle', name: '買下歐洲古堡莊園', emoji: '🏰', cost: 12000000, stars: 4, upkeep: 20000, story: '在法國鄉間買下一座古堡莊園（維護與人事費驚人）。' },
  { id: 'ac_supercar', name: '收藏一台 Lamborghini', emoji: '🏎️', cost: 10000000, stars: 4, upkeep: 12000, story: '把夢想中的藍寶堅尼超跑收進車庫（保養貴鬆鬆）。' },
  { id: 'ac_island', name: '買下一座私人小島', emoji: '🏝️', cost: 12000000, stars: 4, upkeep: 15000, story: '在南太平洋買下一座無人小島，打造祕密基地。' },

  // ⭐⭐⭐⭐⭐（終極夢想，人生巔峰）
  { id: 'ac_foundation', name: '成立慈善教育基金會', emoji: '🕊️', cost: 15000000, stars: 5, upkeep: 15000, story: '成立基金會蓋圖書館、資助偏鄉教育，回饋社會。' },
  { id: 'ac_space', name: '搭火箭上太空旅行', emoji: '🚀', cost: 20000000, stars: 5, story: '登上 SpaceX 火箭，圓一個上太空看地球的終極夢想。' },
  { id: 'ac_sportsteam', name: '買下一支職業運動隊', emoji: '🏟️', cost: 25000000, stars: 5, upkeep: 30000, story: '成為職棒／職籃球隊老闆，帶隊拚總冠軍（養隊超燒錢）。' },
  { id: 'ac_privateresort', name: '打造專屬度假島嶼', emoji: '🏖️', cost: 22000000, stars: 5, upkeep: 25000, story: '把自己的小島蓋成頂級度假村，媲美馬爾地夫。' },
  { id: 'ac_movie', name: '投資拍一部自己的電影', emoji: '🎬', cost: 18000000, stars: 5, story: '當出品人，投資拍一部登上大銀幕的電影。' },
];

export function getAchievement(id) {
  return ACHIEVEMENTS.find((a) => a.id === id) || null;
}

// 已完成成就的總星數
export function starsOf(doneIds = []) {
  return doneIds.reduce((s, id) => s + (getAchievement(id)?.stars || 0), 0);
}
