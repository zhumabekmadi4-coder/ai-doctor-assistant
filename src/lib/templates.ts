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
