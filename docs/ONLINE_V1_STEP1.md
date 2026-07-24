# TTOK LIFE ONLINE V1 — STEP 1

완료 항목

- FlexG 부모 페이지의 `member_id`, `member_name`을 iframe에 `postMessage`로 전달
- 게임에서 허용된 FlexG 도메인의 회원 메시지만 수신
- 세션 단위 회원정보 캐시
- Next.js 서버 API `/api/online/bootstrap` 추가
- 서버 API에서 Supabase `users`, `farm` 최초 생성/upsert 준비

## Vercel 환경변수

Vercel 프로젝트의 Settings → Environment Variables에 아래를 등록합니다.

- `SUPABASE_URL`: `https://kfrnngsoaccumhzyrrau.supabase.co`
- `SUPABASE_SECRET_KEY`: Supabase의 **New secret key 전체 값**

Secret key는 FlexG HTML, React 코드, Git 저장소에 절대 넣지 않습니다.

## FlexG 적용

`FLEXG_EMBED_ONLINE_V1.html` 전체를 기존 iframe 포틀릿 코드와 교체합니다.

## 다음 단계

STEP 2에서 기존 `GameContext`의 localStorage 데이터를 회원별 Supabase 저장/불러오기로 전환합니다.
