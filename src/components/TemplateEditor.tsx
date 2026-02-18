'use client';

import { useState, useRef } from 'react';
import { Template, TemplateImage } from '@/lib/templates';
import { X, Plus, Image as ImageIcon, Link, Trash2, Save, ArrowLeft } from 'lucide-react';

interface TemplateEditorProps {
    template?: Template;
    onSave: (data: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
    onCancel: () => void;
}

function generateImageId(): string {
    return 'img_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [headerText, setHeaderText] = useState(template?.headerText || '');
    const [content, setContent] = useState(template?.content || '');
    const [images, setImages] = useState<TemplateImage[]>(template?.images || []);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlValue, setUrlValue] = useState('');
    const [urlCaption, setUrlCaption] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
                setImages(prev => [...prev, {
                    id: generateImageId(),
                    type: 'file',
                    data: reader.result as string,
                    caption: file.name.replace(/\.[^.]+$/, ''),
                }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const handleAddUrl = () => {
        if (!urlValue.trim()) return;
        setImages(prev => [...prev, {
            id: generateImageId(),
            type: 'url',
            data: urlValue.trim(),
            caption: urlCaption.trim() || undefined,
        }]);
        setUrlValue('');
        setUrlCaption('');
        setShowUrlInput(false);
    };

    const removeImage = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    const updateCaption = (id: string, caption: string) => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, caption } : img));
    };

    const handleSubmit = () => {
        if (!name.trim() || !headerText.trim()) return;
        onSave({
            id: template?.id,
            name: name.trim(),
            description: description.trim(),
            headerText: headerText.trim(),
            content: content.trim(),
            images,
        });
    };

    const isValid = name.trim() && headerText.trim();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-teal-800">
                    {template ? 'Редактировать шаблон' : 'Новый шаблон'}
                </h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6 space-y-5">
                {/* Name */}
                <div className="space-y-1">
                    <label className="font-bold text-gray-700 block text-xs uppercase tracking-wider">Название шаблона *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Например: Упражнения для шейного отдела"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                </div>

                {/* Description */}
                <div className="space-y-1">
                    <label className="font-bold text-gray-700 block text-xs uppercase tracking-wider">
                        Описание <span className="font-normal text-gray-400">(видите только вы)</span>
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Краткое описание для себя"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                </div>

                {/* Header text */}
                <div className="space-y-1">
                    <label className="font-bold text-gray-700 block text-xs uppercase tracking-wider">Текст для шапки *</label>
                    <p className="text-xs text-gray-500 mb-1">
                        Будет подставлено: &quot;Уважаемый наш пациент, ФИО, ниже приведены <strong className="text-teal-600">[ваш текст]</strong> для вас&quot;
                    </p>
                    <input
                        type="text"
                        value={headerText}
                        onChange={e => setHeaderText(e.target.value)}
                        placeholder="Например: рекомендации и упражнения"
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                </div>

                {/* Content */}
                <div className="space-y-1">
                    <label className="font-bold text-gray-700 block text-xs uppercase tracking-wider">Содержимое шаблона</label>
                    <textarea
                        rows={8}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Рекомендации, запреты, описания процедур и т.д."
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y"
                    />
                </div>

                {/* Images */}
                <div className="space-y-3">
                    <label className="font-bold text-gray-700 block text-xs uppercase tracking-wider">Изображения</label>

                    {images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {images.map(img => (
                                <div key={img.id} className="relative group border rounded-lg overflow-hidden">
                                    <img
                                        src={img.data}
                                        alt={img.caption || ''}
                                        className="w-full h-32 object-cover"
                                        onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="12">Ошибка</text></svg>'; }}
                                    />
                                    <button
                                        onClick={() => removeImage(img.id)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                    <input
                                        type="text"
                                        value={img.caption || ''}
                                        onChange={e => updateCaption(img.id, e.target.value)}
                                        placeholder="Подпись..."
                                        className="w-full px-2 py-1 text-xs border-t bg-white focus:outline-none focus:bg-blue-50"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                        >
                            <ImageIcon className="w-4 h-4" />
                            Загрузить файл
                        </button>
                        <button
                            onClick={() => setShowUrlInput(!showUrlInput)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                        >
                            <Link className="w-4 h-4" />
                            Добавить по URL
                        </button>
                    </div>

                    {showUrlInput && (
                        <div className="flex gap-2 items-end p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 space-y-1">
                                <input
                                    type="url"
                                    value={urlValue}
                                    onChange={e => setUrlValue(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-teal-500"
                                />
                                <input
                                    type="text"
                                    value={urlCaption}
                                    onChange={e => setUrlCaption(e.target.value)}
                                    placeholder="Подпись (необязательно)"
                                    className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <button
                                onClick={handleAddUrl}
                                disabled={!urlValue.trim()}
                                className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Preview */}
                {(name || headerText || content) && (
                    <div className="border-t pt-5">
                        <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-3">Предпросмотр для пациента</h3>
                        <div className="border rounded-lg p-5 bg-gray-50/50 space-y-3">
                            <p className="text-sm text-gray-700 italic">
                                Уважаемый наш пациент, <strong className="text-teal-700">[ФИО пациента]</strong>,
                                ниже приведены <strong className="text-teal-700">{headerText || '___'}</strong> для вас.
                            </p>
                            {content && <div className="text-sm text-gray-800 whitespace-pre-wrap">{content}</div>}
                            {images.length > 0 && (
                                <div className="flex gap-2 flex-wrap mt-2">
                                    {images.map(img => (
                                        <img key={img.id} src={img.data} alt={img.caption || ''} className="h-16 rounded border object-cover" />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <button
                    onClick={onCancel}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Отмена
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!isValid}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Save className="w-4 h-4" />
                    {template ? 'Сохранить изменения' : 'Создать шаблон'}
                </button>
            </div>
        </div>
    );
}
