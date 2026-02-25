// Template system — API-based (Neon Postgres)

export interface TemplateImage {
    id: string;
    type: 'file' | 'url';
    data: string;
    caption?: string;
}

export interface Template {
    id: string;
    name: string;
    description?: string;
    headerText: string;
    content: string;
    images: TemplateImage[];
    createdAt: string;
    updatedAt: string;
    isPublic: boolean;
    authorLogin: string;
    authorName?: string;
    // Medical section fields
    complaints?: string;
    anamnesis?: string;
    diagnosis?: string;
    treatment?: string;
    recommendations?: string;
}

export interface AttachedTemplate {
    templateId: string;
    name: string;
    headerText: string;
    content: string;
    images: TemplateImage[];
}

function getToken(): string {
    return localStorage.getItem('sessionToken') ?? '';
}

function headers() {
    return {
        'Content-Type': 'application/json',
        'x-session-token': getToken(),
    };
}

// Map raw DB row → Template interface
function dbToTemplate(t: any): Template {
    let images: TemplateImage[] = [];
    if (Array.isArray(t.images)) {
        images = t.images;
    } else if (typeof t.images === 'string') {
        try { images = JSON.parse(t.images); } catch { images = []; }
    }

    return {
        id: String(t.id),
        name: t.name ?? '',
        description: t.description ?? '',
        headerText: t.header_text ?? t.name ?? '',
        content: t.content ?? t.recommendations ?? '',
        images,
        createdAt: t.created_at ?? new Date().toISOString(),
        updatedAt: t.updated_at ?? t.created_at ?? new Date().toISOString(),
        isPublic: t.is_public ?? false,
        authorLogin: t.doctor_login ?? '',
        authorName: t.author_name ?? t.doctor_login ?? '',
        complaints: t.complaints ?? '',
        anamnesis: t.anamnesis ?? '',
        diagnosis: t.diagnosis ?? '',
        treatment: t.treatment ?? '',
        recommendations: t.recommendations ?? t.content ?? '',
    };
}

export async function getTemplates(userLogin: string): Promise<Template[]> {
    const res = await fetch('/api/templates', { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.templates ?? []).map((t: any) => dbToTemplate(t));
}

export async function saveTemplate(
    userLogin: string,
    template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'authorLogin' | 'authorName'>
        & { images?: TemplateImage[] }
): Promise<Template> {
    const body = {
        name: template.name,
        description: template.description ?? '',
        headerText: template.headerText ?? template.name,
        content: template.content ?? template.recommendations ?? '',
        complaints: template.complaints ?? '',
        anamnesis: template.anamnesis ?? '',
        diagnosis: template.diagnosis ?? '',
        treatment: template.treatment ?? '',
        recommendations: template.recommendations ?? template.content ?? '',
        images: template.images ?? [],
        isPublic: template.isPublic ?? false,
    };
    const res = await fetch('/api/templates', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return dbToTemplate(data.template);
}

export async function updateTemplate(userLogin: string, template: Template): Promise<Template> {
    const body = {
        id: template.id,
        name: template.name,
        description: template.description ?? '',
        headerText: template.headerText ?? template.name,
        content: template.content ?? template.recommendations ?? '',
        complaints: template.complaints ?? '',
        anamnesis: template.anamnesis ?? '',
        diagnosis: template.diagnosis ?? '',
        treatment: template.treatment ?? '',
        recommendations: template.recommendations ?? template.content ?? '',
        images: template.images ?? [],
        isPublic: template.isPublic ?? false,
    };
    await fetch('/api/templates', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(body),
    });
    return template;
}

export async function deleteTemplate(userLogin: string, templateId: string): Promise<void> {
    await fetch('/api/templates', {
        method: 'DELETE',
        headers: headers(),
        body: JSON.stringify({ id: templateId }),
    });
}

export async function getTemplate(userLogin: string, templateId: string): Promise<Template | null> {
    const templates = await getTemplates(userLogin);
    return templates.find(t => t.id === templateId) ?? null;
}

export async function getAllPublicTemplates(): Promise<Template[]> {
    const res = await fetch('/api/templates', { headers: headers() });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.templates ?? [])
        .filter((t: any) => t.is_public)
        .map((t: any) => dbToTemplate(t));
}

export async function getTemplatesByType(userLogin: string, type: 'my' | 'public'): Promise<Template[]> {
    const all = await getTemplates(userLogin);
    if (type === 'my') return all.filter(t => t.authorLogin === userLogin);
    return all.filter(t => t.isPublic && t.authorLogin !== userLogin);
}

export async function togglePublicStatus(userLogin: string, template: Template): Promise<Template | null> {
    const updated = { ...template, isPublic: !template.isPublic };
    return updateTemplate(userLogin, updated);
}

export function isTemplateAuthor(userLogin: string, template: Template): boolean {
    return template.authorLogin === userLogin;
}

export function toAttached(template: Template): AttachedTemplate {
    return {
        templateId: template.id,
        name: template.name,
        headerText: template.headerText,
        content: template.content,
        images: template.images,
    };
}

export function initializeDefaultTemplates(userLogin: string): void {
    // No-op: templates are stored in DB
}
