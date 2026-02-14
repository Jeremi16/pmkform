import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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

    // Helper to get available divisions based on selected department
    const getDivisions = (deptId) => {
        const dept = departmentsData.find(d => d.id === deptId);
        return dept ? dept.divisions : [];
    };

    // Helper to get division description
    const getDivisionDesc = (deptId, divId) => {
        const divisions = getDivisions(deptId);
        const div = divisions.find(d => d.id === divId);
        return div ? div.description : null;
    };

    // Reset dependent fields when parent changes
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
            const response = await axios.post('http://localhost:3000/api/register', {
                ...data,
                willing_transfer: data.willing_transfer === 'true'
            });

            setSubmitStatus('success');
            setStatusMessage('Pendaftaran berhasil! Terima kasih telah mendaftar.');
            reset();

            setTimeout(() => {
                navigate('/success');
            }, 2000);

        } catch (error) {
            console.error(error);
            setSubmitStatus('error');
            // Handle duplicate email specific error
            if (error.response && error.response.status === 409) {
                setStatusMessage('Email ini sudah terdaftar.');
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

                {/* Header Image with Logo */}
                <div className="h-40 bg-brown-800 rounded-t-lg shadow-sm -mb-6 relative z-0 flex items-center justify-center overflow-hidden">
                    <img
                        src="/favicon.png"
                        alt="PMK ITERA Logo"
                        className="h-28 w-28 object-contain drop-shadow-lg opacity-90 hover:scale-105 transition-transform duration-500"
                    />
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative z-10">

                    {/* Title Card */}
                    <TitleCard
                        title="Open Recruitment BPH PMK ITERA 2026"
                        description="Mohon isi formulir dengan teliti. Pastikan NIM dan Email Anda valid."
                        titleClassName="font-serif"
                    />

                    {/* Email Input */}
                    <FormSection title="Email" description="Gunakan Email student.itera.ac.id" active error={errors.email}>
                        <InputField
                            name="email"
                            type="email"
                            placeholder="Email Anda"
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

                    {/* Full Name */}
                    <FormSection title="Nama Lengkap" error={errors.name}>
                        <InputField name="name" placeholder="Jawaban Anda" register={register} required error={errors.name} />
                    </FormSection>

                    {/* NIM */}
                    <FormSection title="NIM" description="" error={errors.nim}>
                        <InputField
                            name="nim"
                            placeholder="Jawaban Anda"
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
                    </FormSection>

                    {/* WhatsApp */}
                    <FormSection title="Nomor WhatsApp" error={errors.whatsapp}>
                        <InputField name="whatsapp" placeholder="Jawaban Anda" register={register} required error={errors.whatsapp} />
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
                            {selectedDiv1 && (
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                    {getDivisionDesc(selectedDept1, selectedDiv1)}
                                </div>
                            )}
                            <TextAreaField label="Alasan" name="reason1" placeholder="Jawaban Anda" register={register} required error={errors.reason1} />
                        </div>
                    </FormSection>

                    {/* Second Choice */}
                    <FormSection title="Pilihan Kedua (Opsional)" error={errors.dept2 || errors.div2 || errors.reason2}>
                        <div className="grid grid-cols-1 gap-4">
                            <SelectField
                                label="Departemen"
                                name="dept2"
                                register={register}
                                error={errors.dept2}
                                options={departmentsData.map(d => ({ value: d.id, label: d.name }))}
                            />
                            <SelectField
                                label="Divisi"
                                name="div2"
                                register={register}
                                error={errors.div2}
                                options={getDivisions(selectedDept2).map(d => ({ value: d.id, label: d.name }))}
                                disabled={!selectedDept2}
                            />
                            {selectedDiv2 && (
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                    {getDivisionDesc(selectedDept2, selectedDiv2)}
                                </div>
                            )}
                            <TextAreaField label="Alasan" name="reason2" placeholder="Jawaban Anda" register={register} error={errors.reason2} />
                        </div>
                    </FormSection>

                    {/* Willing Transfer */}
                    <FormSection title="Bersedia dipindahkan ke Divisi lain?" error={errors.willing_transfer}>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                <input {...register("willing_transfer", { required: true })} type="radio" value="true" className="w-4 h-4 text-brown-600 focus:ring-brown-500" />
                                <span>Ya</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                                <input {...register("willing_transfer", { required: true })} type="radio" value="false" className="w-4 h-4 text-brown-600 focus:ring-brown-500" />
                                <span>Tidak</span>
                            </label>
                            {errors.willing_transfer && <span className="text-red-500 text-sm">Pertanyaan ini wajib diisi</span>}
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

                    <div className="flex justify-between items-center pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`bg-brown-700 text-white px-6 py-2 rounded shadow hover:bg-brown-800 transition-all font-medium disabled:opacity-70 disabled:cursor-not-allowed`}
                        >
                            {isSubmitting ? <><Loader2 className="animate-spin inline mr-2" size={18} /> Mengirim...</> : 'Kirim'}
                        </button>
                        <button type="button" onClick={() => reset()} className="text-brown-700 font-medium hover:text-brown-800 px-4 py-2 hover:bg-brown-50 rounded transition">
                            Kosongkan formulir
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
const InputField = ({ name, type = "text", placeholder, register, required, rules, error }) => (
    <div className="flex flex-col w-full">
        <input
            {...register(name, {
                required: required ? `Bagian ini wajib diisi` : false,
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
            {...register(name, { required: required ? `Bagian ini wajib diisi` : false })}
            disabled={disabled}
            className={`w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-brown-500 focus:border-brown-500 outline-none transition-all ${error ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-400`}
        >
            <option value="" hidden>Pilih</option>
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
            {...register(name, { required: required ? `Bagian ini wajib diisi` : false })}
            placeholder={placeholder}
            rows="1"
            className={`w-full border-b border-gray-300 focus:border-brown-600 outline-none py-2 transition-all placeholder-gray-400 resize-none overflow-hidden focus:min-h-[80px] ${error ? 'border-red-500' : ''}`}
            onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
        ></textarea>
        {error && <span className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} /> {error.message}</span>}
    </div>
);

export default RegistrationForm;
