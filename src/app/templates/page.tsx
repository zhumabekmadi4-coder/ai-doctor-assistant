'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginScreen } from '@/components/LoginScreen';
import { TemplateEditor } from '@/components/TemplateEditor';
import { getTemplates, saveTemplate, deleteTemplate, Template } from '@/lib/templates';
import { ArrowLeft, Plus, Edit2, Trash2, FileText, Image as ImageIcon } from 'lucide-react';

export default function TemplatesPage() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userLogin, setUserLogin] = useState('');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        const session = localStorage.getItem('doctorSession');
        if (session) {
            try {
                const parsed = JSON.parse(session);
                const login = parsed.login || '';
                setIsLoggedIn(true);
                setUserLogin(login);
                setTemplates(getTemplates(login));
            } catch { }
        }
    }, []);

    const refreshTemplates = () => {
        setTemplates(getTemplates(userLogin));
    };

    const handleSave = (data: Partial<Template> & { name: string; headerText: string; content: string }) => {
        saveTemplate(userLogin, data);
        refreshTemplates();
        setEditingTemplate(null);
        setIsCreating(false);
    };

    const handleDelete = (id: string) => {
        deleteTemplate(userLogin, id);
        refreshTemplates();
        setDeleteConfirm(null);
    };

    if (!isLoggedIn) {
        return <LoginScreen onLogin={(username) => {
            setIsLoggedIn(true);
            setUserLogin(username);
            setTemplates(getTemplates(username));
        }} />;
    }

    // Show editor
    if (isCreating || editingTemplate) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
                <div className="max-w-3xl mx-auto">
                    <TemplateEditor
                        template={editingTemplate || undefined}
                        onSave={handleSave}
                        onCancel={() => { setIsCreating(false); setEditingTemplate(null); }}
                    />
                </div>
            </div>
        );
    }

    // Template list
    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <header className="flex justify-between items-center border-b pb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Назад
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-teal-700">Шаблоны</h1>
                            <p className="text-gray-500 text-sm">Создайте шаблоны для прикрепления к консультационному листу</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Новый шаблон
                    </button>
                </header>

                {/* Templates grid */}
                {templates.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                        <FileText className="w-16 h-16 text-gray-200 mx-auto" />
                        <h3 className="text-lg font-semibold text-gray-400">Пока нет шаблонов</h3>
                        <p className="text-sm text-gray-400 max-w-md mx-auto">
                            Создайте шаблоны с рекомендациями, упражнениями или описаниями процедур для ваших пациентов.
                        </p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 mt-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Создать первый шаблон
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {templates.map(t => (
                            <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                {/* Preview images strip */}
                                {t.images.length > 0 && (
                                    <div className="flex h-28 overflow-hidden border-b">
                                        {t.images.slice(0, 3).map(img => (
                                            <img
                                                key={img.id}
                                                src={img.data}
                                                alt={img.caption || ''}
                                                className="flex-1 object-cover min-w-0"
                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        ))}
                                        {t.images.length > 3 && (
                                            <div className="flex-none w-16 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                                +{t.images.length - 3}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{t.name}</h3>
                                            {t.description && <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>}
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-400 italic">
                                        Шапка: &quot;...{t.headerText}...&quot;
                                    </p>

                                    {t.content && (
                                        <p className="text-sm text-gray-600 line-clamp-2">{t.content}</p>
                                    )}

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            {t.images.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <ImageIcon className="w-3 h-3" /> {t.images.length}
                                                </span>
                                            )}
                                            <span>{new Date(t.updatedAt).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => setEditingTemplate(t)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Редактировать"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            {deleteConfirm === t.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleDelete(t.id)}
                                                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                                    >
                                                        Да
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                    >
                                                        Нет
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirm(t.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Удалить"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
