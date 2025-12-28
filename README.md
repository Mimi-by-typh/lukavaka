# Lika Frizz - Vercel Deployment

Проект мигрирован с Netlify на Vercel.

## Структура проекта

- `api/` - Serverless функции для Vercel
  - `auth.js` - Авторизация (Telegram, Google)
  - `comments.js` - Система комментариев
  - `online.js` - Счетчик онлайн пользователей
  - `test.js` - Тестовый эндпоинт
- `index.html` - Главная страница
- `script.js` - Клиентский JavaScript
- `styles.css` - Стили
- `vercel.json` - Конфигурация Vercel

## Деплой на Vercel

### Через Vercel CLI

1. Установите Vercel CLI:
```bash
npm i -g vercel
```

2. Войдите в аккаунт:
```bash
vercel login
```

3. Деплой:
```bash
vercel
```

4. Для продакшена:
```bash
vercel --prod
```

### Через GitHub

1. Загрузите проект в GitHub
2. Подключите репозиторий в Vercel Dashboard
3. Vercel автоматически задеплоит проект

## База данных

Проект использует **Vercel KV (Redis)** для постоянного хранения данных.

**Важно:** Без настройки KV базы данных, все данные (комментарии, пользователи) будут теряться при перезапуске функций.

### Настройка базы данных:

1. Перейдите в Vercel Dashboard → Storage
2. Создайте **KV** базу данных
3. Vercel автоматически добавит переменные окружения

Подробные инструкции в файле `DATABASE_SETUP.md`

## Переменные окружения

В настройках проекта Vercel добавьте:

- `TELEGRAM_BOT_TOKEN` - Токен Telegram бота (для авторизации через Telegram)
- `ADMIN_EMAIL` - Email админа (опционально, можно настроить в коде)

**Автоматически добавляются при создании KV базы:**
- `KV_REST_API_URL` - URL для подключения к KV
- `KV_REST_API_TOKEN` - Токен для доступа к KV

## Настройка Google OAuth

Для работы Google авторизации необходимо:

1. **Добавить домен Vercel в Google Cloud Console:**
   - Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
   - Выберите ваш проект
   - Перейдите в "APIs & Services" → "Credentials"
   - Найдите ваш OAuth 2.0 Client ID
   - Нажмите "Edit"
   - В разделе "Authorized JavaScript origins" добавьте:
     - `https://ваш-домен.vercel.app`
     - `https://ваш-домен.vercel.app` (для preview deployments)
   - В разделе "Authorized redirect URIs" добавьте:
     - `https://ваш-домен.vercel.app`
   - Сохраните изменения

2. **Обновить Client ID в коде (если нужно):**
   - Откройте `script.js`
   - Найдите строку с `client_id` (строка 32)
   - Замените на ваш Client ID из Google Cloud Console

**Важно:** После изменения настроек в Google Cloud Console может потребоваться несколько минут для применения изменений.

## API Endpoints

- `GET/POST /api/auth` - Авторизация
- `GET/POST /api/comments` - Комментарии
- `DELETE /api/comments` - Удаление комментария (только для админов)
- `GET/POST /api/online` - Онлайн пользователи
- `GET/POST /api/admin` - Админ авторизация
- `GET /api/test` - Тестовый эндпоинт

## Админ-панель

Админ-панель доступна по адресу: `/admin.html`

Для настройки email админа:
1. Добавьте переменную окружения `ADMIN_EMAIL` в Vercel
2. Или измените `api/admin.js` напрямую

Подробные инструкции в файле `ADMIN_SETUP.md`

## Устранение проблем

### Ошибка 404 NOT_FOUND

Если вы получаете ошибку 404:

1. Убедитесь, что функции находятся в папке `api/`
2. Проверьте, что функции экспортируют обработчик: `module.exports = async (req, res) => {}`
3. Убедитесь, что `@vercel/node` указан в `dependencies` в `package.json`
4. Проверьте логи деплоя в Vercel Dashboard

### Функции не работают

1. Проверьте логи функции в Vercel Dashboard
2. Убедитесь, что CORS заголовки установлены правильно
3. Проверьте, что body парсится корректно (в Vercel body уже распарсен)

## Локальная разработка

```bash
npm install
vercel dev
```

Проект будет доступен на `http://localhost:3000`

