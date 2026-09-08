import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, FileText, Sparkles } from 'lucide-react';
export default function SubmissionForm({ onSubmitSuccess, theme }) {
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [imageFiles, setImageFiles] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [isDragActive, setIsDragActive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittedData, setSubmittedData] = useState(null);
    const fileInputRef = useRef(null);
    const isDark = theme === 'dark';
    const handleImageChange = (files) => {
        const valid = Array.from(files).filter(file => file.type.startsWith('image/'));
        setImageFiles(prev => [...prev, ...valid]);
        valid.forEach(file => { const reader = new FileReader(); reader.onloadend = () => setImagePreviews(prev => [...prev, reader.result]); reader.readAsDataURL(file); });
    };
    const handleFileChange = (e) => {
        if (e.target.files) {
            handleImageChange(e.target.files);
        }
    };
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        }
        else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files) {
            handleImageChange(e.dataTransfer.files);
        }
    };
    const handleRemoveImage = (index) => {
        if (index === undefined) {
            setImageFiles([]);
            setImagePreviews([]);
        }
        else {
            setImageFiles(prev => prev.filter((_, i) => i !== index));
            setImagePreviews(prev => prev.filter((_, i) => i !== index));
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim())
            return;
        setIsSubmitting(true);
        try {
            await onSubmitSuccess({ subject, description, imageFiles });
            setIsSubmitting(false);
            setSubmittedData({
                subject: subject,
                description: description,
                fileName: imageFiles.length ? `${imageFiles.length} image(s)` : 'None',
                fileSize: imageFiles.length ? `${(imageFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)} KB` : '0 KB',
                fileType: imageFiles.length ? 'image/*' : 'N/A',
            });
            setSubject('');
            setDescription('');
            handleRemoveImage();
        }
        catch {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "max-w-3xl mx-auto space-y-8 animate-slide-up", children: [_jsxs("div", { children: [_jsxs("div", { className: `flex items-center gap-2 font-semibold tracking-wider text-xs uppercase mb-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`, children: [_jsx(Sparkles, { size: 14 }), _jsx("span", { children: "Incident Submission Portal" })] }), _jsx("h1", { className: `text-3xl sm:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`, children: "Submit Support Ticket" }), _jsx("p", { className: `mt-2 text-base ${isDark ? 'text-zinc-400' : 'text-slate-600'}`, children: "Describe your incident, upload screenshots, and submit directly to the automatic routing pipeline." })] }), _jsxs("div", { className: "grid grid-cols-1 gap-8 lg:grid-cols-3", children: [_jsx("div", { className: "lg:col-span-2", children: _jsxs("form", { onSubmit: handleSubmit, className: `space-y-6 rounded-2xl p-6 ${isDark ? 'glass-panel border-zinc-800' : 'glass-panel-light border-slate-200'}`, children: [_jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: "subject", className: `block text-base font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-700'}`, children: "Subject" }), _jsx("input", { id: "subject", type: "text", value: subject, onChange: (e) => setSubject(e.target.value), placeholder: "Brief summary of the issue (e.g., VPN authorization failed)", required: true, className: `w-full text-[16px] border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${isDark
                                                ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500'
                                                : 'bg-gray-50 border-slate-300 text-slate-950 placeholder-slate-400 shadow-sm'}` })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { htmlFor: "description", className: `block text-base font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-700'}`, children: "Description" }), _jsx("textarea", { id: "description", value: description, onChange: (e) => setDescription(e.target.value), rows: 5, placeholder: "Provide details about the issue. Include errors, steps to reproduce, or other context...", required: true, className: `w-full border rounded-xl px-4 py-3 text-[16px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y ${isDark
                                                ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500'
                                                : 'bg-gray-50 border-slate-300 text-slate-950 placeholder-slate-400 shadow-sm'}` })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: `block text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-700'}`, children: "Attach Incident Screenshot" }), _jsxs("div", { onDragEnter: handleDrag, onDragOver: handleDrag, onDragLeave: handleDrag, onDrop: handleDrop, onClick: () => fileInputRef.current?.click(), className: `border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${isDragActive
                                                ? 'border-indigo-500 bg-indigo-500/10'
                                                : isDark
                                                    ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 hover:bg-zinc-950'
                                                    : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/50'}`, children: [_jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", multiple: true, onChange: handleFileChange, className: "hidden" }), _jsx("div", { className: `p-3 rounded-xl border mb-3 transition-colors ${isDark
                                                        ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                                                        : 'bg-gray-50 border-slate-200 text-slate-500 shadow-sm'}`, children: _jsx(Upload, { size: 20 }) }), _jsxs("p", { className: `text-sm font-medium text-center ${isDark ? 'text-zinc-200' : 'text-slate-700'}`, children: ["Drag and drop one or more images here, or ", _jsx("span", { className: "text-indigo-600 hover:underline", children: "browse" })] }), _jsx("p", { className: `text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`, children: "PNG, JPG, or WEBP up to 5MB" })] }), imagePreviews.length > 0 && (_jsxs("div", { className: `relative rounded-xl border p-4 animate-fade-in ${isDark ? 'border-zinc-800 bg-zinc-950' : 'border-slate-200 bg-slate-50'}`, children: [_jsxs("div", { className: `flex items-center justify-between border-b pb-3 mb-3 ${isDark ? 'border-zinc-900' : 'border-slate-200'}`, children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "p-2 bg-indigo-500/10 text-indigo-500 rounded-lg", children: _jsx(FileText, { size: 16 }) }), _jsxs("div", { className: "truncate", children: [_jsxs("p", { className: `text-xs font-semibold truncate max-w-50 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`, children: [imageFiles.length, " attached image", imageFiles.length === 1 ? '' : 's'] }), _jsx("p", { className: `text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`, children: imageFiles.reduce((sum, file) => sum + file.size, 0) / 1024 >= 0 ? `${(imageFiles.reduce((sum, file) => sum + file.size, 0) / 1024).toFixed(1)} KB total` : '' })] })] }), _jsx("button", { type: "button", onClick: () => handleRemoveImage(), className: `p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-900 text-zinc-550' : 'hover:bg-slate-200 text-slate-450'}`, children: _jsx(X, { size: 16 }) })] }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: imagePreviews.map((preview, index) => _jsxs("div", { className: "relative aspect-video rounded-lg overflow-hidden border border-zinc-900 bg-black/40", children: [_jsx("img", { src: preview, alt: `Upload preview ${index + 1}`, className: "w-full h-full object-contain" }), _jsx("button", { type: "button", onClick: () => handleRemoveImage(index), className: "absolute top-1 right-1 p-1 rounded bg-black/60 text-white", children: _jsx(X, { size: 12 }) })] }, preview)) })] }))] }), _jsx("button", { type: "submit", disabled: isSubmitting, className: `w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isSubmitting
                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-[0.98]'}`, children: isSubmitting ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-4 h-4 border-2 border-t-transparent border-zinc-500 rounded-full animate-spin" }), _jsx("span", { children: "Submitting Ticket..." })] })) : (_jsx("span", { children: "Submit Ticket" })) })] }) }), _jsx("div", { className: "lg:col-span-1 space-y-6", children: _jsxs("div", { className: `rounded-2xl p-6 border ${isDark ? 'glass-panel border-zinc-800' : 'glass-panel-light border-slate-200'}`, children: [_jsx("h3", { className: `text-xs font-bold tracking-wider uppercase mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`, children: "FormData Payload Inspector" }), _jsx("p", { className: `text-xs leading-relaxed mb-4 ${isDark ? 'text-zinc-550' : 'text-slate-500'}`, children: "Packages inputs dynamically into a standard `FormData` stream. Observe the key-value structures serialized below." }), submittedData ? (_jsxs("div", { className: "space-y-4 animate-fade-in", children: [_jsxs("div", { className: "flex items-center gap-2 text-emerald-500 text-xs font-semibold", children: [_jsx(CheckCircle, { size: 14 }), _jsx("span", { children: "FormData Packaged Successfully!" })] }), _jsxs("div", { className: "bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-[11px] leading-relaxed space-y-3.5 max-h-87.5 overflow-y-auto text-zinc-200", children: [_jsxs("div", { children: [_jsx("span", { className: "text-indigo-400", children: "POST" }), " ", _jsx("span", { className: "text-zinc-400", children: "/tickets" })] }), _jsx("div", { className: "border-t border-slate-900 my-2" }), _jsxs("div", { children: [_jsx("div", { className: "text-zinc-500", children: "// Header" }), _jsx("div", { className: "text-zinc-400", children: "Content-Type: multipart/form-data" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-zinc-500", children: "// Values" }), _jsx("div", { className: "text-amber-500", children: "subject:" }), _jsxs("div", { className: "text-zinc-300 pl-4", children: ["\"", submittedData.subject, "\""] }), _jsx("div", { className: "text-amber-500 mt-1", children: "description:" }), _jsxs("div", { className: "text-zinc-300 pl-4 line-clamp-3", children: ["\"", submittedData.description, "\""] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-zinc-500", children: "// Binary" }), _jsx("div", { className: "text-amber-500", children: "file:" }), _jsxs("div", { className: "pl-4 text-zinc-400", children: ["Name: ", _jsx("span", { className: "text-zinc-300", children: submittedData.fileName }), _jsx("br", {}), "Size: ", _jsx("span", { className: "text-zinc-300", children: submittedData.fileSize }), _jsx("br", {}), "Type: ", _jsx("span", { className: "text-zinc-300", children: submittedData.fileType })] })] })] }), _jsx("button", { onClick: () => setSubmittedData(null), className: `w-full text-center py-2 text-xs font-medium border rounded-lg transition-colors ${isDark
                                                ? 'border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                                                : 'border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-800'}`, children: "Clear Inspector" })] })) : (_jsx("div", { className: `border border-dashed rounded-xl p-8 text-center text-xs ${isDark ? 'border-zinc-800 text-zinc-700' : 'border-slate-200 text-slate-400'}`, children: "Submit a ticket to inspect the generated FormData request stream." }))] }) })] })] }));
}
