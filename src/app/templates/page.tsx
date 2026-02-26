'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginScreen } from '@/components/LoginScreen';
import { TemplateEditor } from '@/components/TemplateEditor';
import {
        getTemplates, saveTemplate, updateTemplate, deleteTemplate,
        togglePublicStatus, Template, TemplateImage,
} from '@/lib/templates';
import { ArrowLeft, Plus, Edit2, Trash2, FileText, Globe, Lock, Copy } from 'lucide-react';

export default function TemplatesPage() {
        const router = useRouter();
        const [isLoggedIn, setIsLoggedIn] = useState(false);
        const [userLogin, setUserLogin] = useState('');
        const [templates, setTemplates] = useState<Template[]>([]);
        const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
        const [isCreating, setIsCreating] = useState(false);
        const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
        const [loading, setLoading] = useState(false);
        const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');
        const [toastMsg, setToastMsg] = useState<string | null>(null);

        useEffect(() => {
                const session = localStorage.getItem('doctorSession');
                if (session) {
                        try {
                                const parsed = JSON.parse(session);
                                setIsLoggedIn(true);
                                setUserLogin(parsed.login ?? '');
                                loadTemplates(parsed.login ?? '');
                        } catch (e) {
                                console.error(e);
                        }
                }
        }, []);

        const showToast = (msg: string) => {
                setToastMsg(msg);
                setTimeout(() => setToastMsg(null), 3000);
        };

        const loadTemplates = async (login: string) => {
                setLoading(true);
                try {
                        const data = await getTemplates(login);
                        setTemplates(data);
                } catch (e) {
                        console.error(e);
                } finally {
                        setLoading(false);
                }
        };

        const refreshTemplates = () => loadTemplates(userLogin);

        const handleSaveOrUpdate = async (data: Partial<Template> & { name: string; headerText: string; content: string }) => {
                if (editingTemplate && data.id) {
                        await updateTemplate(userLogin, { ...editingTemplate, ...data, images: (data.images ?? editingTemplate.images) as TemplateImage[] });
                } else {
                        await saveTemplate(userLogin, {
                                name: data.name,
                                headerText: data.headerText,
                                content: data.content,
                                images: (data.images ?? []) as TemplateImage[],
                                isPublic: data.isPublic ?? false,
                                complaints: data.complaints ?? '',
                                anamnesis: data.anamnesis ?? '',
                                diagnosis: data.diagnosis ?? '',
                                treatment: data.treatment ?? '',
                                recommendations: data.recommendations ?? '',
                        });
                }
                await refreshTemplates();
                setEditingTemplate(null);
                setIsCreating(false);
        };

        const handleDelete = async (id: string) => {
                await deleteTemplate(userLogin, id);
                await refreshTemplates();
                setDeleteConfirm(null);
        };

        const handleTogglePublic = async (t: Template) => {
                await togglePublicStatus(userLogin, t);
                await refreshTemplates();
                showToast(t.isPublic ? 'Шаблон стал личным' : 'Шаблон теперь общий — коллеги его видят');
        };

        const handleCopyToMine = async (t: Template) => {
                await saveTemplate(userLogin, {
                        name: `${t.name} (копия)`,
                        headerText: t.headerText,
                        content: t.content,
                        images: t.images,
                        isPublic: false,
                        complaints: t.complaints ?? '',
                        anamnesis: t.anamnesis ?? '',
                        diagnosis: t.diagnosis ?? '',
                        treatment: t.treatment ?? '',
                        recommendations: t.recommendations ?? '',
                });
                await refreshTemplates();
                showToast('Шаблон скопирован в «Мои шаблоны»');
                setActiveTab('my');
        };

        if (!isLoggedIn) {
                return <LoginScreen onLogin={(login) => { setIsLoggedIn(true); setUserLogin(login); loadTemplates(login); }} />;
        }

        if (isCreating || editingTemplate) {
                return (
                        <div className="min-h-screen bg-gray-50 p-4">
                                <div className="max-w-4xl mx-auto">
                                        <TemplateEditor
                                                template={editingTemplate ?? undefined}
                                                onSave={handleSaveOrUpdate}
                                                onCancel={() => { setEditingTemplate(null); setIsCreating(false); }}
                                        />
                                </div>
                        </div>
                );
        }

        const myTemplates = templates.filter(t => t.authorLogin === userLogin);
        const sharedTemplates = templates.filter(t => t.isPublic && t.authorLogin !== userLogin);

        return (
                <div className="min-h-screen bg-gray-50">
                        {/* Toast */}
                        {toastMsg && (
                                <div className="fixed top-4 right-4 z-50 bg-teal-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-fadeInUp">
                                        {toastMsg}
                                </div>
                        )}

                        <div className="max-w-4xl mx-auto p-4">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-6">
                                        <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 rounded-lg">
                                                <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <h1 className="text-2xl font-bold text-gray-800">Шаблоны</h1>
                                        <button
                                                onClick={() => setIsCreating(true)}
                                                className="ml-auto flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                                        >
                                                <Plus className="w-4 h-4" />
                                                Создать шаблон
                                        </button>
                                </div>

                                {/* Tabs */}
                                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
                                        <button
                                                onClick={() => setActiveTab('my')}
                                                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'my' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                                Мои
                                                {myTemplates.length > 0 && (
                                                        <span className="ml-2 bg-teal-100 text-teal-700 text-xs px-1.5 py-0.5 rounded-full">{myTemplates.length}</span>
                                                )}
                                        </button>
                                        <button
                                                onClick={() => setActiveTab('shared')}
                                                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'shared' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                                <Globe className="w-3.5 h-3.5" />
                                                Общие
                                                {sharedTemplates.length > 0 && (
                                                        <span className="ml-1 bg-teal-100 text-teal-700 text-xs px-1.5 py-0.5 rounded-full">{sharedTemplates.length}</span>
                                                )}
                                        </button>
                                </div>

                                {loading && <div className="text-center py-8 text-gray-400">Загрузка...</div>}

                                {/* My Templates */}
                                {!loading && activeTab === 'my' && (
                                        <>
                                                {myTemplates.length === 0 ? (
                                                        <div className="text-center py-12 text-gray-400">
                                                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                                                <p>Шаблонов пока нет. Создайте первый!</p>
                                                        </div>
                                                ) : (
                                                        <div className="grid gap-3">
                                                                {myTemplates.map(t => (
                                                                        <div key={t.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-start justify-between gap-3 hover:shadow-md transition-shadow">
                                                                                <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                                <FileText className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                                                                                <h3 className="font-semibold text-gray-800 truncate">{t.name}</h3>
                                                                                                {t.isPublic && (
                                                                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                                                                                                <Globe className="w-2.5 h-2.5" /> Общий
                                                                                                        </span>
                                                                                                )}
                                                                                        </div>
                                                                                        {t.complaints && <p className="text-sm text-gray-500 truncate">Жалобы: {t.complaints}</p>}
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                                                                        {/* Toggle public */}
                                                                                        <button
                                                                                                onClick={() => handleTogglePublic(t)}
                                                                                                className={`p-2 rounded-lg transition-colors ${t.isPublic ? 'text-teal-600 bg-teal-50 hover:bg-teal-100' : 'text-gray-400 hover:bg-gray-100'}`}
                                                                                                title={t.isPublic ? 'Сделать личным' : 'Поделиться с коллегами'}
                                                                                        >
                                                                                                {t.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                                                                        </button>
                                                                                        <button
                                                                                                onClick={() => setEditingTemplate(t)}
                                                                                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                                                                                                title="Редактировать"
                                                                                        >
                                                                                                <Edit2 className="w-4 h-4" />
                                                                                        </button>
                                                                                        {deleteConfirm === t.id ? (
                                                                                                <div className="flex items-center gap-1">
                                                                                                        <button onClick={() => handleDelete(t.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded-lg">Удалить</button>
                                                                                                        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-gray-200 text-xs rounded-lg">Отмена</button>
                                                                                                </div>
                                                                                        ) : (
                                                                                                <button
                                                                                                        onClick={() => setDeleteConfirm(t.id)}
                                                                                                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                                                                                        title="Удалить"
                                                                                                >
                                                                                                        <Trash2 className="w-4 h-4" />
                                                                                                </button>
                                                                                        )}
                                                                                </div>
                                                                        </div>
                                                                ))}
                                                        </div>
                                                )}
                                        </>
                                )}

                                {/* Shared Templates */}
                                {!loading && activeTab === 'shared' && (
                                        <>
                                                {sharedTemplates.length === 0 ? (
                                                        <div className="text-center py-12 text-gray-400">
                                                                <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                                <p className="font-medium">Пока нет общих шаблонов</p>
                                                                <p className="text-sm mt-1">Когда коллеги поделятся шаблонами — они появятся здесь</p>
                                                        </div>
                                                ) : (
                                                        <div className="grid gap-3">
                                                                {sharedTemplates.map(t => (
                                                                        <div key={t.id} className="bg-white rounded-xl shadow-sm border border-teal-100 p-4 flex items-start justify-between gap-3 hover:shadow-md transition-shadow">
                                                                                <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                                <Globe className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                                                                                <h3 className="font-semibold text-gray-800 truncate">{t.name}</h3>
                                                                                        </div>
                                                                                        <p className="text-xs text-gray-400 mb-1">
                                                                                                Автор: <span className="font-medium text-teal-600">{t.authorName || t.authorLogin}</span>
                                                                                        </p>
                                                                                        {t.complaints && <p className="text-sm text-gray-500 truncate">Жалобы: {t.complaints}</p>}
                                                                                </div>
                                                                                <button
                                                                                        onClick={() => handleCopyToMine(t)}
                                                                                        className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors flex-shrink-0"
                                                                                        title="Скопировать в мои шаблоны"
                                                                                >
                                                                                        <Copy className="w-4 h-4" />
                                                                                        Копировать
                                                                                </button>
                                                                        </div>
                                                                ))}
                                                        </div>
                                                )}
                                        </>
                                )}
                        </div>
                </div>
        );
}