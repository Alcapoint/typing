# Typing Trainer

Полноэкранный тренажер скорости печати с аккаунтами, историей тренировок,
лидербордом, пользовательскими текстами и статистикой по словам.

## Стек

- `Django + DRF + Djoser`
- `PostgreSQL`
- `React`
- `Docker / Docker Compose`
- `Render`

## Быстрый старт локально

1. Создайте `.env` на основе `.env.example`.
2. Перейдите в папку backend:

```bash
cd backend
```

3. Установите зависимости и выполните миграции:

```bash
pip install -r ../requirements.txt
python3 manage.py migrate
```

4. Запустите backend:

```bash
python3 manage.py runserver
```

5. В отдельном терминале запустите frontend:

```bash
cd frontend
npm install
npm start
```

Frontend будет доступен на `http://localhost:3000`, backend на
`http://127.0.0.1:8000`.

## Запуск через Docker

```bash
cd infra
docker compose up -d --build
```

После старта приложение будет доступно на `http://localhost`.

## Админка

Админ-зона доступна по адресу `http://localhost/admin/`.

Если задать переменные `DJANGO_SUPERUSER_*`, суперпользователь создается
автоматически при старте контейнера.

## Деплой

В репозитории есть `render.yaml` для деплоя backend, frontend и PostgreSQL
на Render.
