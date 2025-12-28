# Настройка Google OAuth для Vercel

## Проблема: "no registered origin" / "invalid_client"

Эта ошибка возникает, когда домен Vercel не добавлен в Google Cloud Console.

## Решение:

### Шаг 1: Получите URL вашего проекта Vercel

После деплоя на Vercel вы получите URL вида:
- `https://ваш-проект.vercel.app`
- Или кастомный домен, если настроен

### Шаг 2: Добавьте домен в Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект (или создайте новый)
3. Перейдите в **APIs & Services** → **Credentials**
4. Найдите ваш **OAuth 2.0 Client ID** (или создайте новый)
5. Нажмите на карандаш (Edit) для редактирования
6. В разделе **Authorized JavaScript origins** добавьте:
   ```
   https://ваш-проект.vercel.app
   ```
   Также добавьте для preview deployments:
   ```
   https://*-ваш-проект.vercel.app
   ```
   Или конкретные preview URLs, если нужно

7. В разделе **Authorized redirect URIs** добавьте:
   ```
   https://ваш-проект.vercel.app
   ```

8. Нажмите **Save**

### Шаг 3: Обновите Client ID в коде (если нужно)

Если вы используете другой Client ID:

1. Откройте `script.js`
2. Найдите строку 32:
   ```javascript
   client_id: '763449879932-26sn2ggvn71a3ob2qh4qm69gvcp7fvdc.apps.googleusercontent.com',
   ```
3. Замените на ваш Client ID из Google Cloud Console

### Шаг 4: Перезапустите приложение

После изменений:
- Подождите 1-2 минуты (Google может кэшировать настройки)
- Обновите страницу
- Попробуйте войти через Google снова

## Важные замечания:

- ⚠️ Изменения в Google Cloud Console могут применяться с задержкой (до 5 минут)
- ⚠️ Для локальной разработки добавьте `http://localhost:3000` в Authorized JavaScript origins
- ⚠️ Убедитесь, что используете правильный Client ID в коде

## Альтернативное решение (для разработки):

Если нужно быстро протестировать локально, можно временно использовать:
- `http://localhost:3000` в Authorized JavaScript origins
- Но для продакшена обязательно добавьте домен Vercel

