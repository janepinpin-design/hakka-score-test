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

// 5. 開始錄音控制（改用 Web Audio API 以產生正確格式的 WAV）
let audioContext;
let scriptProcessor;
let audioInput;
let recordedSamples = [];
let currentStream;

async function startRecording(index) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    currentStream = stream;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioInput = audioContext.createMediaStreamSource(stream);
    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
    recordedSamples = [];

    scriptProcessor.onaudioprocess = (e) => {
      const channelData = e.inputBuffer.getChannelData(0);
      recordedSamples.push(new Float32Array(channelData));
    };

    audioInput.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    document.getElementById(`btn-rec-${index}`).disabled = true;
    document.getElementById(`btn-stop-${index}`).disabled = false;
    document.getElementById(`score-badge-${index}`).innerText = "錄音中...";
  } catch (err) {
    alert("無法開啟麥克風，請確認權限設定！");
  }
}

// 6. 停止錄音並送出評分（轉換為 Mono / 16kHz / 16bit PCM 的 WAV）
async function stopRecording(index) {
  scriptProcessor.disconnect();
  audioInput.disconnect();
  currentStream.getTracks().forEach(track => track.stop());
  const inputSampleRate = audioContext.sampleRate;

  document.getElementById(`btn-stop-${index}`).disabled = true;
  document.getElementById(`score-badge-${index}`).innerText = "評分中...";

  const wavBlob = encodeWAV(recordedSamples, inputSampleRate, 16000);

  const score = await submitSegmentScore(wavBlob, segments[index]);
  segments[index].score = score;

  const badge = document.getElementById(`score-badge-${index}`);
  badge.innerText = `得分：${score} 分`;
  badge.className = `score-badge ${score >= 80 ? 'score-high' : 'score-low'}`;
  document.getElementById(`btn-rec-${index}`).disabled = false;

  calculateTotalScore();
}

// 6a. 將錄音樣本合併、降頻取樣、轉為 16bit PCM，並組裝成合法 WAV 檔
function encodeWAV(samplesArray, inputSampleRate, targetSampleRate) {
  let totalLength = 0;
  samplesArray.forEach(chunk => totalLength += chunk.length);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  samplesArray.forEach(chunk => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });

  const downsampled = downsampleBuffer(merged, inputSampleRate, targetSampleRate);
  const pcmData = floatTo16BitPCM(downsampled);
  return createWavBlob(pcmData, targetSampleRate);
}

function downsampleBuffer(buffer, inputSampleRate, targetSampleRate) {
  if (targetSampleRate === inputSampleRate) return buffer;
  const ratio = inputSampleRate / targetSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < newLength) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function floatTo16BitPCM(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

function createWavBlob(pcmData, sampleRate) {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < pcmData.length; i++, offset += 2) {
    view.setInt16(offset, pcmData[i], true);
  }

  return new Blob([view], { type: 'audio/wav' });
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
