TTOK LIFE ONLINE MASTER

1. 이 폴더에서 4_DEPLOY_MASTER.bat 실행
2. 기존 Vercel 프로젝트 ttok-life-online-v1 선택
3. 환경변수 가져오기 질문은 Y
4. 배포 완료 후 FlexG HTML은 FLEXG_EMBED_ONLINE_MASTER.html 전체 내용으로 교체
5. FlexG 실제 페이지에서 Ctrl+F5
6. F12 > Network > bootstrap 확인

정상 결과: POST /api/online/bootstrap 상태 200
상태 확인 주소:
https://ttok-life-online-v1.vercel.app/api/online/bootstrap

브라우저 Console에서 아래를 입력하면 연결 상태를 볼 수 있습니다.
window.__TTOK_ONLINE_STATUS__

필수 Vercel 환경변수:
SUPABASE_URL
SUPABASE_SECRET_KEY

SUPABASE_SECRET_KEY는 구형 service_role JWT 또는 신형 sb_secret_* 키를 지원합니다.
