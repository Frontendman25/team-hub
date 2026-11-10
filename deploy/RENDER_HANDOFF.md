# TeamHub: оставшиеся действия для Render Free staging

Подготовлено 10 ноября 2026 года. Это список действий, а не отчёт об успешном deploy.
Docker повторно не запускался. Доступный браузер Render показывает `/login-next`;
авторизованного Render connector/CLI и Render credentials в окружении нет.
Секреты нельзя присылать в чат или коммитить. Существующие сервисы и данные не удалять.

Cloudinary adapter уже реализован: `STORAGE_DRIVER=cloudinary`, authenticated assets,
загрузка через Nest proxy, session/access checks перед выдачей и Range streaming.
Локальный S3/MinIO остаётся доступен. Unit-тесты adapter/signature/upload прошли,
но реальный Cloudinary tenant и публичный media playback в этой сессии не проверялись.

## Один список недостающих действий владельца

1. Войти в Render Dashboard в доступном браузере. Если нужных аккаунтов/ресурсов
   Neon и Cloudinary ещё нет, создать только Free без карты. На новом Neon staging
   project получить connection string с `sslmode=require`; не использовать production DB.
2. В Cloudinary API Keys получить поля **Cloud name**, **API key**, **API secret**.
   В Security включить **Allow delivery of PDF and ZIP files**, если нужны PDF/ZIP.
   Не создавать unsigned/public upload preset. Значения вводить только в Render Environment.
3. Создать новый **Key Value**, **Instance Type = Free**, в том же **Region**, что web.
   Скопировать **Internal URL** в `REDIS_URL`. Не включать external connections для web.
4. Создать отдельный **Web Service** для `https://github.com/Frontendman25/team-hub`,
   **Branch = main**, **Language/Runtime = Docker**, **Root Directory = .** (корень),
   **Dockerfile Path = deploy/combined/Dockerfile**, **Docker Build Context Directory = .**,
   **Instance Type = Free**, **Health Check Path = /api/health/live**.
   Не выбирать paid instance, persistent disk или отдельный worker. Если платформа
   требует карту/апгрейд — остановиться. Существующие сервисы не заменять.
5. В **Environment** заполнить поля ниже. После присвоения Render hostname записать
   реальный HTTPS origin в `FRONTEND_URL` и `NEXT_PUBLIC_SITE_URL`, затем выбрать
   **Save, rebuild, and deploy**. Render передаёт environment variables как Docker
   build ARG, а Dockerfile объявляет только публичные NEXT_PUBLIC_* ARG.

   - `NODE_ENV=production`
   - `FRONTEND_URL=https://<фактический-hostname>.onrender.com`
   - `NEXT_PUBLIC_SITE_URL` — тот же origin, без выдуманного домена
   - `NEXT_PUBLIC_API_URL` — пустое значение (same origin)
   - `POSTGRESQL_URL` — Neon staging connection string
   - `REDIS_URL` — Internal URL нового Render Free Key Value
   - `COOKIE_SECURE=true`; `COOKIE_DOMAIN` — не задавать
   - `TRUST_PROXY=true`
   - `SOCKET_IO_REDIS_REQUIRED=true`; `RUN_BACKGROUND_JOBS=true`
   - `ALLOW_DEMO_PERSONA_LOGIN=false`
   - `STORAGE_DRIVER=cloudinary`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `RUN_MIGRATE_ON_BOOT=true` — только для первого deploy новой staging DB
   - `PORT` — назначает Render; не задавать `API_INTERNAL_URL` на localhost:10000
6. После успешных migrations установить `RUN_MIGRATE_ON_BOOT=false`. Для совершенно
   новой Neon DB один раз выполнить существующий idempotent demo catalog seed локально
   из `C:\TeamHub`. Ввод connection string скрыт; используется только новая staging DB.
   Этот шаг необходим: `start-demo.use-case.ts` требует существующий demo workspace.
   Обычный `db:seed` не использовать, demo persona login не включать.

   ```powershell
   Set-Location C:\TeamHub
   $stagingUrl = Read-Host 'Neon staging POSTGRESQL_URL' -AsSecureString
   $stagingPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($stagingUrl)
   try {
     $env:POSTGRESQL_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($stagingPointer)
     npm --prefix apps/api run db:seed:staging-demo
     if ($LASTEXITCODE -ne 0) { throw 'Demo catalog initialization failed' }
   } finally {
     [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($stagingPointer)
     Remove-Item Env:POSTGRESQL_URL -ErrorAction SilentlyContinue
     $stagingUrl.Dispose()
   }
   ```

   Dependencies должны быть установлены через `npm ci`; Node 22 актуального patch release.
   Для seed не требуется Docker, Render shell или платный one-off job.
7. Передать только публичный HTTPS URL для финального smoke: demo login, профиль
   `/users/` и неизвестный `/users/<id>`, DM registration/error UI, API ready,
   authenticated Socket.IO Live, отправка сообщения, private attachment upload/download
   и аудио/видео Range playback. Отдельно проверить две независимые сессии.
   Engine.IO polling opening packet сам по себе не доказывает авторизованный чат.

В этой сессии migrations/seed, создание cloud-ресурсов и публичный smoke не выполнялись.

## Проверенные источники полей Render

- [Docker: environment variables как build arguments](https://render.com/docs/docker)
- [Environment: Save, rebuild, and deploy](https://render.com/docs/configure-environment-variables)
- [Free instances и ограничения](https://render.com/docs/free)
- [Key Value и Internal URL](https://render.com/docs/key-value)

Основной runbook и архитектурные ограничения: [RENDER.md](RENDER.md).
