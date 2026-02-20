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

// --- CRUD ---

export function getTemplates(userLogin: string): Template[] {
    try {
        const raw = localStorage.getItem(storageKey(userLogin));
        return raw ? JSON.parse(raw) : [];
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
