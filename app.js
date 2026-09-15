// app.js - 前端互動邏輯與 API 串接

// 1. 測試題庫資料：長文章、數字調拼音與腔調設定
const articleData = {
  text: "為着自家个康健，𠊎兩老臨暗仔有去十八尖山行路个習慣。有一擺，看着盡多人拿等攝影機翕無停，𠊎乜行過去鬥鬧熱。",
  pinyin: "ui55 zaag2 ci55 ga24 ge55 kong24 kien55 ngai11 liong31 lo31 lim11 am55 e31 iu31 hi55 siip2 bad2 ziam24 san24 hang11 lu55 ge55 xid2 guan55 iu31 it2 bai31 kon55 do31 cin55 do11 ngin11 na11 den31 sab2 iang31 gi24 hip2 mo11 thin11 ngai11 mied2 hang11 go55 hi55 deu55 nau55 ngid2",
  accentId: "1" // 1: 四縣腔, 2: 海陸腔
};

// 2. 自動斷句演算法：依據標點符號將文章與拼音對齊拆分
function segmentArticle(text, pinyin) {
  const rawSentences = text.split(/([。！？\n])/).filter(Boolean);
  const sentences = [];
  
  for (let i = 0; i < rawSentences.length; i += 2) {
    const sentenceText = rawSentences[i] + (rawSentences[i + 1] || '');
    if (sentenceText.trim()) sentences.push(sentenceText.trim());
  }

  const pinyinWords = pinyin.split(' ');
  const segments = [];
  let pinyinIndex = 0;

  sentences.forEach((sentence, idx) => {
    // 計算該句漢字數量（扣除標點符號）
    const charCount = [...sentence.replace(/[。！？，、]/g, '')].length;
    const segmentPinyinSlice = pinyinWords.slice(pinyinIndex, pinyinIndex + charCount);
    pinyinIndex += charCount;

    segments.push({
      id: idx + 1,
      text: sentence,
      pinyin: segmentPinyinSlice.join(' '),
      charCount: charCount,
      score: null
    });
  });

  return segments;
}

// 3. 全局變數初始化
let segments = segmentArticle(articleData.text, articleData.pinyin);
let mediaRecorder;
let audioChunks = [];

// 4. 渲染前端介面卡片
function renderSegments() {
  const container = document.getElementById('segments-container');
  container.innerHTML = '';

  segments.forEach((seg, index) => {
    const card = document.createElement('div');
    card.className = 'segment-card';
    card.innerHTML = `
      <div class="segment-text">${seg.id}. ${seg.text}</div>
      <div class="segment-pinyin">拼音：${seg.pinyin}</div>
      <div style="margin-top: 10px;">
        <button onclick="startRecording(${index})" id="btn-rec-${index}">🎙️ 開始錄音</button>
        <button onclick="stopRecording(${index})" id="btn-stop-${index}" disabled>⏹️ 停止並評分</button>
        <span class="score-badge" id="score-badge-${index}">未評分</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// 5. 開始錄音控制
async function startRecording(index) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
    mediaRecorder.start();

    document.getElementById(`btn-rec-${index}`).disabled = true;
    document.getElementById(`btn-stop-${index}`).disabled = false;
    document.getElementById(`score-badge-${index}`).innerText = "錄音中...";
  } catch (err) {
    alert("無法開啟麥克風，請確認權限設定！");
  }
}

// 6. 停止錄音並送出評分
async function stopRecording(index) {
  mediaRecorder.stop();
  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    document.getElementById(`btn-stop-${index}`).disabled = true;
    document.getElementById(`score-badge-${index}`).innerText = "評分中...";

    // 呼叫後端 API
    const score = await submitSegmentScore(audioBlob, segments[index]);
    segments[index].score = score;

    // 更新介面得分顯示
    const badge = document.getElementById(`score-badge-${index}`);
    badge.innerText = `得分：${score} 分`;
    badge.className = `score-badge ${score >= 80 ? 'score-high' : 'score-low'}`;
    document.getElementById(`btn-rec-${index}`).disabled = false;

    // 重新計算全篇總分
    calculateTotalScore();
  };
}

// 7. 發送單句資料給後端 API
async function submitSegmentScore(audioBlob, segment) {
  const formData = new FormData();
  formData.append('file', audioBlob, `segment_${segment.id}.wav`);
  formData.append('pinyin', segment.pinyin);
  formData.append('text', segment.text);
  formData.append('accent_id', articleData.accentId);

  try {
    const res = await fetch('/api/assess-segment', { method: 'POST', body: formData });
    const data = await res.json();
    return data.score ?? 0;
  } catch (err) {
    console.error('評分失敗:', err);
    return 0;
  }
}

// 8. 計算全篇字數加權平均分
function calculateTotalScore() {
  let totalChars = 0;
  let weightedScoreSum = 0;
  let scoredCount = 0;

  segments.forEach(seg => {
    if (seg.score !== null) {
      weightedScoreSum += seg.score * seg.charCount;
      totalChars += seg.charCount;
      scoredCount++;
    }
  });

  if (scoredCount === 0) return;

  const finalScore = Math.round(weightedScoreSum / totalChars);
  document.getElementById('total-score').innerText = finalScore;
}

// 執行初始化渲染
renderSegments();
