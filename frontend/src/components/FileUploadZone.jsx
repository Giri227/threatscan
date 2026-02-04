import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, File, X } from 'lucide-react';

export default function FileUploadZone({ onFileSelect, isLoading }) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleFileSelect = (file) => {
        setSelectedFile(file);
        onFileSelect(file);
    };

    const handleInputChange = (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleClear = () => {
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
        >
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleInputChange}
                className="hidden"
                disabled={isLoading}
            />

            {!selectedFile ? (
                <motion.div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isLoading && fileInputRef.current?.click()}
                    animate={{
                        borderColor: isDragging ? 'rgb(0, 240, 255)' : 'rgb(71, 85, 105)',
                        backgroundColor: isDragging ? 'rgba(0, 240, 255, 0.05)' : 'rgba(15, 23, 42, 0.5)'
                    }}
                    className="relative border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all duration-300 hover:border-cyan-500/50 hover:bg-cyan-500/5"
                >
                    {/* Animated background */}
                    <motion.div
                        animate={{ scale: isDragging ? 1.05 : 1 }}
                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 pointer-events-none"
                    />

                    <div className="relative z-10 flex flex-col items-center justify-center gap-4">
                        <motion.div
                            animate={{ y: isDragging ? -10 : 0 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="p-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30"
                        >
                            <Upload className="w-8 h-8 text-cyan-400" />
                        </motion.div>

                        <div className="text-center">
                            <h3 className="text-lg font-bold text-white mb-2">
                                {isDragging ? 'Drop your file here' : 'Upload file for analysis'}
                            </h3>
                            <p className="text-sm text-slate-400">
                                Drag and drop or click to select
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                                Max file size: 50MB
                            </p>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={isLoading}
                            className="mt-4 px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isLoading ? 'Scanning...' : 'Select File'}
                        </motion.button>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 border border-slate-700"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                                <File className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-white truncate max-w-xs">{selectedFile.name}</p>
                                <p className="text-sm text-slate-400">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleClear}
                            disabled={isLoading}
                            className="p-2 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5 text-slate-400 hover:text-white" />
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
