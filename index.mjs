
import { fileURLToPath } from 'url';

// 從 TWSE OpenAPI 抓取指定自選股的當日收盤資訊
// TWSE_URL：API 端點，STOCK_CODES：逗號分隔的股票代號（如 2330,2317）
// 兩者皆從 Lambda 環境變數讀取，本機測試時由 .env.local 提供
const fetchTargetStocks = async () => {
  const url = process.env.TWSE_URL;
  const codes = process.env.STOCK_CODES?.split(',').map(s => s.trim());

  if (!url) throw new Error('Missing environment variable: TWSE_URL');
  if (!codes?.length) throw new Error('Missing environment variable: STOCK_CODES');

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`TWSE API request failed: ${res.status} ${res.statusText}`);
  }
  const all = await res.json();
  // 從全部上市股票中篩選出自選股
  return all.filter(stock => codes.includes(stock.Code));
};

// Lambda 進入點：由 EventBridge 定時觸發
export const handler = async (event) => {
  try {
    const stocks = await fetchTargetStocks();
    console.log(`Fetched ${stocks.length} target stocks`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(stocks),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ message: error.message }),
    };
  }
};

// 直接以 `node index.mjs` 執行時呼叫 handler（本機測試用）
// Lambda import 此模組時 process.argv[1] 不符，不會觸發
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await handler({});
  console.log(JSON.stringify(result, null, 2));
}
