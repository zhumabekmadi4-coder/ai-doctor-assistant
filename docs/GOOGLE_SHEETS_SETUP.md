# Как настроить Google Таблицы (полная инструкция)

1. **Создайте проект в Google Cloud**
   - Перейдите в [Google Cloud Console](https://console.cloud.google.com/).
   - Сверху выберите **Select a project** -> **New Project**.
   - Назовите его `ai-doctor-assistant` и нажмите **Create**.

2. **Включите API**
   - В меню слева выберите **APIs & Services** -> **Library**.
   - Найдите "Google Sheets API" -> нажмите **Enable**.

3. **Создайте Сервисный Аккаунт (Service Account)**
   - В меню слева выберите **APIs & Services** -> **Credentials**.
   - Нажмите **+ CREATE CREDENTIALS** -> **Service Account**.
   - Имя: `doctor-ai-bot`. Нажмите **Create and Continue** -> **Done**.

4. **Получите Ключ (JSON)**
   - В списке Service Accounts кликните на только что созданный аккаунт (email выглядит как `doctor-ai-bot@...`).
   - Перейдите на вкладку **KEYS**.
   - Нажмите **ADD KEY** -> **Create new key** -> **JSON**.
   - Файл скачается автоматически. **Это ваш `credentials.json`.**

5. **Дайте доступ к Таблице**
   - Откройте скачанный JSON файл в блокноте.
   - Скопируйте поле `"client_email"` (например `doctor-ai-bot@ai-doctor-assistant.iam.gserviceaccount.com`).
   - Откройте вашу Google Таблицу.
   - Нажмите **Настройки доступа (Share)**.
   - Вставьте этот email и дайте права **Редактор (Editor)**.

6. **Найдите ID Таблицы**
   - Посмотрите на URL вашей таблицы в браузере:
     `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUWqnyAdywHV10kqgXg/edit`
   - Скопируйте часть между `/d/` и `/edit`.
   - В этом примере ID: `1BxiMVs0XRA5nFMdKvBdBZjgmUWqnyAdywHV10kqgXg`.

---
**Что мне нужно от вас:**
1. ID Таблицы (из шага 6).
2. Содержимое файла `credentials.json` (из шага 4).
