# 실행 중인 main.py 프로세스가 있는지 확인
if pgrep -f "python3 main.py" > /dev/null; then
    pkill -f "python3 main.py"
    echo "blog 서버가 안전하게 종료되었습니다."
else
    echo "현재 blog 서버가 구동 중이지 않습니다."
fi

# ngrok 터널 종료
if pgrep -f "ngrok" > /dev/null; then
    pkill -f "ngrok"
    echo "ngrok 터널이 안전하게 종료되었습니다."
else
    echo "현재 실행 중인 ngrok 터널이 없습니다."
fi
