// api/assess-segment.js
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false, // 關閉預設 bodyParser 以處理音檔上傳
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: '表單解析失敗' });
    }

    try {
      const audioFile = files.file?.[0] || files.file;
      const pinyin = Array.isArray(fields.pinyin) ? fields.pinyin : fields.pinyin;
      const accentId = Array.isArray(fields.accent_id) ? fields.accent_id : (fields.accent_id || '1');
      const text = Array.isArray(fields.text) ? fields.text : fields.text || '';

      if (!audioFile || !pinyin) {
        return res.status(400).json({ error: '缺少音檔或拼音參數' });
      }

      // 構建轉發給發音評量 API 的 FormData [1]
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioFile.filepath), {
        filename: audioFile.originalFilename || 'segment.wav',
        contentType: 'audio/wav',
      });
      formData.append('pinyin', pinyin); // 正確答案數字調拼音 [1]
      formData.append('accent_id', String(accentId)); // 1: 四縣腔, 2: 海陸腔 [2]
      if (text) formData.append('text', text); // 對應客語漢字 (選填) [1, 4]

      // 發音評量 API 端點 [1]
      const targetApiUrl = process.env.HAKKA_SCORE_API_BASE_URL 
        ? `${process.env.HAKKA_SCORE_API_BASE_URL}/api/v1/hakka_wav_score`
        : 'https://hakka-score.bronci.com.tw/api/v1/hakka_wav_score';

      const apiResponse = await fetch(targetApiUrl, {
        method: 'POST',
        headers: formData.getHeaders(),
        body: formData,
      });

      const result = await apiResponse.json();

      // 清理臨時檔案
      fs.unlinkSync(audioFile.filepath);

      // 回傳 API 結果 (例如 {"score": 95}) [3]
      return res.status(apiResponse.status).json(result);
    } catch (error) {
      console.error('評分轉發異常:', error);
      return res.status(500).json({ error: '評分伺服器連線失敗', details: error.message });
    }
  });
}
