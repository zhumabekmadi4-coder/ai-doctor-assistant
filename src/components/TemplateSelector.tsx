'use client';

import { useState } from 'react';
import { Template, AttachedTemplate, toAttached } from '@/lib/templates';
import { X, Check, ChevronRight, ChevronLeft, FileText, Edit2 } from 'lucide-react';

interface TemplateSelectorProps {
    templates: Template[];
    onAttach: (attached: AttachedTemplate[]) => void;
    onClose: () => void;
    patientName: string;
}

type Step = 'select' | 'edit';

export function TemplateSelector({ templates, onAttach, onClose, patientName }: TemplateSelectorProps) {
    const [step, setStep] = useState<Step>('select');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editableTemplates, setEditableTemplates] = useState<AttachedTemplate[]>([]);
    const [editingIndex, setEditingIndex] = useState(0);

    const toggleTemplate = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleProceedToEdit = () => {
        const selected = templates
            .filter(t => selectedIds.has(t.id))
            .map(toAttached);
        setEditableTemplates(selected);
        setEditingIndex(0);
        setStep('edit');
    };

    const updateEditable = (index: number, field: keyof AttachedTemplate, value: string) => {
        setEditableTemplates(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleConfirm = () => {
        onAttach(editableTemplates);
    };

    if (templates.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-center space-y-4">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                    <h3 className="text-lg font-semibold text-gray-900">Нет шаблонов</h3>
                    <p className="text-sm text-gray-500">Создайте шаблоны на странице &quot;Шаблоны&quot; для дальнейшего использования.</p>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        Закрыть
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {step === 'select' ? 'Выберите шаблоны' : 'Редактирование шаблонов'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {step === 'select'
                                ? `Выбрано: ${selectedIds.size}`
                                : `${editingIndex + 1} из ${editableTemplates.length}: ${editableTemplates[editingIndex]?.name}`
                            }
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {step === 'select' && (
                        <div className="space-y-2">
                            {templates.map(t => {
                                const isSelected = selectedIds.has(t.id);
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => toggleTemplate(t.id)}
                                        className={`w-full text-left p-4 rounded-lg border transition-all ${isSelected
                                                ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isSelected ? 'bg-teal-500 border-teal-500' : 'border-gray-300'
                                                }`}>
                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900">{t.name}</p>
                                                {t.description && <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>}
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Шапка: &quot;...{t.headerText}...&quot; · {t.images.length} изобр.
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {step === 'edit' && editableTemplates.length > 0 && (
                        <div className="space-y-4">
                            {/* Preview header */}
                            <div className="p-3 bg-teal-50 rounded-lg text-sm text-teal-800 italic">
                                Уважаемый наш пациент, <strong>{patientName || '[ФИО]'}</strong>,
                                ниже приведены <strong>{editableTemplates[editingIndex].headerText || '___'}</strong> для вас.
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="font-bold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-1">
                                        <Edit2 className="w-3 h-3" /> Текст шапки
                                    </label>
                                    <input
                                        type="text"
                                        value={editableTemplates[editingIndex].headerText}
                                        onChange={e => updateEditable(editingIndex, 'headerText', e.target.value)}
                                        className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-1">
                                        <Edit2 className="w-3 h-3" /> Содержимое
                                    </label>
                                    <textarea
                                        rows={8}
                                        value={editableTemplates[editingIndex].content}
                                        onChange={e => updateEditable(editingIndex, 'content', e.target.value)}
                                        className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-y"
                                    />
                                </div>

                                {editableTemplates[editingIndex].images.length > 0 && (
                                    <div className="space-y-1">
                                        <label className="font-bold text-gray-700 text-xs uppercase tracking-wider">Изображения</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {editableTemplates[editingIndex].images.map(img => (
                                                <img key={img.id} src={img.data} alt={img.caption || ''} className="h-20 rounded border object-cover" />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Multi-template navigation */}
                            {editableTemplates.length > 1 && (
                                <div className="flex justify-between items-center pt-3 border-t">
                                    <button
                                        onClick={() => setEditingIndex(i => Math.max(0, i - 1))}
                                        disabled={editingIndex === 0}
                                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Предыдущий
                                    </button>
                                    <span className="text-xs text-gray-400">{editingIndex + 1} / {editableTemplates.length}</span>
                                    <button
                                        onClick={() => setEditingIndex(i => Math.min(editableTemplates.length - 1, i + 1))}
                                        disabled={editingIndex === editableTemplates.length - 1}
                                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30"
                                    >
                                        Следующий <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-between items-center shrink-0">
                    {step === 'select' ? (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                                Отмена
                            </button>
                            <button
                                onClick={handleProceedToEdit}
                                disabled={selectedIds.size === 0}
                                className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                            >
                                Далее <ChevronRight className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setStep('select')} className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                                <ChevronLeft className="w-4 h-4" /> Назад к выбору
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                            >
                                <Check className="w-4 h-4" /> Прикрепить ({editableTemplates.length})
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
