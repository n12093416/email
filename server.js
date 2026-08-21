const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const MAIL_API = 'https://api.mail.tm';

// 신규 계정 발급 API
app.get('/api/new-email', async (req, res) => {
  try {
    const domainRes = await axios.get(`${MAIL_API}/domains`);
    const domainList = domainRes.data['hydra:member'];
    
    if (!domainList || domainList.length === 0) throw new Error("도메인 없음");
    
    const domain = domainList[0].domain;
    const randomUser = 'user_' + Math.random().toString(36).substring(2, 8);
    const email = `${randomUser}@${domain}`;
    const password = 'P@ss' + Math.random().toString(36).substring(2, 8) + '!';

    try {
      await axios.post(`${MAIL_API}/accounts`, { address: email, password: password });
    } catch (e) {}

    const tokenRes = await axios.post(`${MAIL_API}/token`, { address: email, password: password });
    const now = new Date();

    res.json({
      email: email,
      password: password,
      token: tokenRes.data.token,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)).toISOString(),
      status: 'unused'
    });
  } catch (error) {
    res.status(500).json({ error: '계정 생성 실패' });
  }
});

// 메일 수신 조회 API
app.get('/api/messages', async (req, res) => {
  const token = req.headers.authorization;
  const createdAt = req.headers['x-created-at'];

  if (!token) return res.json({ messages: [], isUsed: false, expiresAt: new Date().toISOString() });

  try {
    const response = await axios.get(`${MAIL_API}/messages`, {
      headers: { Authorization: token }
    });
    
    const messages = response.data['hydra:member'] || [];
    const createdDate = createdAt ? new Date(createdAt) : new Date();
    const isUsed = messages.length > 0;
    
    const daysToAdd = isUsed ? 90 : 30;
    const updatedExpireDate = new Date(createdDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));

    res.json({
      messages: messages,
      isUsed: isUsed,
      expiresAt: updatedExpireDate.toISOString()
    });
  } catch (error) {
    res.json({ messages: [], isUsed: false, expiresAt: new Date().toISOString() });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// server.js 하단에 추가
setInterval(() => {
  axios.get('https://email.onrender.com/api/new-email')
    .then(() => console.log('Self-ping success'))
    .catch(() => {});
}, 10 * 60 * 1000); // 10분마다 실행
