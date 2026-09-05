require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN === '*' ? true : process.env.ALLOWED_ORIGIN.split(','),
  credentials: true
}));
app.use(express.json());
app.use(express.static(__dirname));

// ==================== 飞书API封装 ====================
const FEISHU_BASE = 'https://open.feishu.cn/open-apis';
let tenantAccessToken = null;
let tokenExpireTime = 0;

// 获取tenant_access_token（带缓存）
async function getTenantAccessToken() {
  const now = Date.now();
  if (tenantAccessToken && now < tokenExpireTime - 60000) {
    return tenantAccessToken;
  }
  try {
    const res = await axios.post(`${FEISHU_BASE}/auth/v3/tenant_access_token/internal`, {
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET
    });
    if (res.data.code === 0) {
      tenantAccessToken = res.data.tenant_access_token;
      tokenExpireTime = now + res.data.expire * 1000;
      return tenantAccessToken;
    }
    throw new Error(`获取token失败: ${res.data.msg}`);
  } catch (err) {
    console.error('获取tenant_access_token失败:', err.message);
    throw err;
  }
}

// 飞书API请求封装
async function feishuRequest(method, url, data = null, params = null) {
  const token = await getTenantAccessToken();
  const config = {
    method,
    url: `${FEISHU_BASE}${url}`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    params
  };
  if (data) config.data = data;
  const res = await axios(config);
  if (res.data.code !== 0) {
    throw new Error(`飞书API错误: ${res.data.msg} (code: ${res.data.code})`);
  }
  return res.data;
}

// ==================== 通用CRUD接口 ====================

// 获取记录列表
async function getRecords(tableId, pageSize = 100, pageToken = null) {
  const params = { page_size: pageSize };
  if (pageToken) params.page_token = pageToken;
  const res = await feishuRequest('GET', `/bitable/v1/apps/${process.env.FEISHU_BASE_TOKEN}/tables/${tableId}/records`, null, params);
  return {
    items: res.data.items || [],
    has_more: res.data.has_more,
    page_token: res.data.page_token
  };
}

// 创建记录
async function createRecord(tableId, fields) {
  const res = await feishuRequest('POST', `/bitable/v1/apps/${process.env.FEISHU_BASE_TOKEN}/tables/${tableId}/records`, { fields });
  return res.data.record;
}

// 更新记录
async function updateRecord(tableId, recordId, fields) {
  const res = await feishuRequest('PUT', `/bitable/v1/apps/${process.env.FEISHU_BASE_TOKEN}/tables/${tableId}/records/${recordId}`, { fields });
  return res.data.record;
}

// 删除记录
async function deleteRecord(tableId, recordId) {
  await feishuRequest('DELETE', `/bitable/v1/apps/${process.env.FEISHU_BASE_TOKEN}/tables/${tableId}/records/${recordId}`);
  return { success: true };
}

// ==================== API路由 ====================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: '草莓工作台后端服务', time: new Date().toISOString() });
});

// ---------- 新媒体账号 ----------

