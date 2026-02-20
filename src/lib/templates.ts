// Template system — localStorage CRUD

export interface TemplateImage {
    id: string;
    type: 'file' | 'url';
    data: string; // base64 data-URI or external URL
    caption?: string;
}

export interface Template {
    id: string;
    name: string;
    description?: string;
    headerText: string; // fills the "___" in header greeting
    content: string;
    images: TemplateImage[];
    createdAt: string;
    updatedAt: string;
    // Новые поля:
    isPublic: boolean;        // флаг общедоступности
    authorLogin: string;      // логин создателя шаблона
    authorName?: string;      // имя создателя для отображения
}

export interface AttachedTemplate {
    templateId: string;
    name: string;
    headerText: string;
    content: string;
    images: TemplateImage[];
}

// --- helpers ---

function storageKey(userLogin: string): string {
    return `templates_${userLogin}`;
}

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// --- Migration helper ---

function migrateTemplate(template: any, userLogin: string): Template {
    // Если у шаблона уже есть все новые поля, возвращаем как есть
    if (template.isPublic !== undefined && template.authorLogin && template.authorName !== undefined) {
        return template as Template;
    }
    
    // Иначе добавляем недостающие поля
    return {
        ...template,
        isPublic: template.isPublic ?? false,
        authorLogin: template.authorLogin || userLogin,
        authorName: template.authorName || userLogin,
    };
}

// --- CRUD ---

export function getTemplates(userLogin: string): Template[] {
    try {
        const raw = localStorage.getItem(storageKey(userLogin));
        if (!raw) return [];
        
        const templates = JSON.parse(raw);
        // Мигрируем старые шаблоны
        const migrated = templates.map((t: any) => migrateTemplate(t, userLogin));
        
        // Сохраняем мигрированные шаблоны обратно
        if (JSON.stringify(templates) !== JSON.stringify(migrated)) {
            localStorage.setItem(storageKey(userLogin), JSON.stringify(migrated));
        }
        
        return migrated;
    } catch {
        return [];
    }
}

export function getTemplateById(userLogin: string, id: string): Template | undefined {
    return getTemplates(userLogin).find(t => t.id === id);
}

export function saveTemplate(userLogin: string, template: Partial<Template> & { name: string; headerText: string; content: string }): Template {
    const templates = getTemplates(userLogin);
    const now = new Date().toISOString();

    if (template.id) {
        // update existing
        const idx = templates.findIndex(t => t.id === template.id);
        if (idx !== -1) {
            templates[idx] = { ...templates[idx], ...template, updatedAt: now };
            localStorage.setItem(storageKey(userLogin), JSON.stringify(templates));
            return templates[idx];
        }
    }

    // create new
    const newTemplate: Template = {
        id: generateId(),
        name: template.name,
        description: template.description || '',
        headerText: template.headerText,
        content: template.content,
        images: template.images || [],
        createdAt: now,
        updatedAt: now,
        // Новые поля по умолчанию:
        isPublic: false,
        authorLogin: userLogin,
        authorName: userLogin, // можно улучшить, получив имя из сессии
    };
    templates.push(newTemplate);
    localStorage.setItem(storageKey(userLogin), JSON.stringify(templates));
    return newTemplate;
}

export function deleteTemplate(userLogin: string, id: string): void {
    const templates = getTemplates(userLogin).filter(t => t.id !== id);
    localStorage.setItem(storageKey(userLogin), JSON.stringify(templates));
}

// Convert a Template to an AttachedTemplate (snapshot for per-patient editing)
export function toAttached(template: Template): AttachedTemplate {
    return {
        templateId: template.id,
        name: template.name,
        headerText: template.headerText,
        content: template.content,
        images: [...template.images],
    };
}

// Получить все общие шаблоны от всех врачей
export function getAllPublicTemplates(): Template[] {
    const allTemplates: Template[] = [];
    
    // Перебираем все ключи localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('templates_')) {
            try {
                const templates: Template[] = JSON.parse(localStorage.getItem(key) || '[]');
                // Добавляем только публичные шаблоны
                const publicTemplates = templates.filter(t => t.isPublic === true);
                allTemplates.push(...publicTemplates);
            } catch {
                // Игнорируем ошибки парсинга
            }
        }
    }
    
    return allTemplates;
}

// Получить шаблоны для конкретной вкладки
export function getTemplatesByType(
    userLogin: string,
    type: 'my' | 'public'
): Template[] {
    if (type === 'my') {
        // Возвращаем все шаблоны пользователя (личные + его общедоступные)
        return getTemplates(userLogin);
    } else {
        // Возвращаем все общие шаблоны от всех пользователей
        const allPublic = getAllPublicTemplates();
        // Исключаем свои собственные шаблоны из списка общих
        return allPublic.filter(t => t.authorLogin !== userLogin);
    }
}

// Переключить статус публичности шаблона
export function togglePublicStatus(
    userLogin: string,
    templateId: string
): Template | null {
    const templates = getTemplates(userLogin);
    const idx = templates.findIndex(t => t.id === templateId);
    
    if (idx === -1) return null;
    
    // Переключаем статус
    templates[idx].isPublic = !templates[idx].isPublic;
    templates[idx].updatedAt = new Date().toISOString();
    
    localStorage.setItem(storageKey(userLogin), JSON.stringify(templates));
    return templates[idx];
}

