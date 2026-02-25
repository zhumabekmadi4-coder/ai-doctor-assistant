# 🔧 Альтернативный способ экспорта шаблонов

## Проблема
HTML-файл не находит шаблоны, потому что открыт в другом браузере или профиле.

## ✅ Решение: Экспорт через консоль браузера

### Шаг 1: Откройте рабочее приложение

Откройте приложение, где у вас есть шаблоны:
- Локально: http://localhost:3000
- Или на Vercel: ваш URL

**ВАЖНО**: Войдите в систему!

### Шаг 2: Откройте консоль браузера

Нажмите **F12** или:
- Chrome/Edge: Ctrl+Shift+J (Windows) / Cmd+Option+J (Mac)
- Firefox: Ctrl+Shift+K (Windows) / Cmd+Option+K (Mac)

### Шаг 3: Скопируйте и вставьте этот код

```javascript
// Экспорт всех шаблонов из localStorage
(function() {
    const allTemplates = {};
    let totalFound = 0;
    
    // Ищем все ключи с шаблонами
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('templates_')) {
            const userLogin = key.replace('templates_', '');
            const templates = JSON.parse(localStorage.getItem(key) || '[]');
            
            if (templates.length > 0) {
                allTemplates[userLogin] = templates;
                totalFound += templates.length;
                console.log(`✅ Найдено ${templates.length} шаблонов для пользователя: ${userLogin}`);
            }
        }
    }
    
    if (totalFound === 0) {
        console.error('❌ Шаблоны не найдены!');
        console.log('💡 Убедитесь, что вы залогинены и у вас есть созданные шаблоны');
        return;
    }
    
    console.log(`\n📊 Всего найдено: ${totalFound} шаблонов`);
    console.log('\n📋 Скопируйте JSON ниже и сохраните в файл my_templates.json:\n');
    console.log(JSON.stringify(allTemplates, null, 2));
    
    // Автоматическое скачивание файла
    const jsonString = JSON.stringify(allTemplates, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_templates.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('\n✅ Файл my_templates.json скачан!');
    console.log('📁 Переместите его в папку: C:\\Antigravity\\ai-doctor-assistant\\scripts\\');
})();
```

### Шаг 4: Нажмите Enter

Скрипт автоматически:
1. Найдет все ваши шаблоны
2. Покажет их в консоли
3. Скачает файл `my_templates.json`

### Шаг 5: Переместите файл

Переместите скачанный файл `my_templates.json` из папки Downloads в:
```
C:\Antigravity\ai-doctor-assistant\scripts\
```

---

## 🎯 Что дальше?

После того как файл `my_templates.json` окажется в папке `scripts/`, выполните:

```bash
cd C:\Antigravity\ai-doctor-assistant
npx tsx scripts/import_my_templates.ts
```

---

## 🔍 Проверка

Если скрипт не находит шаблоны, проверьте в консоли:

```javascript
// Посмотреть все ключи localStorage
for (let i = 0; i < localStorage.length; i++) {
    console.log(localStorage.key(i));
}
```

Должны быть ключи вида: `templates_zhuma_md` или `templates_ваш_email`

---

## 💡 Альтернатива: Ручное копирование

Если автоматическое скачивание не работает:

1. Выполните скрипт выше
2. В консоли появится JSON
3. Скопируйте весь JSON (начиная с `{` и до `}`)
4. Создайте файл `my_templates.json` вручную
5. Вставьте скопированный JSON
6. Сохраните в папку `scripts/`

---

**Это самый надежный способ!** ✅