// 获取账号列表
app.get('/api/accounts', async (req, res) => {
  try {
    const result = await getRecords(process.env.TABLE_ACCOUNTS);
    const accounts = result.items.map(item => ({
      id: item.record_id,
      ...item.fields
    }));
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 新增账号
app.post('/api/accounts', async (req, res) => {
  try {
    const record = await createRecord(process.env.TABLE_ACCOUNTS, req.body);
    res.json({ success: true, data: { id: record.record_id, ...record.fields } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 更新账号
app.put('/api/accounts/:id', async (req, res) => {
  try {
    const record = await updateRecord(process.env.TABLE_ACCOUNTS, req.params.id, req.body);
    res.json({ success: true, data: { id: record.record_id, ...record.fields } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 删除账号
app.delete('/api/accounts/:id', async (req, res) => {
  try {
    await deleteRecord(process.env.TABLE_ACCOUNTS, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- 项目任务 ----------

// 获取任务列表
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await getRecords(process.env.TABLE_TASKS);
    const tasks = result.items.map(item => ({
      id: item.record_id,
      ...item.fields
    }));
    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 新增任务
app.post('/api/tasks', async (req, res) => {
  try {
    const record = await createRecord(process.env.TABLE_TASKS, req.body);
    res.json({ success: true, data: { id: record.record_id, ...record.fields } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 更新任务
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const record = await updateRecord(process.env.TABLE_TASKS, req.params.id, req.body);
    res.json({ success: true, data: { id: record.record_id, ...record.fields } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 删除任务
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await deleteRecord(process.env.TABLE_TASKS, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- 选题灵感 ----------

// 获取选题列表
app.get('/api/ideas', async (req, res) => {
  try {
    const result = await getRecords(process.env.TABLE_IDEAS);
    const ideas = result.items.map(item => ({
      id: item.record_id,
      ...item.fields
    }));
    res.json({ success: true, data: ideas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 新增选题
app.post('/api/ideas', async (req, res) => {
  try {
    const record = await createRecord(process.env.TABLE_IDEAS, req.body);
    res.json({ success: true, data: { id: record.record_id, ...record.fields } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 更新选题
app.put('/api/ideas/:id', async (req, res) => {
  try {
    const record = await updateRecord(process.env.TABLE_IDEAS, req.params.id, req.body);
    res.json({ success: true, data: { id: record.record_id, ...record.fields } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 删除选题
app.delete('/api/ideas/:id', async (req, res) => {
  try {
    await deleteRecord(process.env.TABLE_IDEAS, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- 行业动态 & 品牌资讯（缓存） ----------
let newsCache = {
  industry: [],
  brand: [],
  lastUpdate: null
};

// 获取行业动态
app.get('/api/industry-news', (req, res) => {
  res.json({
    success: true,
    data: newsCache.industry,
    lastUpdate: newsCache.lastUpdate
  });
});

// 获取品牌资讯
app.get('/api/brand-news', (req, res) => {
  res.json({
    success: true,
    data: newsCache.brand,
    lastUpdate: newsCache.lastUpdate
  });
});

// 手动刷新资讯（需要管理员密码或在服务端调用）
app.post('/api/refresh-news', (req, res) => {
  // 这里可以接入真实的舆情调研API
  // 当前返回缓存数据，实际部署时可对接第三方数据服务
  newsCache.lastUpdate = new Date().toISOString();
  res.json({ success: true, message: '资讯已刷新', lastUpdate: newsCache.lastUpdate });
});

// ==================== 账号链接解析与数据抓取 ====================

// 解析账号链接，识别平台和账号ID
function parseAccountUrl(url) {
  if (!url) return null;
  url = url.trim();
  
  // 抖音
  if (url.includes('douyin.com')) {
    // https://www.douyin.com/user/xxxxx
    const userMatch = url.match(/douyin\.com\/user\/([^/?#]+)/);
    if (userMatch) {
      return { platform: 'douyin', platformName: '抖音', accountId: userMatch[1], url };
    }
    // 短链接 https://v.douyin.com/xxxxx/
    if (url.includes('v.douyin.com')) {
      return { platform: 'douyin', platformName: '抖音', accountId: 'short_link', url, needRedirect: true };
    }
    return { platform: 'douyin', platformName: '抖音', accountId: 'unknown', url };
  }
  
  // 小红书
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {
    // https://www.xiaohongshu.com/user/profile/xxxxx
    const profileMatch = url.match(/xiaohongshu\.com\/user\/profile\/([^/?#]+)/);
    if (profileMatch) {
      return { platform: 'xhs', platformName: '小红书', accountId: profileMatch[1], url };
    }
    // 短链接
    if (url.includes('xhslink.com')) {
      return { platform: 'xhs', platformName: '小红书', accountId: 'short_link', url, needRedirect: true };
    }
    return { platform: 'xhs', platformName: '小红书', accountId: 'unknown', url };
  }
  
  // 视频号（微信）
  if (url.includes('channels.weixin.qq.com') || url.includes('weixin.qq.com/channels')) {
    return { platform: 'wx', platformName: '视频号', accountId: 'unknown', url };
  }
  
  // 无法识别
  return null;
}

// 抓取账号数据
async function fetchAccountData(parsed) {
  const { platform, platformName, accountId, url } = parsed;
  const result = {
    platform,
    platformName,
    accountId,
    url,
    name: '',
    fans: '',
    likes: '',
    videos: '',
    verified: '',
    avatar: '',
    fetchSuccess: false,
    message: ''
  };
  
  try {
    // 设置请求头，模拟浏览器
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': platform === 'douyin' ? 'https://www.douyin.com/' : platform === 'xhs' ? 'https://www.xiaohongshu.com/' : 'https://channels.weixin.qq.com/'
    };
    
    const response = await axios.get(url, { 
      headers,
      timeout: 10000,
      maxRedirects: 5
    });
    
    const html = response.data;
    
    // 解析HTML中的元数据
    // og:title
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    if (ogTitleMatch) {
      result.name = ogTitleMatch[1].trim();
    }
    
    // og:description
    const ogDescMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    if (ogDescMatch) {
      result.verified = ogDescMatch[1].trim();
    }
    
    // og:image
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    if (ogImageMatch) {
      result.avatar = ogImageMatch[1].trim();
    }
    
    // 尝试从页面标题提取
    if (!result.name) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        result.name = titleMatch[1].trim().replace(/[-_].*$/, '').trim();
      }
    }
    
    // 抖音特定解析：尝试从页面脚本中提取用户数据
    if (platform === 'douyin') {
      // 尝试匹配粉丝数等数据（抖音页面是动态渲染的，可能获取不到）
      const fansMatch = html.match(/"follower_count["\s:]+(\d+)/);
      const likesMatch = html.match(/"total_favorited["\s:]+(\d+)/);
      const videosMatch = html.match(/"aweme_count["\s:]+(\d+)/);
      const nicknameMatch = html.match(/"nickname["\s:]+"([^"]+)"/);
      
      if (nicknameMatch) result.name = nicknameMatch[1];
      if (fansMatch) result.fans = formatNumber(parseInt(fansMatch[1]));
      if (likesMatch) result.likes = formatNumber(parseInt(likesMatch[1]));
      if (videosMatch) result.videos = videosMatch[1];
    }
    
    // 小红书特定解析
    if (platform === 'xhs') {
      const nicknameMatch = html.match(/"nickname["\s:]+"([^"]+)"/);
      const fansMatch = html.match(/"fans["\s:]+(\d+)/);
      if (nicknameMatch) result.name = nicknameMatch[1];
      if (fansMatch) result.fans = formatNumber(parseInt(fansMatch[1]));
    }
    
    if (result.name || result.fans) {
      result.fetchSuccess = true;
      result.message = '账号数据抓取成功';
    } else {
      result.fetchSuccess = false;
      result.message = '已解析链接，但由于平台反爬限制，无法获取完整数据，请手动填写';
    }
    
  } catch (err) {
    console.error('抓取账号数据失败:', err.message);
    result.fetchSuccess = false;
    result.message = '抓取失败：' + (err.message || '网络错误') + '，请手动填写账号信息';
  }
  
  return result;
}

// 数字格式化
function formatNumber(num) {
  if (!num || isNaN(num)) return '--';
  if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toString();
}

// 解析账号链接API
app.post('/api/parse-account-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: '请输入账号链接' });
    }
    
    const parsed = parseAccountUrl(url);
    if (!parsed) {
      return res.json({ 
        success: false, 
        message: '无法识别该链接，请输入抖音、小红书或视频号的账号主页链接' 
      });
    }
    
    // 尝试抓取账号数据
    const accountData = await fetchAccountData(parsed);
    
    res.json({
      success: true,
      data: accountData
    });
  } catch (err) {
    console.error('解析账号链接失败:', err);
    res.status(500).json({ success: false, message: '解析失败：' + err.message });
  }
});

// ==================== 前端页面路由 ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 启动服务器（仅本地运行时启动，Vercel Serverless不启动）
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
========================================
  草莓·毛巾浴巾创作者协作工作台
  后端服务已启动
  本地地址: http://localhost:${PORT}
  API文档: http://localhost:${PORT}/api/health
========================================
    `);
  });
}

// 导出app供Vercel Serverless Function使用
module.exports = app;