// Проверить, является ли пользователь автором шаблона
export function isTemplateAuthor(
    template: Template,
    userLogin: string
): boolean {
    return template.authorLogin === userLogin;
}

// Инициализировать дефолтные шаблоны для нового пользователя
export function initializeDefaultTemplates(userLogin: string): void {
    const existing = getTemplates(userLogin);
    
    // Если у пользователя уже есть шаблоны, НЕ добавляем дефолтные
    // Это сохранит ваши существующие шаблоны!
    if (existing.length > 0) return;
    
    const now = new Date().toISOString();
    
    const defaultTemplates: Template[] = [
        {
            id: generateId(),
            name: 'Общие рекомендации по здоровому образу жизни',
            description: 'Базовые рекомендации для поддержания здоровья',
            headerText: 'здоровому образу жизни',
            content: `🌟 Основные рекомендации:

1. 💧 Питьевой режим
   • Пейте не менее 1.5-2 литров чистой воды в день
   • Начинайте утро со стакана теплой воды

2. 🥗 Питание
   • Придерживайтесь сбалансированного рациона
   • Ешьте больше овощей и фруктов
   • Ограничьте потребление сахара и соли
   • Питайтесь регулярно, 4-5 раз в день небольшими порциями

3. 🏃 Физическая активность
   • Минимум 30 минут умеренной активности ежедневно
   • Делайте перерывы при сидячей работе
   • Больше ходите пешком

4. 😴 Сон
   • Спите 7-8 часов в сутки
   • Ложитесь и вставайте в одно время
   • Проветривайте спальню перед сном

5. 🧘 Стресс
   • Практикуйте техники релаксации
   • Найдите время для хобби
   • Общайтесь с близкими

При возникновении вопросов или ухудшении самочувствия - обращайтесь к врачу!`,
            images: [],
            createdAt: now,
            updatedAt: now,
            isPublic: false,
            authorLogin: userLogin,
            authorName: userLogin,
        },
        {
            id: generateId(),
            name: 'Рекомендации при ОРВИ',
            description: 'Советы по лечению простудных заболеваний',
            headerText: 'при ОРВИ',
            content: `🤒 Рекомендации при простуде:

1. 🏠 Режим
   • Соблюдайте постельный режим первые 2-3 дня
   • Избегайте переохлаждения
   • Проветривайте помещение 3-4 раза в день

2. 💊 Лечение
   • Принимайте назначенные препараты строго по схеме
   • При температуре выше 38.5°C - жаропонижающие
   • Полоскайте горло солевым раствором 4-5 раз в день

3. 💧 Питьевой режим
   • Обильное теплое питье: чай с лимоном, морс, компот
   • Не менее 2-2.5 литров жидкости в день
   • Избегайте холодных напитков

4. 🍲 Питание
   • Легкая, витаминизированная пища
   • Бульоны, каши, фрукты
   • Избегайте тяжелой, жирной пищи

5. ⚠️ Когда обратиться к врачу:
   • Температура выше 39°C более 3 дней
   • Затрудненное дыхание
   • Сильная головная боль
   • Боль в груди

Выздоравливайте! 🌸`,
            images: [],
            createdAt: now,
            updatedAt: now,
            isPublic: false,
            authorLogin: userLogin,
            authorName: userLogin,
        },
        {
            id: generateId(),
            name: 'Рекомендации по питанию при гастрите',
            description: 'Диетические рекомендации для пациентов с гастритом',
            headerText: 'по питанию при гастрите',
            content: `🥄 Диета при гастрите:

✅ РЕКОМЕНДУЕТСЯ:

1. 🥣 Каши
   • Овсяная, рисовая, гречневая на воде
   • Хорошо разваренные, протертые

2. 🥔 Овощи
   • Картофель, морковь, свекла (отварные)
   • Тыква, кабачки
   • В виде пюре или супов-пюре

3. 🍗 Белки
   • Нежирное мясо (курица, индейка, кролик)
   • Рыба нежирных сортов
   • Паровые котлеты, тефтели

4. 🥛 Молочные продукты
   • Нежирное молоко
   • Творог некислый
   • Йогурт без добавок

❌ ИСКЛЮЧИТЬ:

• Жирное, жареное, копченое
• Острые специи и приправы
• Кислые фрукты и ягоды
• Свежий хлеб, сдобу
• Газированные напитки
• Кофе, крепкий чай
• Алкоголь

📋 Режим питания:
• 5-6 раз в день небольшими порциями
• Тщательно пережевывайте пищу
• Не ешьте на ночь
• Пища должна быть теплой (не горячей и не холодной)

Соблюдайте диету минимум 2-3 месяца! 🌿`,
            images: [],
            createdAt: now,
            updatedAt: now,
            isPublic: false,
            authorLogin: userLogin,
            authorName: userLogin,
        },
    ];
    
    localStorage.setItem(storageKey(userLogin), JSON.stringify(defaultTemplates));
}
