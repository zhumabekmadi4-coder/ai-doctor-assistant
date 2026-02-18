
import { useState, useEffect } from 'react';

interface DoctorProfile {
    name: string;
    specialty: string;
    license: string;
    avatarUrl?: string;
    experience?: string;
    whatsapp?: string;
    telegram?: string;
}

interface DoctorProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (profile: DoctorProfile) => void;
    initialProfile: DoctorProfile;
}

export function DoctorProfileModal({ isOpen, onClose, onSave, initialProfile }: DoctorProfileModalProps) {
    const [profile, setProfile] = useState(initialProfile);

    useEffect(() => {
        setProfile(initialProfile);
    }, [initialProfile]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Редактировать профиль врача</h2>

                <div className="space-y-4">
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ФИО Врача</label>
                        <input
                            type="text"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Специальность</label>
                        <input
                            type="text"
                            value={profile.specialty}
                            onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Стаж работы</label>
                        <input
                            type="text"
                            value={profile.experience || ''}
                            onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                            placeholder="Например: 15 лет"
                            className="w-full p-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Лицензия / Инфо</label>
                        <input
                            type="text"
                            value={profile.license}
                            onChange={(e) => setProfile({ ...profile, license: e.target.value })}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                        <input
                            type="text"
                            value={profile.whatsapp || ''}
                            onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                            placeholder="+7 ..."
                            className="w-full p-2 border rounded-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telegram (Группа/Канал)</label>
                        <input
                            type="text"
                            value={profile.telegram || ''}
                            onChange={(e) => setProfile({ ...profile, telegram: e.target.value })}
                            placeholder="@..."
                            className="w-full p-2 border rounded-md"
                        />
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
                        onClick={() => onSave(profile)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
}
