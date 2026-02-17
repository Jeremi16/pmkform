import React from 'react';
import { CheckCircle } from 'lucide-react';
import { TitleCard } from './FormUI';

const SuccessPage = () => {
    const [waLink, setWaLink] = React.useState(import.meta.env.VITE_WA_LINK || '#');

    React.useEffect(() => {
        const fetchWaLink = async () => {
            try {
                // Determine API URL (use relative path if proxy is set, or full URL)
                const response = await fetch('/api/settings/wa_link');
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.value) {
                        setWaLink(data.value);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch WA Link:", error);
            }
        };
        fetchWaLink();
    }, []);

    return (
        <div className="min-h-screen bg-brown-50 py-8 px-4 flex items-center justify-center">
            <div className="max-w-xl w-full space-y-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden border-t-8 border-t-brown-600 p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle size={48} className="text-green-600" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-serif font-bold text-gray-900 mb-4">Terima Kasih!</h1>
                    <p className="text-gray-600 text-lg mb-8">
                        Formulir pendaftaran Anda telah berhasil dikirim.
                        <br />
                        Kami akan segera menghubungi Anda untuk tahap selanjutnya.
                    </p>

                    <div className="flex flex-col gap-3 justify-center items-center">
                        <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-600 text-white px-8 py-3 rounded shadow hover:bg-green-700 transition-all font-medium w-full max-w-xs flex items-center justify-center gap-2"
                        >
                            Gabung Grup WhatsApp
                        </a>
                        <a
                            href="/"
                            className="text-brown-700 hover:text-brown-800 font-medium hover:underline"
                        >
                            Kembali ke Website PMK Form
                        </a>
                    </div>
                </div>

                <div className="text-center text-xs text-gray-500 pb-8">
                    Created by IT Division PMK ITERA 2026
                </div>
            </div>
        </div>
    );
};

export default SuccessPage;
