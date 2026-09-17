import imageio_ffmpeg
import subprocess

ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

input_file = "為着自家个康健.m4a"
output_file = "為着自家个康健_converted.wav"

command = [
    ffmpeg_path,
    "-y",
    "-i", input_file,
    "-ac", "1",
    "-ar", "16000",
    "-sample_fmt", "s16",
    output_file
]

result = subprocess.run(command, capture_output=True, text=True)

if result.returncode == 0:
    print("轉換完成！")
else:
    print("轉換失敗：")
    print(result.stderr)