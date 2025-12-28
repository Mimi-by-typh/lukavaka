# Инструкция по загрузке в GitHub

## Шаг 1: Создайте репозиторий на GitHub

1. Перейдите на https://github.com/new
2. Введите название репозитория (например: `lika-frizz`)
3. Выберите Public или Private
4. **НЕ** добавляйте README, .gitignore или лицензию (они уже есть)
5. Нажмите "Create repository"

## Шаг 2: Подключите удаленный репозиторий

После создания репозитория GitHub покажет вам URL. Выполните следующие команды:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Или если вы используете SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## Альтернативный способ (если у вас установлен GitHub CLI)

```bash
gh repo create lika-frizz --public --source=. --remote=origin --push
```

## После загрузки

Ваш проект будет доступен на GitHub и готов к деплою на Vercel!

