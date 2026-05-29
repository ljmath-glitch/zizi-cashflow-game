// v2：財務數字一律由伺服器在 team.derived 算好，前端直接取用
// derived = { passive:{interest,dividend,realestate,business,total}, passiveTotal,
//   totalIncome, totalExpense, cashflow, bankLoanPayment, assetsValue,
//   liabilitiesTotal, netWorth, free }

export const PASSIVE_LABEL = {
  interest: '利息',
  dividend: '股利',
  realestate: '房地產',
  business: '企業',
};

export function netWorthOf(team) {
  return team?.derived?.netWorth ?? 0;
}

// 財務自由進度（非工資收入 ÷ 總支出），上限 100%
export function freedomPercent(team) {
  const d = team?.derived;
  if (!d || !d.totalExpense) return 0;
  return Math.min(100, Math.round((d.passiveTotal / d.totalExpense) * 100));
}

// 距離財務自由還差多少被動收入（每月）
export function freedomGap(team) {
  const d = team?.derived;
  if (!d) return 0;
  return Math.max(0, (d.totalExpense || 0) - (d.passiveTotal || 0));
}

export function isFinanciallyFree(team) {
  return !!team?.free || !!team?.derived?.free;
}
