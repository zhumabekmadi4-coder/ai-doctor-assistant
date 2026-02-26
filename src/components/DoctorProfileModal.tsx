
import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export interface CustomField {
    label: string;
    value: string;
}

export interface DoctorProfile {
    name: string;
    specialty: string;
    license: string;
    avatarUrl?: string;
    headerImageUrl?: string;
    experience?: string;
    whatsapp?: string;
    telegram?: string;
    customFields?: CustomField[];
    customProcedures?: string[];
}

interface DoctorProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (profile: DoctorProfile) => void;
    initialProfile: DoctorProfile;
}

const DEFAULT_FIELDS: CustomField[] = [
    { label: 'Телефон клиники', value: '' },
    { label: 'Телефон координатора', value: '' },
    { label: 'WhatsApp', value: '' },
];

const DEFAULT_PROCEDURES_LIST = [
    'HILT (высокоинтенсивная лазеротерапия)',
    'SIS (высокоинтенсивная магнитотерапия)',
    'УВТ (Ударно-волновая терапия)',
    'ИРТ (иглорефлексотерапия)',
    'ВТЭС (внутритканевая электростимуляция)',
    'PRP (плазматерапия)',
    'Кинезиотерапия',
];

export function DoctorProfileModal({ isOpen, onClose, onSave, initialProfile }: DoctorProfileModalProps) {
    const [profile, setProfile] = useState(initialProfile);
    const [customFields, setCustomFields] = useState<CustomField[]>(
        initialProfile.customFields?.length ? initialProfile.customFields : DEFAULT_FIELDS
    );
    const [newLabel, setNewLabel] = useState('');
    const [procedures, setProcedures] = useState<string[]>(
        initialProfile.customProcedures ?? DEFAULT_PROCEDURES_LIST
    );
    const [newProcedure, setNewProcedure] = useState('');

    useEffect(() => {
        setProfile(initialProfile);
        setCustomFields(
            initialProfile.customFields?.length ? initialProfile.customFields : DEFAULT_FIELDS
        );
        setProcedures(initialProfile.customProcedures ?? DEFAULT_PROCEDURES_LIST);
    }, [initialProfile]);

    const updateField = (index: number, value: string) => {
        setCustomFields(prev => prev.map((f, i) => i === index ? { ...f, value } : f));
    };

    const removeField = (index: number) => {
        setCustomFields(prev => prev.filter((_, i) => i !== index));
    };

    const addField = () => {
        const label = newLabel.trim();
        if (!label) return;
        setCustomFields(prev => [...prev, { label, value: '' }]);
        setNewLabel('');
    };

    const addProcedure = () => {
        const name = newProcedure.trim();
        if (!name || procedures.includes(name)) return;
        setProcedures(prev => [...prev, name]);
        setNewProcedure('');
    };

    const removeProcedure = (index: number) => {
        setProcedures(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        onSave({ ...profile, customFields: customFields.filter(f => f.label.trim()), customProcedures: procedures });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Редактировать профиль врача</h2>

                <div className="space-y-4">
                    {/* Avatar */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Фото врача</label>
                        <div className="flex items-center gap-4">
                            {profile.avatarUrl && (
                                <img src={profile.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setProfile({ ...profile, avatarUrl: reader.result as string });
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    </div>

                    {/* Header Image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Изображение для хедера PDF</label>
                        <div className="flex items-center gap-4">
                            {profile.headerImageUrl && (
                                <img src={profile.headerImageUrl} alt="Header" className="w-32 h-16 object-contain rounded border" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setProfile({ ...profile, headerImageUrl: reader.result as string });
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ФИО Врача</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>

                    {/* Specialty */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Специальность</label>
                        <input
                            type="text"
                            value={profile.specialty}
                            onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>

                    {/* Divider */}
                    <div className="border-t pt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Контакты и информация</label>
                    </div>

                    {/* Dynamic custom fields */}
                    {customFields.map((field, idx) => (
                        <div key={idx} className="flex items-end gap-2">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                                <input
                                    type="text"
                                    value={field.value}
                                    onChange={(e) => updateField(idx, e.target.value)}
                                    placeholder={field.label}
                                    className="w-full p-2 border rounded-md text-sm"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeField(idx)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors mb-0.5"
                                title="Удалить поле"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {/* Add new field */}
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Новое поле</label>
                            <input
                                type="text"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                placeholder="Название поля, например: Instagram"
                                className="w-full p-2 border rounded-md text-sm border-dashed"
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField(); } }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={addField}
                            disabled={!newLabel.trim()}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-md transition-colors mb-0.5 disabled:text-gray-300 disabled:hover:bg-transparent"
                            title="Добавить строчку"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">Введите название и нажмите + или Enter</p>

                    {/* Procedures */}
                    <div className="border-t pt-3 mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Процедуры в листе назначений</label>
                        <p className="text-xs text-gray-400 mb-3">Список процедур, которые отображаются при составлении консультации</p>
                        <div className="space-y-1 mb-3">
                            {procedures.map((proc, idx) => (
                                <div key={idx} className="flex items-center gap-2 py-1 px-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                    <span className="flex-1 text-sm text-gray-700">{proc}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeProcedure(idx)}
                                        className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                                        title="Убрать процедуру"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {procedures.length === 0 && (
                                <p className="text-xs text-gray-400 italic py-2 text-center">Нет процедур — добавьте ниже</p>
                            )}
                        </div>
                        <div className="flex items-end gap-2">
                            <input
                                type="text"
                                value={newProcedure}
                                onChange={(e) => setNewProcedure(e.target.value)}
                                placeholder="Название процедуры, например: МРТ"
                                className="flex-1 p-2 border rounded-md text-sm border-dashed"
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProcedure(); } }}
                            />
                            <button
                                type="button"
                                onClick={addProcedure}
                                disabled={!newProcedure.trim()}
                                className="p-2 text-teal-600 hover:bg-teal-50 rounded-md transition-colors disabled:text-gray-300 disabled:hover:bg-transparent"
                                title="Добавить процедуру"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}
