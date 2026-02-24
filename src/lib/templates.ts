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
                                // DB fields mapped:
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
                                                      return localStorage.getItem('session_token') ?? '';
                                                      }

                                                      function headers() {
                                                        return { 'Content-Type': 'application/json', 'x-session-token': getToken() };
                                                        }

                                                        export async function getTemplates(userLogin: string): Promise<Template[]> {
                                                          const res = await fetch('/api/templates', { headers: headers() });
                                                            if (!res.ok) return [];
                                                              const data = await res.json();
                                                                return (data.templates ?? []).map((t: any) => dbToTemplate(t));
                                                                }

                                                                export async function saveTemplate(userLogin: string, template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'authorLogin' | 'authorName'>): Promise<Template> {
                                                                  const body = {
                                                                      name: template.name,
                                                                          complaints: template.complaints ?? '',
                                                                              anamnesis: template.anamnesis ?? '',
                                                                                  diagnosis: template.diagnosis ?? '',
                                                                                      treatment: template.treatment ?? '',
                                                                                          recommendations: template.recommendations ?? template.content ?? '',
                                                                                            };
                                                                                              const res = await fetch('/api/templates', { method: 'POST', headers: headers(), body: JSON.stringify(body) });
                                                                                                const data = await res.json();
                                                                                                  return dbToTemplate(data.template);
                                                                                                  }

                                                                                                  export async function updateTemplate(userLogin: string, template: Template): Promise<Template> {
                                                                                                    const body = {
                                                                                                        id: template.id,
                                                                                                            name: template.name,
                                                                                                                complaints: template.complaints ?? '',
                                                                                                                    anamnesis: template.anamnesis ?? '',
                                                                                                                        diagnosis: template.diagnosis ?? '',
                                                                                                                            treatment: template.treatment ?? '',
                                                                                                                                recommendations: template.recommendations ?? template.content ?? '',
                                                                                                                                  };
                                                                                                                                    await fetch('/api/templates', { method: 'PATCH', headers: headers(), body: JSON.stringify(body) });
                                                                                                                                      return template;
                                                                                                                                      }

                                                                                                                                      export async function deleteTemplate(userLogin: string, templateId: string): Promise<void> {
                                                                                                                                        await fetch('/api/templates', { method: 'DELETE', headers: headers(), body: JSON.stringify({ id: templateId }) });
                                                                                                                                        }

                                                                                                                                        export async function getTemplate(userLogin: string, templateId: string): Promise<Template | null> {
                                                                                                                                          const templates = await getTemplates(userLogin);
                                                                                                                                            return templates.find(t => t.id === templateId) ?? null;
                                                                                                                                            }

                                                                                                                                            function dbToTemplate(t: any): Template {
                                                                                                                                              return {
                                                                                                                                                  id: String(t.id),
                                                                                                                                                      name: t.name ?? '',
                                                                                                                                                          description: '',
                                                                                                                                                              headerText: t.name ?? '',
                                                                                                                                                                  content: t.recommendations ?? '',
                                                                                                                                                                      images: [],
                                                                                                                                                                          createdAt: t.created_at ?? new Date().toISOString(),
                                                                                                                                                                              updatedAt: t.created_at ?? new Date().toISOString(),
                                                                                                                                                                                  isPublic: false,
                                                                                                                                                                                      authorLogin: t.doctor_login ?? '',
                                                                                                                                                                                          authorName: t.doctor_login ?? '',
                                                                                                                                                                                              complaints: t.complaints ?? '',
                                                                                                                                                                                                  anamnesis: t.anamnesis ?? '',
                                                                                                                                                                                                      diagnosis: t.diagnosis ?? '',
                                                                                                                                                                                                          treatment: t.treatment ?? '',
                                                                                                                                                                                                              recommendations: t.recommendations ?? '',
                                                                                                                                                                                                                };
                                                                                                                                                                                                                }

                                                                                                                                                                                                                export function initializeDefaultTemplates(userLogin: string): void {
                                                                                                                                                                                                                  // No-op: templates are now stored in DB
                                                                                                                                                                                                                    // Default templates are pre-inserted during setup
                                                                                                                                                                                                                    }

                                                                                                                                                                                                                    // Stub functions for backward compatibility with templates/page.tsx
                                                                                                                                                                                                                    export async function getAllPublicTemplates(): Promise<Template[]> {
                                                                                                                                                                                                                      return [];
                                                                                                                                                                                                                      }

                                                                                                                                                                                                                      export async function getTemplatesByType(userLogin: string, type: 'my' | 'public'): Promise<Template[]> {
                                                                                                                                                                                                                        if (type === 'my') return getTemplates(userLogin);
                                                                                                                                                                                                                          return getAllPublicTemplates();
                                                                                                                                                                                                                          }

                                                                                                                                                                                                                          export async function togglePublicStatus(userLogin: string, templateId: string): Promise<Template | null> {
                                                                                                                                                                                                                            // Public status toggling not implemented in current DB schema
                                                                                                                                                                                                                              return null;
                                                                                                                                                                                                                              }

                                                                                                                                                                                                                              export function isTemplateAuthor(userLogin: string, template: Template): boolean {
                                                                                                                                                                                                                                return template.authorLogin === userLogin;
                                                                                                                                                                                                                                }