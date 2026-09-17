import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://hakka-score.bronci.com.tw/api/v1/hakka_wav_score"
file_path = "./食飽夜共下來去逛街好無.wav"

files = {
    "file": open(file_path, "rb")
}
data = {
    "text": "食飽夜共下來去逛街好無",
    "pinyin": "siid5 bau31 ia55 kiung55 ha55 loi11 hi55 ong11 gie24 ho31 mo11",
    "accent_id": "1"
}

print("開始送出請求，請稍候...")
response = requests.post(url, files=files, data=data, verify=False, timeout=120)

print("Status Code:", response.status_code)
print("Response Body:", response.text)