Добавте в корневую папку проекта файл .env по шаблону
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=foodgram
DB_HOST=db
DB_PORT=5432
```
# Для использования локально

Перейдите в папку с файлом manage.py
```
cd foodgram-st/backend
```
Выполните миграции
```
python3 manage.py makemigrations
```
```
python3 manage.py migrate
```
Загрузите список игредиентов 
```
python3 manage.py load_ingredients
```
Запустите сервер
```
python3 manage.py runserver
```
## 

# Через Docker
Перейдите в папку /infra
```
cd ./infra
```
Соберите контейнеры
```
docker-compose up -d --build
```

При старте контейнеров теперь автоматически выполняются:
```
- ожидание готовности PostgreSQL
- python manage.py makemigrations --noinput
- python manage.py migrate --noinput
- python manage.py collectstatic --noinput --clear
- копирование frontend build в общий volume для nginx
```

## 

Проект доступен на адресах
```
 http://localhost
```
```
 http://127.0.0.1
```

Админ-зона находится по адресу
```
 http://localhost/admin
```
> Для доступа в админ зону потребуется создать суперпользователя командой
```
docker-compose exec backend python manage.py createsuperuser
```
Спецификация API находится по адресу
```
http://localhost/api/docs/
```

