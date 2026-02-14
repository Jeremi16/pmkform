import React from 'react';

const FormSection = ({ title, description, children, active = false, error = false }) => {
    return (
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden transition-all duration-200 relative ${active ? 'ring-2 ring-brown-200' : ''}`}>
            {active && <div className="absolute top-0 left-0 w-1.5 h-full bg-brown-600"></div>}

            <div className="p-6">
                {(title || description) && (
                    <div className="mb-4">
                        {title && <h3 className="text-lg font-medium text-gray-900">{title} {error && <span className="text-red-500 text-sm ml-2">* Wajib diisi</span>}</h3>}
                        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
                    </div>
                )}
                <div className="space-y-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const TitleCard = ({ title, description }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden border-t-8 border-t-brown-600">
        <div className="p-6">
            <h1 className="text-4xl font-serif font-bold text-brown-700 tracking-wide mb-3">{title}</h1>
            <p className="text-gray-600 whitespace-pre-line">{description}</p>
        </div>
        <div className="border-t px-6 py-3 bg-gray-50 text-xs text-red-500 flex justify-between">
            <span>* Menunjukkan pertanyaan yang wajib diisi</span>
        </div>
    </div>
);

export default FormSection;
