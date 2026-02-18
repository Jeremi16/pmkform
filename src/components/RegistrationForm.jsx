import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import axios from 'axios';
import departmentsData from '../data/departments.json';
import FormSection, { TitleCard } from './FormUI';

const RegistrationForm = () => {
    const { register, control, handleSubmit, formState: { errors }, reset, setValue } = useForm();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');

    // Watch fields for dependent logic
    const selectedDept1 = useWatch({ control, name: 'dept1' });
    const selectedDiv1 = useWatch({ control, name: 'div1' });
    const selectedDept2 = useWatch({ control, name: 'dept2' });
    const selectedDiv2 = useWatch({ control, name: 'div2' });

    const getDivisions = (deptId) => {
        const dept = departmentsData.find(d => d.id === deptId);
        return dept ? dept.divisions : [];
    };



    useEffect(() => {
        setValue('div1', '');
    }, [selectedDept1, setValue]);

    useEffect(() => {
        setValue('div2', '');
    }, [selectedDept2, setValue]);

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        setSubmitStatus(null);
        try {
            const formData = new FormData();

            // Append all text fields
            Object.keys(data).forEach(key => {
                if (key !== 'sertif' && key !== 'portfolio') {
                    formData.append(key, data[key]);
                }
            });

            // Append boolean conversions explicitly if needed, but strings work for FormData
            // Append Files
            if (data.sertif && data.sertif[0]) {
                formData.append('sertif', data.sertif[0]);
            }
            if (data.portfolio && data.portfolio[0]) {
                formData.append('portfolio', data.portfolio[0]);
            }

            const response = await axios.post('/api/register', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            reset();
            navigate('/success');

        } catch (error) {
            console.error(error);
            setSubmitStatus('error');
            if (error.response && error.response.status === 409) {
                setStatusMessage('Email atau NIM sudah terdaftar.');
            } else {
                setStatusMessage(error.response?.data?.error || 'Terjadi kesalahan. Silakan coba lagi.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-brown-50 py-8 px-4">
            <div className="max-w-3xl mx-auto space-y-4">
                <div className="h-40 bg-brown-800 rounded-t-lg shadow-sm -mb-6 relative z-0 flex items-center justify-center overflow-hidden">
                    <img
                        src="/favicon.png"
                        alt="PMK ITERA Logo"
                        className="h-28 w-28 object-contain drop-shadow-lg opacity-90 hover:scale-105 transition-transform duration-500"
                    />
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative z-10">
                    <TitleCard
                        title="Open Recruitment BPH PMK ITERA 2026"
                        description="Mohon isi formulir dengan teliti. Pastikan data yang Anda masukkan benar."
                        titleClassName="font-serif"
                    />

                    {/* Email Input */}
                    <FormSection title="Email" description="Gunakan Email student.itera.ac.id" active error={errors.email}>
                        <InputField
                            name="email"
                            type="email"
                            placeholder="nama.nim@student.itera.ac.id"
                            register={register}
                            required
                            rules={{
                                pattern: {
                                    value: /^[a-zA-Z0-9._%+-]+\.(123|124|125)\d{6}@student\.itera\.ac\.id$/,
                                    message: "Email harus menggunakan domain student.itera.ac.id dan format nama.nim@..."
                                },
                                validate: (value) => {
                                    const nim = document.querySelector('input[name="nim"]').value;
                                    if (nim && !value.includes(nim)) {
                                        return "Email harus mengandung NIM Anda";
                                    }
                                    return true;
                                }
                            }}
                            error={errors.email}
                        />
                    </FormSection>

                    {/* Personal Info */}
                    <FormSection title="Data Diri" error={errors.name || errors.nim || errors.prodi || errors.whatsapp}>
                        <div className="grid grid-cols-1 gap-4">
                            <InputField name="name" label="Nama Lengkap" placeholder="Nama Lengkap" register={register} required error={errors.name} />

                            <InputField
                                name="nim"
                                label="NIM"
                                placeholder="NIM"
                                register={register}
                                required
                                rules={{
                                    pattern: {
                                        value: /^(123|124|125)\d{6}$/,
                                        message: "NIM harus diawali 123, 124, atau 125 dan terdiri dari 9 digit"
                                    }
                                }}
                                error={errors.nim}
                            />

                            <InputField name="prodi" label="Program Studi" placeholder="Program Studi" register={register} required error={errors.prodi} />
                            <InputField name="whatsapp" label="Nomor WhatsApp" placeholder="08..." register={register} required error={errors.whatsapp} />
                        </div>
                    </FormSection>

                    {/* First Choice */}
                    <FormSection title="Pilihan Pertama" description="Pilih departemen dan divisi yang Anda minati." error={errors.dept1 || errors.div1 || errors.reason1}>
                        <div className="grid grid-cols-1 gap-4">
                            <SelectField
                                label="Departemen"
                                name="dept1"
                                register={register}
                                required
                                error={errors.dept1}
                                options={departmentsData.map(d => ({ value: d.id, label: d.name }))}
                            />
                            <SelectField
                                label="Divisi"
                                name="div1"
                                register={register}
                                required
                                error={errors.div1}
                                options={getDivisions(selectedDept1).map(d => ({ value: d.id, label: d.name }))}
                                disabled={!selectedDept1}
                            />

                            <TextAreaField label="Alasan Pilihan 1" name="reason1" placeholder="Alasan memilih divisi ini..." register={register} required error={errors.reason1} />
                        </div>
                    </FormSection>

                    {/* Second Choice */}
                    <FormSection title="Pilihan Kedua" error={errors.dept2 || errors.div2 || errors.reason2}>
                        <div className="grid grid-cols-1 gap-4">
                            <SelectField
                                label="Departemen"
                                name="dept2"
                                register={register}
                                required
                                error={errors.dept2}
                                options={departmentsData.map(d => ({ value: d.id, label: d.name }))}
                            />
                            <SelectField
                                label="Divisi"
                                name="div2"
                                register={register}
                                required
                                error={errors.div2}
                                options={getDivisions(selectedDept2).map(d => ({ value: d.id, label: d.name }))}
                                disabled={!selectedDept2}
                            />

                            <TextAreaField
                                label="Alasan Pilihan 2"
                                name="reason2"
                                placeholder="Alasan memilih divisi ini..."
                                register={register}
                                required
                                error={errors.reason2}
                            />
                        </div>
                    </FormSection>

                    {/* Essays & Details */}
                    <FormSection title="Pengalaman & Komitmen" error={errors.org_experience || errors.skills || errors.commitment || errors.main_reason}>
                        <div className="grid grid-cols-1 gap-4">
                            <TextAreaField
                                label="Pengalaman Organisasi / Pelayanan (jika ada)"
                                name="org_experience"
                                placeholder="Jelaskan pengalaman organisasi atau pelayanan Anda sebelumnya..."
                                register={register}
                                error={errors.org_experience}
                            />

                            <TextAreaField
                                label="Skill / Keahlian yang Dimiliki"
                                name="skills"
                                placeholder="Sebutkan keahlian yang relevan dengan pilihan divisi Anda..."
                                register={register}
                                error={errors.skills}
                            />

                            <TextAreaField
                                label="Komitmen Pelayanan"
                                name="commitment"
                                placeholder="Bagaimana komitmen Anda dalam pelayanan ini?"
                                register={register}
                                required
                                error={errors.commitment}
                            />

                            <TextAreaField
                                label="Alasan Ingin Melayani"
                                name="main_reason"
                                placeholder="Apa motivasi utama Anda ingin bergabung di BPH PMK ITERA?"
                                register={register}
                                required
                                error={errors.main_reason}
                            />
                        </div>
                    </FormSection>

                    {/* Active Period */}
                    <FormSection title="Ketersediaan" error={errors.active_period || errors.willing_transfer}>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bersedia aktif selama 1 periode kepengurusan?</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input {...register("active_period", { required: "Wajib diisi" })} type="radio" value="true" className="w-4 h-4 text-brown-600 focus:ring-brown-500" />
                                        <span>Ya</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input {...register("active_period", { required: "Wajib diisi" })} type="radio" value="false" className="w-4 h-4 text-brown-600 focus:ring-brown-500" />
                                        <span>Tidak</span>
                                    </label>
                                </div>
                                {errors.active_period && <span className="text-red-500 text-xs mt-1 block">{errors.active_period.message}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bersedia dipindahkan ke divisi lain jika diperlukan?</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input {...register("willing_transfer", { required: "Wajib diisi" })} type="radio" value="true" className="w-4 h-4 text-brown-600 focus:ring-brown-500" />
                                        <span>Ya</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input {...register("willing_transfer", { required: "Wajib diisi" })} type="radio" value="false" className="w-4 h-4 text-brown-600 focus:ring-brown-500" />
                                        <span>Tidak</span>
                                    </label>
                                </div>
                                {errors.willing_transfer && <span className="text-red-500 text-xs mt-1 block">{errors.willing_transfer.message}</span>}
                            </div>
                        </div>
                    </FormSection>

                    {/* File Uploads */}
                    <FormSection title="Berkas Pendukung (Opsional)" description="Maksimal 10MB per file." error={errors.sertif || errors.portfolio}>
                        <div className="grid grid-cols-1 gap-6">
                            <FileInputField
                                label="Sertifikat / Bukti Pengalaman (PDF/Image)"
                                name="sertif"
                                register={register}
                                error={errors.sertif}
                                rules={{
                                    validate: {
                                        fileSize: (files) => {
                                            if (!files || files.length === 0) return true;
                                            return files[0].size <= 10 * 1024 * 1024 || "Ukuran file maksimal 10MB";
                                        }
                                    }
                                }}
                            />
                            <FileInputField
                                label="Portofolio (PDF Only) (Tidak Perlu untuk Dept. Pelayanan Khusus)"
                                name="portfolio"
                                register={register}
                                error={errors.portfolio}
                                description=""
                                rules={{
                                    validate: {
                                        fileSize: (files) => {
                                            if (!files || files.length === 0) return true;
                                            return files[0].size <= 10 * 1024 * 1024 || "Ukuran file maksimal 10MB";
                                        }
                                    }
                                }}
                            />
                        </div>
                    </FormSection>

                    <AnimatePresence>
                        {submitStatus && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`p-4 rounded-lg flex items-center gap-3 ${submitStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                                {submitStatus === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                {statusMessage}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex justify-between items-center pt-4">
                        <button type="submit" disabled={isSubmitting} className={`bg-brown-700 text-white px-8 py-3 rounded-lg shadow hover:bg-brown-800 transition-all font-bold disabled:opacity-70 disabled:cursor-not-allowed flex items-center`}>
                            {isSubmitting ? <><Loader2 className="animate-spin inline mr-2" size={18} /> Mengirim...</> : 'Kirim Pendaftaran'}
                        </button>
                    </div>
                </form>
                <div className="text-center text-xs text-gray-500 mt-8 pb-8">
                    Created by IT Division PMK ITERA 2026
                </div>
            </div>
        </div>
    );
};

// Helper Components
const InputField = ({ name, type = "text", label, placeholder, register, required, rules, error }) => (
    <div className="flex flex-col w-full">
        {label && <label className="text-xs text-gray-500 mb-1">{label}</label>}
        <input
            {...register(name, {
                required: required ? `Wajib diisi` : false,
                ...rules
            })}
            type={type}
            placeholder={placeholder}
            className={`w-full border-b border-gray-300 focus:border-brown-600 outline-none py-2 transition-all placeholder-gray-400 ${error ? 'border-red-500' : ''}`}
        />
        {error && <span className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {error.message}</span>}
    </div>
);

const SelectField = ({ label, name, register, required, error, options, disabled }) => (
    <div className="flex flex-col w-full mb-3">
        <label className="text-xs text-gray-500 mb-1">{label}</label>
        <select
            {...register(name, { required: required ? `Wajib diisi` : false })}
            disabled={disabled}
            className={`w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-brown-500 focus:border-brown-500 outline-none transition-all ${error ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-400`}
        >
            <option value="" hidden>Pilih {label}</option>
            {options.map((opt, idx) => (
                <option key={idx} value={opt.value}>{opt.label}</option>
            ))}
        </select>
        {error && <span className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {error.message}</span>}
    </div>
);

const TextAreaField = ({ label, name, placeholder, register, required, error }) => (
    <div className="flex flex-col w-full mt-2">
        {label && <label className="text-xs text-gray-500 mb-1">{label}</label>}
        <textarea
            {...register(name, { required: required ? `Wajib diisi` : false })}
            placeholder={placeholder}
            rows="1"
            className={`w-full border-b border-gray-300 focus:border-brown-600 outline-none py-2 transition-all placeholder-gray-400 resize-none overflow-hidden focus:min-h-[80px] ${error ? 'border-red-500' : ''}`}
            onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
        ></textarea>
        {error && <span className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {error.message}</span>}
    </div>
);

const FileInputField = ({ label, name, register, required, error, description, rules }) => (
    <div className="flex flex-col w-full border border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors">
        <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Upload size={16} /> {label}
        </label>
        {description && <span className="text-xs text-gray-400 mb-2">{description}</span>}
        <input
            {...register(name, {
                required: required ? `Wajib diupload` : false,
                ...rules
            })}
            type="file"
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brown-50 file:text-brown-700 hover:file:bg-brown-100"
        />
        {error && <span className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {error.message}</span>}
    </div>
);

export default RegistrationForm;
